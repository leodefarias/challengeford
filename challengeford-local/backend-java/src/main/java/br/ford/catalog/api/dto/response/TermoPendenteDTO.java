package br.ford.catalog.api.dto.response;

import java.time.LocalDateTime;

public record TermoPendenteDTO(
        Long id,
        String termo,
        String contexto,
        String atributoSugerido,
        String fonte,
        LocalDateTime dataDetectado,
        String status,
        String revisadoPor,
        LocalDateTime dataRevisao
) {}
