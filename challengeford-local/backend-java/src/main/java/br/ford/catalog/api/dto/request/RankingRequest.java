package br.ford.catalog.api.dto.request;

import java.util.List;
import java.util.Map;

public record RankingRequest(
        String perfil,
        Map<String, Double> criterios,
        List<Long> ids
) {}
