package br.ford.catalog.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Configuration
public class AppConfig {

    @Value("${app.internal-api-key:}")
    private String internalApiKey;

    @Bean("extractionRestTemplate")
    public RestTemplate extractionRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(120_000);
        RestTemplate rt = new RestTemplate(factory);
        rt.setInterceptors(List.of(internalTokenInterceptor()));
        return rt;
    }

    @Bean("chatRestTemplate")
    public RestTemplate chatRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        RestTemplate rt = new RestTemplate(factory);
        rt.setInterceptors(List.of(internalTokenInterceptor()));
        return rt;
    }

    private org.springframework.http.client.ClientHttpRequestInterceptor internalTokenInterceptor() {
        return (request, body, execution) -> {
            if (internalApiKey != null && !internalApiKey.isBlank()) {
                request.getHeaders().set("X-Internal-Token", internalApiKey);
            }
            return execution.execute(request, body);
        };
    }
}
