package br.ford.catalog.api.dto.request;

import br.ford.catalog.domain.enums.MarcaEnum;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ExtrairRequest(
        @NotNull MarcaEnum marca,
        @NotBlank @Size(max = 100) String modelo,
        @NotBlank @Size(max = 100) String versao
) {}
