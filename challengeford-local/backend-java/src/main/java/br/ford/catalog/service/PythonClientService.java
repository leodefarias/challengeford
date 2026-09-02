package br.ford.catalog.service;

import br.ford.catalog.api.exception.PythonServiceException;
import br.ford.catalog.service.dto.ResultadoPythonDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class PythonClientService {

    private final RestTemplate extractionRestTemplate;
    private final RestTemplate chatRestTemplate;
    private final String pythonBaseUrl;

    public PythonClientService(
            @Qualifier("extractionRestTemplate") RestTemplate extractionRestTemplate,
            @Qualifier("chatRestTemplate") RestTemplate chatRestTemplate,
            @Value("${app.python-service-url}") String pythonBaseUrl) {
        this.extractionRestTemplate = extractionRestTemplate;
        this.chatRestTemplate = chatRestTemplate;
        this.pythonBaseUrl = pythonBaseUrl;
    }

    public ResultadoPythonDTO extrair(String marca, String modelo, String versao, boolean forcarReprocessamento) {
        String url = pythonBaseUrl + "/extrair";
        Map<String, Object> body = Map.of(
                "marca", marca,
                "modelo", modelo,
                "versao", versao,
                "forcar_reprocessamento", forcarReprocessamento
        );
        log.info("Chamando Python POST /extrair: {} {} {}", marca, modelo, versao);
        try {
            ResponseEntity<ResultadoPythonDTO> response = extractionRestTemplate.postForEntity(
                    url, body, ResultadoPythonDTO.class);
            if (response.getBody() == null) {
                throw new PythonServiceException("Resposta vazia do microsserviço IA");
            }
            return response.getBody();
        } catch (ResourceAccessException e) {
            log.error("Timeout ao chamar Python /extrair: {}", e.getMessage());
            throw new PythonServiceException("Timeout na extração do catálogo — tente novamente", e);
        } catch (RestClientException e) {
            log.error("Erro ao chamar Python /extrair: {}", e.getMessage());
            throw new PythonServiceException("Microsserviço IA indisponível: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> chat(String pergunta, List<String> contextoMarcas) {
        String url = pythonBaseUrl + "/chat";
        Map<String, Object> body = contextoMarcas != null
                ? Map.of("pergunta", pergunta, "contexto_marcas", contextoMarcas)
                : Map.of("pergunta", pergunta);
        log.info("Chamando Python POST /chat");
        try {
            ResponseEntity<Map> response = chatRestTemplate.postForEntity(url, body, Map.class);
            if (response.getBody() == null) {
                throw new PythonServiceException("Resposta vazia do chat IA");
            }
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Erro ao chamar Python /chat: {}", e.getMessage());
            throw new PythonServiceException("Microsserviço de chat indisponível: " + e.getMessage(), e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> comparar(List<Map<String, String>> veiculos) {
        String url = pythonBaseUrl + "/comparar";
        Map<String, Object> body = Map.of("veiculos", veiculos);
        try {
            ResponseEntity<Map> response = extractionRestTemplate.postForEntity(url, body, Map.class);
            if (response.getBody() == null) {
                throw new PythonServiceException("Resposta vazia do comparar IA");
            }
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Erro ao chamar Python /comparar: {}", e.getMessage());
            throw new PythonServiceException("Microsserviço de comparação indisponível", e);
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> ranking(List<Map<String, String>> veiculos, String perfil) {
        String url = pythonBaseUrl + "/ranking";
        Map<String, Object> body = perfil != null
                ? Map.of("veiculos", veiculos, "perfil", perfil)
                : Map.of("veiculos", veiculos);
        try {
            ResponseEntity<Map> response = extractionRestTemplate.postForEntity(url, body, Map.class);
            if (response.getBody() == null) {
                throw new PythonServiceException("Resposta vazia do ranking IA");
            }
            return response.getBody();
        } catch (RestClientException e) {
            log.error("Erro ao chamar Python /ranking: {}", e.getMessage());
            throw new PythonServiceException("Microsserviço de ranking indisponível", e);
        }
    }
}
