package br.ford.catalog.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonTermoDTO {
    private String termo;
    private String contexto;

    @JsonProperty("atributo_sugerido")
    private String atributoSugerido;

    private String fonte;
}
