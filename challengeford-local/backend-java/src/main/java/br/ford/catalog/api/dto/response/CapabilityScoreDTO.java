package br.ford.catalog.api.dto.response;

public record CapabilityScoreDTO(
        String capability,
        Integer nivel,
        Integer nivelMaximoCluster,
        Double scoreBruto,
        Double scoreAjustado,
        String liderMarca
) {}
