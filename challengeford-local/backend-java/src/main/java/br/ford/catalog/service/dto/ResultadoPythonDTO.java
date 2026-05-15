package br.ford.catalog.service.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ResultadoPythonDTO {
    private String fonte;
    private PythonCatalogoDTO catalogo;

    @JsonProperty("termos_desconhecidos")
    private List<PythonTermoDTO> termosDesconhecidos;

    @JsonProperty("gaps_restantes")
    private List<String> gapsRestantes;

    @JsonProperty("log_decisoes")
    private List<String> logDecisoes;
}
