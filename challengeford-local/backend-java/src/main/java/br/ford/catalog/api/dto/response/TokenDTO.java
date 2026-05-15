package br.ford.catalog.api.dto.response;

import java.time.LocalDateTime;

public record TokenDTO(
        String token,
        LocalDateTime expiracao,
        String nome,
        String role
) {}
