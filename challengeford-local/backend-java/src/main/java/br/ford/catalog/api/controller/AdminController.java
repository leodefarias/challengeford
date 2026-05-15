package br.ford.catalog.api.controller;

import br.ford.catalog.api.dto.response.TermoPendenteDTO;
import br.ford.catalog.domain.entity.TermoPendenteEntity;
import br.ford.catalog.domain.entity.TermoPendenteEntity.TermoStatus;
import br.ford.catalog.domain.repository.TermoPendenteRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Tag(name = "Administração", description = "Gestão de termos técnicos desconhecidos detectados pelo agente IA")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Validated
public class AdminController {

    private final TermoPendenteRepository termoPendenteRepository;

    record TermoPendenteUpdateRequest(
            @Pattern(regexp = "^(pendente|mapeado|descartado)$", message = "Status inválido") String status,
            @Size(max = 200) String atributo_sugerido
    ) {}

    @Operation(summary = "Listar termos pendentes", description = "Filtra por status: pendente (default), mapeado ou descartado")
    @ApiResponse(responseCode = "200", description = "Lista de termos")
    @ApiResponse(responseCode = "403", description = "Acesso negado — requer ADMIN")
    @GetMapping("/termos-pendentes")
    public ResponseEntity<List<TermoPendenteDTO>> listar(
            @RequestParam(defaultValue = "pendente") String status) {
        TermoStatus ts;
        try {
            ts = TermoStatus.valueOf(status);
        } catch (IllegalArgumentException e) {
            ts = TermoStatus.pendente;
        }
        List<TermoPendenteDTO> lista = termoPendenteRepository
                .findByStatusOrderByDataDetectadoDesc(ts)
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(lista);
    }

    @Operation(summary = "Buscar termo por ID")
    @ApiResponse(responseCode = "200", description = "Termo encontrado")
    @ApiResponse(responseCode = "404", description = "Termo não encontrado")
    @GetMapping("/termos-pendentes/{id}")
    public ResponseEntity<TermoPendenteDTO> buscar(@PathVariable Long id) {
        return termoPendenteRepository.findById(id)
                .map(t -> ResponseEntity.ok(toDTO(t)))
                .orElseThrow(() -> new EntityNotFoundException("Termo não encontrado: " + id));
    }

    @Operation(summary = "Atualizar status do termo", description = "Marca como mapeado (com atributo sugerido) ou descartado")
    @ApiResponse(responseCode = "200", description = "Termo atualizado")
    @ApiResponse(responseCode = "404", description = "Termo não encontrado")
    @PatchMapping("/termos-pendentes/{id}")
    public ResponseEntity<TermoPendenteDTO> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody TermoPendenteUpdateRequest body,
            @AuthenticationPrincipal UserDetails usuario) {

        TermoPendenteEntity termo = termoPendenteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Termo não encontrado: " + id));

        if (body.status() != null) {
            termo.setStatus(TermoStatus.valueOf(body.status()));
        }
        if (body.atributo_sugerido() != null) {
            termo.setAtributoSugerido(body.atributo_sugerido());
        }
        termo.setRevisadoPor(usuario.getUsername());
        termo.setDataRevisao(LocalDateTime.now());

        return ResponseEntity.ok(toDTO(termoPendenteRepository.save(termo)));
    }

    @Operation(summary = "Resumo de contagens por status")
    @ApiResponse(responseCode = "200", description = "Mapa status → quantidade")
    @GetMapping("/termos-pendentes/resumo")
    public ResponseEntity<Map<String, Long>> resumo() {
        Map<String, Long> counts = Map.of(
                "pendente",    (long) termoPendenteRepository.findByStatus(TermoStatus.pendente).size(),
                "mapeado",     (long) termoPendenteRepository.findByStatus(TermoStatus.mapeado).size(),
                "descartado",  (long) termoPendenteRepository.findByStatus(TermoStatus.descartado).size()
        );
        return ResponseEntity.ok(counts);
    }

    private TermoPendenteDTO toDTO(TermoPendenteEntity t) {
        return new TermoPendenteDTO(t.getId(), t.getTermo(), t.getContexto(),
                t.getAtributoSugerido(), t.getFonte(), t.getDataDetectado(),
                t.getStatus().name(), t.getRevisadoPor(), t.getDataRevisao());
    }
}
