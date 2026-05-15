package br.ford.catalog.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final long TTL_MS = 5 * 60_000L;
    private static final String TARGET_PATH = "/api/catalogos/extrair";

    private final ConcurrentHashMap<String, Long> seenKeys = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !TARGET_PATH.equals(request.getRequestURI())
                || !"POST".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String key = request.getHeader("Idempotency-Key");
        if (key == null || key.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        long now = System.currentTimeMillis();
        seenKeys.entrySet().removeIf(e -> now - e.getValue() > TTL_MS);

        Long existing = seenKeys.putIfAbsent(key.trim(), now);
        if (existing != null) {
            response.setStatus(409);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                    "error", "DUPLICATE_REQUEST",
                    "message", "Requisição duplicada. Use uma nova Idempotency-Key.",
                    "status", 409
            )));
            return;
        }

        chain.doFilter(request, response);
    }
}
