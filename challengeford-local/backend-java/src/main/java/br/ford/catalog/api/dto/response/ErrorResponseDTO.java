package br.ford.catalog.api.dto.response;

import java.time.LocalDateTime;

public record ErrorResponseDTO(
        String error,
        String message,
        Integer status,
        LocalDateTime timestamp
) {}
