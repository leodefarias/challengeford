package br.ford.catalog.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class PythonCatalogoDTO {

    private Map<String, Object> schema;

    @JsonProperty("cobertura_pct")
    private Double coberturaPct;

    @JsonProperty("cobertura_live_pct")
    private Double coberturaLivePct;

    private String status;

    @JsonProperty("data_extracao")
    private String dataExtracao;

    @JsonProperty("fontes_utilizadas")
    private List<String> fontesUtilizadas;

    private Map<String, PythonAtributoMetaDTO> metadados;
}
