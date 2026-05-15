package br.ford.catalog.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonAtributoMetaDTO {
    private Object valor;
    private Double confianca;

    @JsonProperty("fonte_primaria")
    private String fontePrimaria;

    @JsonProperty("mercado_confirmado_br")
    private Boolean mercadoConfirmadoBr;

    private Boolean divergente;

    @JsonProperty("schema_nivel")
    private String schemaNivel;
}
