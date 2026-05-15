package br.ford.catalog.api.dto.response;

import java.time.LocalDateTime;

public record CatalogoResumoDTO(
        Long id,
        String marca,
        String modelo,
        String versao,
        Integer anoModelo,
        String segmento,
        String status,
        Double coberturaPct,
        Double coberturaLivePct,
        Double scoreTecnico,
        Double scoreValor,
        LocalDateTime dataExtracao
) {}
