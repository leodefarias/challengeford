package br.ford.catalog.api.dto.response;

public record AtributoDTO(
        String atributo,
        Object valor,
        Double confianca,
        String fontePrimaria,
        Boolean divergente,
        Boolean mercadoConfirmadoBr,
        String schemaNivel
) {}
