package br.ford.catalog.api.dto.response;

import java.util.List;
import java.util.Map;

public record ComparativoResponseDTO(
        List<String> veiculos,
        List<String> atributosComparados,
        Map<String, Map<String, Object>> tabela,
        Map<String, String> destaques
) {}
