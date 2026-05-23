package br.ford.catalog.api.dto.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ComparativoRequest(
        @NotEmpty @Size(min = 2, max = 10) List<Long> catalogoIds
) {}
