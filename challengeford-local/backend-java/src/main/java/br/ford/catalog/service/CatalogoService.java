package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.*;
import br.ford.catalog.api.exception.PythonServiceException;
import br.ford.catalog.domain.entity.*;
import br.ford.catalog.domain.entity.CatalogoEntity.CatalogoStatus;
import br.ford.catalog.domain.entity.TermoPendenteEntity.TermoStatus;
import br.ford.catalog.domain.repository.*;
import br.ford.catalog.security.InputSanitizer;
import br.ford.catalog.service.dto.PythonAtributoMetaDTO;
import br.ford.catalog.service.dto.PythonCatalogoDTO;
import br.ford.catalog.service.dto.ResultadoPythonDTO;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CatalogoService {

    private final CatalogoRepository catalogoRepository;
    private final AtributoRepository atributoRepository;
    private final TermoPendenteRepository termoPendenteRepository;
    private final ScoreCompetitivoRepository scoreCompetitivoRepository;
    private final CapabilityScoreRepository capabilityScoreRepository;
    private final PythonClientService pythonClient;
    private final InputSanitizer inputSanitizer;

    @Transactional(readOnly = true)
    public List<CatalogoResumoDTO> listarCatalogos() {
        return catalogoRepository.findAllByOrderByDataExtracaoDesc().stream()
                .map(this::toResumoDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CatalogoResponseDTO buscarCatalogo(Long id) {
        CatalogoEntity catalogo = catalogoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Catálogo não encontrado: " + id));
        return toResponseDTO(catalogo);
    }

    @Transactional
    public CatalogoResponseDTO solicitarExtracao(String marca, String modelo, String versao) {
        return solicitarExtracao(marca, modelo, versao, false);
    }

    @Transactional
    public CatalogoResponseDTO solicitarExtracao(String marca, String modelo, String versao, boolean forcarReprocessamento) {
        marca = inputSanitizer.sanitize(marca.trim().toLowerCase());
        modelo = inputSanitizer.sanitize(modelo.trim().toLowerCase());
        versao = inputSanitizer.sanitize(versao.trim().toLowerCase());
        log.info("AUDIT|extracao_solicitada|marca={}|modelo={}|versao={}|forcar={}",
                marca, modelo, versao, forcarReprocessamento);
        ResultadoPythonDTO resultado = pythonClient.extrair(marca, modelo, versao, forcarReprocessamento);
        salvarResultadoPython(resultado);

        return catalogoRepository.findByMarcaAndModeloAndVersao(marca, modelo, versao)
                .map(this::toResponseDTO)
                .orElseThrow(() -> new PythonServiceException("Falha ao persistir catálogo"));
    }

    @Transactional
    public void salvarResultadoPython(ResultadoPythonDTO resultado) {
        PythonCatalogoDTO dto = resultado.getCatalogo();
        Map<String, Object> schema = dto.getSchema();

        String marca  = ((String) schema.getOrDefault("marca", "")).trim().toLowerCase();
        String modelo = ((String) schema.getOrDefault("modelo", "")).trim().toLowerCase();
        String versao = ((String) schema.getOrDefault("versao", "")).trim().toLowerCase();

        CatalogoEntity catalogo = catalogoRepository
                .findByMarcaAndModeloAndVersao(marca, modelo, versao)
                .orElse(CatalogoEntity.builder().build());

        catalogo.setMarca(inputSanitizer.sanitize(marca));
        catalogo.setModelo(inputSanitizer.sanitize(modelo));
        catalogo.setVersao(inputSanitizer.sanitize(versao));
        catalogo.setAnoModelo(toInt(schema.get("ano_modelo")));
        catalogo.setSegmento((String) schema.getOrDefault("segmento", "pickup"));
        catalogo.setStatus(mapStatus(dto.getStatus()));
        catalogo.setCoberturaPct(dto.getCoberturaPct() != null ? dto.getCoberturaPct() * 100 : null);
        catalogo.setFontesUtilizadas(
                dto.getFontesUtilizadas() != null ? String.join(",", dto.getFontesUtilizadas()) : null);
        catalogo.setDataExtracao(LocalDateTime.now());

        // cobertura_live_pct: só sobrescreve se Python retornou valor real (>0 = extração ao vivo)
        // Para resultados de cache Python retorna null — preservamos o valor já no Oracle
        if (dto.getCoberturaLivePct() != null && dto.getCoberturaLivePct() > 0.0) {
            catalogo.setCoberturaLivePct(dto.getCoberturaLivePct() * 100);
        }

        CatalogoEntity salvo = catalogoRepository.save(catalogo);

        // Atributos — limpa e re-salva apenas se vierem metadados
        if (dto.getMetadados() != null && !dto.getMetadados().isEmpty()) {
            salvo.getAtributos().clear();
            catalogoRepository.save(salvo);
            dto.getMetadados().forEach((nome, meta) ->
                    salvo.getAtributos().add(converterAtributo(salvo, nome, meta)));
            catalogoRepository.save(salvo);
        }

        // Termos desconhecidos — evita duplicatas pendentes
        if (resultado.getTermosDesconhecidos() != null) {
            resultado.getTermosDesconhecidos().forEach(t -> {
                boolean jaExiste = termoPendenteRepository
                        .existsByTermoIgnoreCaseAndFonteAndStatus(t.getTermo(), t.getFonte(), TermoStatus.pendente);
                if (!jaExiste) {
                    termoPendenteRepository.save(TermoPendenteEntity.builder()
                            .termo(t.getTermo())
                            .contexto(t.getContexto())
                            .atributoSugerido(t.getAtributoSugerido())
                            .fonte(t.getFonte())
                            .build());
                }
            });
        }

        log.info("Catálogo persistido: {} {} {} (cobertura={}%)",
                marca, modelo, versao, catalogo.getCoberturaPct());
    }

    /**
     * Persiste scores do ranking no Oracle (SCORE_COMPETITIVO + CAPABILITY_SCORES).
     * Chamado após cada chamada a Python /ranking.
     */
    @Transactional
    @SuppressWarnings("unchecked")
    public void salvarRanking(Map<String, Object> rankingResult) {
        String perfil = (String) rankingResult.getOrDefault("perfil", "desconhecido");
        List<Map<String, Object>> ranking = (List<Map<String, Object>>) rankingResult.getOrDefault("ranking", List.of());

        Map<String, Integer> maxNivelPorAtributo = new HashMap<>();
        Map<String, String> liderMarcaPorAtributo = new HashMap<>();
        Map<String, Double> maxScorePorAtributo = new HashMap<>();

        for (Map<String, Object> item : ranking) {
            String veiculoLabel = (String) item.get("veiculo");
            String marcaLider = extrairMarcaDoLabel(veiculoLabel);
            Map<String, Map<String, Object>> breakdown =
                    (Map<String, Map<String, Object>>) item.getOrDefault("breakdown", Map.of());
            breakdown.forEach((attr, info) -> {
                int nivel = Math.min(3, (int) Math.round(toDouble(info.get("score_normalizado")) * 3));
                maxNivelPorAtributo.merge(attr, nivel, Math::max);
                double scoreNorm = toDouble(info.get("score_normalizado"));
                if (scoreNorm >= maxScorePorAtributo.getOrDefault(attr, -1.0)) {
                    maxScorePorAtributo.put(attr, scoreNorm);
                    liderMarcaPorAtributo.put(attr, marcaLider);
                }
            });
        }

        List<CatalogoEntity> todos = catalogoRepository.findAll();
        int persistidos = 0;

        for (Map<String, Object> item : ranking) {
            String veiculoLabel = (String) item.get("veiculo");
            double pontuacao    = toDouble(item.get("pontuacao_total"));

            Optional<CatalogoEntity> opt = todos.stream()
                    .filter(c -> labelsEquivalentes(c, veiculoLabel))
                    .findFirst();
            if (opt.isEmpty()) {
                log.warn("Ranking: catálogo não encontrado para label '{}'", veiculoLabel);
                continue;
            }
            CatalogoEntity catalogo = opt.get();
            persistidos++;

            // SCORE_COMPETITIVO — substitui entrada do perfil para este catálogo
            scoreCompetitivoRepository.deleteByCatalogoIdAndPerfil(catalogo.getId(), perfil);
            ScoreCompetitivoEntity score = ScoreCompetitivoEntity.builder()
                    .catalogo(catalogo)
                    .scoreTecnico(pontuacao)
                    .scoreValor(null)
                    .perfilCompeticao(perfil)
                    .build();
            scoreCompetitivoRepository.save(score);

            // CAPABILITY_SCORES — uma linha por atributo do breakdown
            Map<String, Map<String, Object>> breakdown =
                    (Map<String, Map<String, Object>>) item.getOrDefault("breakdown", Map.of());

            capabilityScoreRepository.deleteByCatalogoIdAndPerfil(catalogo.getId(), perfil);
            List<CapabilityScoreEntity> caps = new ArrayList<>();
            breakdown.forEach((attr, info) -> {
                double scoreNorm = toDouble(info.get("score_normalizado"));
                int nivel        = Math.min(3, (int) Math.round(scoreNorm * 3));
                int nivelMax     = maxNivelPorAtributo.getOrDefault(attr, nivel);

                caps.add(CapabilityScoreEntity.builder()
                        .catalogo(catalogo)
                        .capability(attr)
                        .nivel(nivel)
                        .nivelMaximoCluster(nivelMax)
                        .scoreBruto(toDouble(info.get("score_normalizado")))
                        .scoreAjustado(toDouble(info.get("score_ponderado")))
                        .liderMarca(liderMarcaPorAtributo.get(attr))
                        .perfilCompeticao(perfil)
                        .build());
            });
            capabilityScoreRepository.saveAll(caps);

            log.debug("Scores salvos para {} | perfil={} | score={}", veiculoLabel, perfil, pontuacao);
        }

        log.info("Ranking '{}' persistido no Oracle ({}/{} catálogos)", perfil, persistidos, ranking.size());
    }

    @Transactional(readOnly = true)
    public ComparativoResponseDTO comparar(List<Long> catalogoIds) {
        List<CatalogoEntity> catalogos = catalogoIds.stream()
                .map(id -> catalogoRepository.findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Catálogo não encontrado: " + id)))
                .collect(Collectors.toList());

        List<Map<String, String>> veiculos = catalogos.stream()
                .map(c -> Map.of("marca", c.getMarca(), "modelo", c.getModelo(), "versao", c.getVersao()))
                .collect(Collectors.toList());

        ComparativoResponseDTO comparativo = mapComparativo(pythonClient.comparar(veiculos));
        if (comparativo.veiculos().size() < veiculos.size()) {
            log.warn("Comparativo parcial: solicitados {} veículos, retornados {}",
                    veiculos.size(), comparativo.veiculos().size());
        }
        return comparativo;
    }

    // --- Mapping helpers ---

    private CatalogoResumoDTO toResumoDTO(CatalogoEntity c) {
        double scoreTecnico = c.getScores().stream()
                .mapToDouble(s -> s.getScoreTecnico() != null ? s.getScoreTecnico() : 0.0)
                .max().orElse(0.0);
        double scoreValor = c.getScores().stream()
                .mapToDouble(s -> s.getScoreValor() != null ? s.getScoreValor() : 0.0)
                .max().orElse(0.0);
        return new CatalogoResumoDTO(c.getId(), c.getMarca(), c.getModelo(), c.getVersao(),
                c.getAnoModelo(), c.getSegmento(), c.getStatus().name(),
                c.getCoberturaPct(), c.getCoberturaLivePct(),
                scoreTecnico > 0 ? scoreTecnico : null,
                scoreValor > 0   ? scoreValor   : null,
                c.getDataExtracao());
    }

    private CatalogoResponseDTO toResponseDTO(CatalogoEntity c) {
        List<AtributoDTO> atributos = c.getAtributos().stream()
                .map(a -> new AtributoDTO(a.getAtributo(), a.getValor(), a.getConfianca(),
                        a.getFontePrimaria(), a.isDivergente(), a.isMercadoConfirmadoBr(), a.getSchemaNivel()))
                .collect(Collectors.toList());

        List<CapabilityScoreDTO> capabilities = c.getCapabilityScores().stream()
                .map(cs -> new CapabilityScoreDTO(cs.getCapability(), cs.getNivel(),
                        cs.getNivelMaximoCluster(), cs.getScoreBruto(), cs.getScoreAjustado(), cs.getLiderMarca()))
                .collect(Collectors.toList());

        double scoreTecnico = c.getScores().stream()
                .mapToDouble(s -> s.getScoreTecnico() != null ? s.getScoreTecnico() : 0.0)
                .max().orElse(0.0);
        double scoreValor = c.getScores().stream()
                .mapToDouble(s -> s.getScoreValor() != null ? s.getScoreValor() : 0.0)
                .max().orElse(0.0);

        return new CatalogoResponseDTO(c.getId(), c.getMarca(), c.getModelo(), c.getVersao(),
                c.getAnoModelo(), c.getSegmento(), c.getStatus().name(),
                c.getCoberturaPct(), c.getCoberturaLivePct(),
                scoreTecnico > 0 ? scoreTecnico : null,
                scoreValor > 0   ? scoreValor   : null,
                c.getDataExtracao(), atributos, capabilities);
    }

    private AtributoEntity converterAtributo(CatalogoEntity catalogo, String nome, PythonAtributoMetaDTO meta) {
        Object valor = meta.getValor();
        String tipoValor;
        String valorText = null;
        Double valorNumber = null;

        if (valor == null) {
            tipoValor = "null";
        } else if (valor instanceof Number n) {
            tipoValor = "number";
            valorNumber = n.doubleValue();
        } else if (valor instanceof Boolean b) {
            tipoValor = "boolean";
            valorText = b.toString();
        } else {
            tipoValor = "text";
            valorText = valor.toString();
        }

        return AtributoEntity.builder()
                .catalogo(catalogo)
                .atributo(nome)
                .valorText(valorText)
                .valorNumber(valorNumber)
                .tipoValor(tipoValor)
                .confianca(meta.getConfianca() != null ? meta.getConfianca() : 0.0)
                .fontePrimaria(meta.getFontePrimaria())
                .mercadoConfirmadoBr(Boolean.TRUE.equals(meta.getMercadoConfirmadoBr()))
                .divergente(Boolean.TRUE.equals(meta.getDivergente()))
                .revisadoHumano(false)
                .schemaNivel(meta.getSchemaNivel() != null ? meta.getSchemaNivel() : "core")
                .build();
    }

    @SuppressWarnings("unchecked")
    private ComparativoResponseDTO mapComparativo(Map<String, Object> resultado) {
        return new ComparativoResponseDTO(
                (List<String>) resultado.getOrDefault("veiculos", List.of()),
                (List<String>) resultado.getOrDefault("atributos_comparados", List.of()),
                (Map<String, Map<String, Object>>) resultado.getOrDefault("tabela", Map.of()),
                (Map<String, String>) resultado.getOrDefault("destaques", Map.of())
        );
    }

    private CatalogoStatus mapStatus(String status) {
        return switch (status != null ? status : "") {
            case "completo"         -> CatalogoStatus.completo;
            case "pendente_revisao" -> CatalogoStatus.pendente_revisao;
            default                 -> CatalogoStatus.parcial;
        };
    }

    private Integer toInt(Object value) {
        if (value instanceof Number n) return n.intValue();
        if (value instanceof String s) { try { return Integer.parseInt(s); } catch (NumberFormatException ignored) {} }
        return null;
    }

    private double toDouble(Object value) {
        if (value instanceof Number n) return n.doubleValue();
        return 0.0;
    }

    private static String buildVehicleLabel(CatalogoEntity c) {
        return String.join(" ",
                c.getMarca() != null ? c.getMarca().trim() : "",
                c.getModelo() != null ? c.getModelo().trim() : "",
                c.getVersao() != null ? c.getVersao().trim() : "").trim();
    }

    private static boolean labelsEquivalentes(CatalogoEntity c, String veiculoLabel) {
        if (veiculoLabel == null) return false;
        return buildVehicleLabel(c).equalsIgnoreCase(veiculoLabel.trim());
    }

    private static String extrairMarcaDoLabel(String veiculoLabel) {
        if (veiculoLabel == null || veiculoLabel.isBlank()) return null;
        return veiculoLabel.trim().split("\\s+")[0].toLowerCase();
    }
}
