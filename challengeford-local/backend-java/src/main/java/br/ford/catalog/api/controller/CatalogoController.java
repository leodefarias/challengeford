package br.ford.catalog.api.controller;

import br.ford.catalog.api.dto.request.ComparativoRequest;
import br.ford.catalog.api.dto.request.ExtrairRequest;
import br.ford.catalog.api.dto.request.RankingRequest;
import br.ford.catalog.api.dto.response.CatalogoResponseDTO;
import br.ford.catalog.api.dto.response.CatalogoResumoDTO;
import br.ford.catalog.api.dto.response.ComparativoResponseDTO;
import br.ford.catalog.service.CatalogoService;
import br.ford.catalog.service.PythonClientService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "Catálogos", description = "Extração, consulta, comparação e ranking de catálogos automotivos")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/catalogos")
@RequiredArgsConstructor
public class CatalogoController {

    private final CatalogoService catalogoService;
    private final PythonClientService pythonClient;

    @Operation(summary = "Listar catálogos", description = "Retorna todos os catálogos extraídos, ordenados por data decrescente")
    @ApiResponse(responseCode = "200", description = "Lista de catálogos")
    @GetMapping
    public ResponseEntity<List<CatalogoResumoDTO>> listar() {
        return ResponseEntity.ok(catalogoService.listarCatalogos());
    }

    @Operation(summary = "Buscar catálogo por ID")
    @ApiResponse(responseCode = "200", description = "Catálogo com atributos e capability scores")
    @ApiResponse(responseCode = "404", description = "Catálogo não encontrado")
    @GetMapping("/{id}")
    public ResponseEntity<CatalogoResponseDTO> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(catalogoService.buscarCatalogo(id));
    }

    @Operation(summary = "Extrair catálogo", description = "Dispara extração via agente IA (requer role ANALISTA ou ADMIN)")
    @ApiResponse(responseCode = "200", description = "Catálogo extraído e persistido")
    @ApiResponse(responseCode = "403", description = "Acesso negado — requer ANALISTA ou ADMIN")
    @ApiResponse(responseCode = "502", description = "Microsserviço IA indisponível")
    @PostMapping("/extrair")
    @PreAuthorize("hasAnyRole('ANALISTA', 'ADMIN')")
    public ResponseEntity<CatalogoResponseDTO> extrair(@Valid @RequestBody ExtrairRequest request) {
        return ResponseEntity.ok(
                catalogoService.solicitarExtracao(
                        request.marca().name(),
                        request.modelo(),
                        request.versao(),
                        request.forcarReprocessamentoEfetivo()));
    }

    @Operation(summary = "Comparar catálogos", description = "Tabela comparativa de atributos entre 2 a 6 veículos")
    @ApiResponse(responseCode = "200", description = "Tabela comparativa")
    @PostMapping("/comparar")
    public ResponseEntity<ComparativoResponseDTO> comparar(@Valid @RequestBody ComparativoRequest request) {
        return ResponseEntity.ok(catalogoService.comparar(request.catalogoIds()));
    }

    @Operation(summary = "Ranking por perfil", description = "Pontua e ordena veículos por perfil: familia, desempenho, custo_beneficio ou offroad")
    @ApiResponse(responseCode = "200", description = "Ranking com breakdown de scores")
    @GetMapping("/ranking")
    public ResponseEntity<Map<String, Object>> ranking(
            @RequestParam(required = false) String perfil,
            @RequestParam(required = false) List<Long> ids) {
        return ResponseEntity.ok(executarRanking(perfil, null, ids));
    }

    @Operation(summary = "Ranking com critérios customizados",
            description = "Pontua veículos com pesos personalizados por atributo")
    @ApiResponse(responseCode = "200", description = "Ranking customizado com breakdown de scores")
    @PostMapping("/ranking")
    public ResponseEntity<Map<String, Object>> rankingCustomizado(@RequestBody RankingRequest request) {
        return ResponseEntity.ok(executarRanking(request.perfil(), request.criterios(), request.ids()));
    }

    private Map<String, Object> executarRanking(String perfil, Map<String, Double> criterios, List<Long> ids) {
        List<Map<String, String>> veiculos = catalogoService.listarCatalogos().stream()
                .filter(c -> ids == null || ids.isEmpty() || ids.contains(c.id()))
                .map(c -> Map.of("marca", c.marca(), "modelo", c.modelo(), "versao", c.versao()))
                .toList();

        Map<String, Object> resultado = pythonClient.ranking(veiculos, perfil, criterios);
        catalogoService.salvarRanking(resultado);
        return resultado;
    }
}
