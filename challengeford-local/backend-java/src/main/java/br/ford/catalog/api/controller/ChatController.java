package br.ford.catalog.api.controller;

import br.ford.catalog.api.dto.request.ChatRequest;
import br.ford.catalog.api.dto.response.ChatResponseDTO;
import br.ford.catalog.domain.entity.UsuarioEntity;
import br.ford.catalog.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Chat RAG", description = "Perguntas em linguagem natural sobre os catálogos via RAG + LLM")
@SecurityRequirement(name = "bearerAuth")
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "Enviar pergunta ao assistente", description = "Responde com base nos catálogos indexados no ChromaDB (cache de 30 dias)")
    @ApiResponse(responseCode = "200", description = "Resposta gerada")
    @ApiResponse(responseCode = "401", description = "Token ausente ou inválido")
    @ApiResponse(responseCode = "502", description = "Microsserviço IA indisponível")
    @PostMapping
    public ResponseEntity<ChatResponseDTO> chat(
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal UsuarioEntity usuario) {
        String usuarioId = usuario != null ? usuario.getId().toString() : "anon";
        return ResponseEntity.ok(chatService.chat(request.pergunta(), usuarioId));
    }
}
