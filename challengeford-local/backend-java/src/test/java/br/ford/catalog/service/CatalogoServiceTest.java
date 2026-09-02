package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.CatalogoResponseDTO;
import br.ford.catalog.api.dto.response.CatalogoResumoDTO;
import br.ford.catalog.domain.entity.CapabilityScoreEntity;
import br.ford.catalog.domain.entity.CatalogoEntity;
import br.ford.catalog.domain.entity.CatalogoEntity.CatalogoStatus;
import br.ford.catalog.domain.repository.*;
import br.ford.catalog.security.InputSanitizer;
import br.ford.catalog.service.dto.PythonAtributoMetaDTO;
import br.ford.catalog.service.dto.PythonCatalogoDTO;
import br.ford.catalog.service.dto.ResultadoPythonDTO;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoServiceTest {

    @Mock private CatalogoRepository catalogoRepository;
    @Mock private AtributoRepository atributoRepository;
    @Mock private TermoPendenteRepository termoPendenteRepository;
    @Mock private ScoreCompetitivoRepository scoreCompetitivoRepository;
    @Mock private CapabilityScoreRepository capabilityScoreRepository;
    @Mock private PythonClientService pythonClient;
    @Mock private InputSanitizer inputSanitizer;

    @InjectMocks private CatalogoService catalogoService;

    @BeforeEach
    void setup() {
        lenient().when(inputSanitizer.sanitize(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    private CatalogoEntity catalogoFixture(Long id, String marca) {
        return CatalogoEntity.builder()
                .id(id)
                .marca(marca)
                .modelo("Ranger")
                .versao("Raptor")
                .anoModelo(2025)
                .segmento("pickup")
                .status(CatalogoStatus.completo)
                .coberturaPct(100.0)
                .coberturaLivePct(78.0)
                .dataExtracao(LocalDateTime.now())
                .atributos(new ArrayList<>())
                .capabilityScores(new ArrayList<>())
                .scores(new ArrayList<>())
                .build();
    }

    @Test
    void listarCatalogos_retornaListaOrdenada() {
        when(catalogoRepository.findAllByOrderByDataExtracaoDesc())
                .thenReturn(List.of(catalogoFixture(1L, "ford"), catalogoFixture(2L, "toyota")));

        List<CatalogoResumoDTO> result = catalogoService.listarCatalogos();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).marca()).isEqualTo("ford");
    }

    @Test
    void buscarCatalogo_idExistente_retornaDTO() {
        when(catalogoRepository.findById(1L)).thenReturn(Optional.of(catalogoFixture(1L, "ford")));

        CatalogoResponseDTO result = catalogoService.buscarCatalogo(1L);

        assertThat(result.marca()).isEqualTo("ford");
        assertThat(result.coberturaPct()).isEqualTo(100.0);
    }

    @Test
    void buscarCatalogo_idInexistente_lancaEntityNotFoundException() {
        when(catalogoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> catalogoService.buscarCatalogo(999L))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("999");
    }

    @Test
    void salvarResultadoPython_novosCatalogo_persisteEntidade() {
        ResultadoPythonDTO resultado = buildResultadoPythonDTO("ford", "Ranger", "Raptor", 1.0, 0.78);
        when(catalogoRepository.findByMarcaAndModeloAndVersao("ford", "ranger", "raptor"))
                .thenReturn(Optional.empty());
        when(catalogoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarResultadoPython(resultado);

        ArgumentCaptor<CatalogoEntity> captor = ArgumentCaptor.forClass(CatalogoEntity.class);
        verify(catalogoRepository, atLeastOnce()).save(captor.capture());
        CatalogoEntity salvo = captor.getValue();
        assertThat(salvo.getMarca()).isEqualTo("ford");
        assertThat(salvo.getCoberturaPct()).isEqualTo(100.0);
        assertThat(salvo.getCoberturaLivePct()).isEqualTo(78.0);
    }

    @Test
    void salvarResultadoPython_coberturaLivePctZero_naoSobrescreve() {
        // cobertura_live_pct = 0 indica cache hit — não deve sobrescrever o valor existente no Oracle
        CatalogoEntity existente = catalogoFixture(1L, "ford");
        existente.setCoberturaLivePct(78.0); // já salvo de extração anterior

        ResultadoPythonDTO resultado = buildResultadoPythonDTO("ford", "Ranger", "Raptor", 1.0, 0.0);
        when(catalogoRepository.findByMarcaAndModeloAndVersao("ford", "ranger", "raptor"))
                .thenReturn(Optional.of(existente));
        when(catalogoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarResultadoPython(resultado);

        // O valor 78.0 deve ter sido preservado
        assertThat(existente.getCoberturaLivePct()).isEqualTo(78.0);
    }

    @Test
    void salvarResultadoPython_termosDesconhecidos_persisteTermos() {
        br.ford.catalog.service.dto.PythonTermoDTO termo = new br.ford.catalog.service.dto.PythonTermoDTO();
        termo.setTermo("MDAS-5");
        termo.setContexto("sistema MDAS-5 avançado");
        termo.setAtributoSugerido("frenagem_autonoma");
        termo.setFonte("https://mitsubishi.com.br");

        ResultadoPythonDTO resultado = buildResultadoPythonDTO("mitsubishi", "Triton", "HPE-S", 1.0, 0.6);
        resultado.setTermosDesconhecidos(List.of(termo));

        when(catalogoRepository.findByMarcaAndModeloAndVersao(any(), any(), any()))
                .thenReturn(Optional.empty());
        when(catalogoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarResultadoPython(resultado);

        verify(termoPendenteRepository).save(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void salvarRanking_nivelMaximoCluster_maxPorAtributoNoCluster() {
        CatalogoEntity ford = catalogoFixture(1L, "ford");
        ford.setModelo("ranger");
        ford.setVersao("raptor");
        CatalogoEntity toyota = catalogoFixture(2L, "toyota");
        toyota.setModelo("hilux");
        toyota.setVersao("gr-s");

        Map<String, Object> breakdownFord = Map.of(
                "potencia_cv", Map.of("score_normalizado", 1.0, "score_ponderado", 0.35, "valor", 397));
        Map<String, Object> breakdownToyota = Map.of(
                "potencia_cv", Map.of("score_normalizado", 0.4, "score_ponderado", 0.14, "valor", 224));

        Map<String, Object> rankingResult = Map.of(
                "perfil", "desempenho",
                "ranking", List.of(
                        Map.of("veiculo", "ford Ranger Raptor", "pontuacao_total", 0.9, "breakdown", breakdownFord),
                        Map.of("veiculo", "toyota hilux gr-s", "pontuacao_total", 0.5, "breakdown", breakdownToyota)
                ));

        when(catalogoRepository.findAll()).thenReturn(List.of(ford, toyota));
        when(capabilityScoreRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarRanking(rankingResult);

        ArgumentCaptor<List<CapabilityScoreEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(capabilityScoreRepository, times(2)).saveAll(captor.capture());

        List<CapabilityScoreEntity> capsToyota = captor.getAllValues().stream()
                .filter(list -> list.stream().anyMatch(c ->
                        c.getCatalogo() != null && "toyota".equals(c.getCatalogo().getMarca())))
                .findFirst()
                .orElse(List.of());

        CapabilityScoreEntity potenciaToyota = capsToyota.stream()
                .filter(c -> "potencia_cv".equals(c.getCapability()))
                .findFirst()
                .orElseThrow();

        assertThat(potenciaToyota.getNivel()).isEqualTo(1);
        assertThat(potenciaToyota.getNivelMaximoCluster()).isEqualTo(3);
    }

    @Test
    @SuppressWarnings("unchecked")
    void salvarRanking_labelCaseInsensitive_persisteScores() {
        CatalogoEntity ford = catalogoFixture(1L, "ford");
        ford.setModelo("ranger");
        ford.setVersao("raptor");

        Map<String, Object> breakdown = Map.of(
                "potencia_cv", Map.of("score_normalizado", 1.0, "score_ponderado", 0.35, "valor", 397));
        Map<String, Object> rankingResult = Map.of(
                "perfil", "desempenho",
                "ranking", List.of(
                        Map.of("veiculo", "FORD Ranger RAPTOR", "pontuacao_total", 0.9, "breakdown", breakdown)
                ));

        when(catalogoRepository.findAll()).thenReturn(List.of(ford));
        when(capabilityScoreRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarRanking(rankingResult);

        verify(scoreCompetitivoRepository).save(any());
        verify(capabilityScoreRepository).deleteByCatalogoIdAndPerfil(1L, "desempenho");
        verify(capabilityScoreRepository).saveAll(any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void salvarRanking_liderMarcaPorAtributo_usaMelhorScore() {
        CatalogoEntity ford = catalogoFixture(1L, "ford");
        ford.setModelo("ranger");
        ford.setVersao("raptor");
        CatalogoEntity toyota = catalogoFixture(2L, "toyota");
        toyota.setModelo("hilux");
        toyota.setVersao("gr-s");

        Map<String, Object> rankingResult = Map.of(
                "perfil", "desempenho",
                "ranking", List.of(
                        Map.of("veiculo", "ford ranger raptor", "pontuacao_total", 0.5,
                                "breakdown", Map.of("potencia_cv",
                                        Map.of("score_normalizado", 0.4, "score_ponderado", 0.14))),
                        Map.of("veiculo", "toyota hilux gr-s", "pontuacao_total", 0.9,
                                "breakdown", Map.of("potencia_cv",
                                        Map.of("score_normalizado", 1.0, "score_ponderado", 0.35)))
                ));

        when(catalogoRepository.findAll()).thenReturn(List.of(ford, toyota));
        when(capabilityScoreRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        catalogoService.salvarRanking(rankingResult);

        ArgumentCaptor<List<CapabilityScoreEntity>> captor = ArgumentCaptor.forClass(List.class);
        verify(capabilityScoreRepository, times(2)).saveAll(captor.capture());

        CapabilityScoreEntity capFord = captor.getAllValues().stream()
                .flatMap(List::stream)
                .filter(c -> "ford".equals(c.getCatalogo().getMarca()))
                .findFirst()
                .orElseThrow();
        assertThat(capFord.getLiderMarca()).isEqualTo("toyota");
    }

    // --- helpers ---

    private ResultadoPythonDTO buildResultadoPythonDTO(
            String marca, String modelo, String versao, double cobertura, double coberturaLive) {

        PythonAtributoMetaDTO meta = new PythonAtributoMetaDTO();
        meta.setValor(397);
        meta.setConfianca(0.95);
        meta.setFontePrimaria("https://ford.com.br");
        meta.setMercadoConfirmadoBr(true);
        meta.setDivergente(false);
        meta.setSchemaNivel("core");

        PythonCatalogoDTO dto = new PythonCatalogoDTO();
        dto.setSchema(Map.of("marca", marca, "modelo", modelo, "versao", versao,
                "ano_modelo", 2025, "segmento", "pickup"));
        dto.setCoberturaPct(cobertura);
        dto.setCoberturaLivePct(coberturaLive > 0 ? coberturaLive : null);
        dto.setStatus("completo");
        dto.setFontesUtilizadas(List.of("https://ford.com.br"));
        dto.setMetadados(Map.of("potencia_cv", meta));

        ResultadoPythonDTO resultado = new ResultadoPythonDTO();
        resultado.setFonte("novo");
        resultado.setCatalogo(dto);
        resultado.setTermosDesconhecidos(Collections.emptyList());
        resultado.setGapsRestantes(Collections.emptyList());
        resultado.setLogDecisoes(Collections.emptyList());
        return resultado;
    }
}
