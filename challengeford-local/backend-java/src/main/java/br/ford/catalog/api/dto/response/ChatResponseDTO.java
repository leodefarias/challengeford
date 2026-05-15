package br.ford.catalog.api.dto.response;

import java.util.List;

public record ChatResponseDTO(
        String resposta,
        List<String> fontes,
        Boolean respondido,
        Boolean cacheHit
) {}
