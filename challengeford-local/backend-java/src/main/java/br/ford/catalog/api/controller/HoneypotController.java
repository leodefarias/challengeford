package br.ford.catalog.api.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Honeypot — captura bots e script kiddies tentando paths sensíveis.
 * Qualquer acesso é logado com IP e User-Agent e retorna 403.
 */
@Slf4j
@RestController
public class HoneypotController {

    private static final Map<String, Object> HONEY_RESPONSE = Map.of(
            "error", "FORBIDDEN",
            "message", "Acesso negado",
            "status", 403
    );

    @GetMapping({
        "/admin", "/admin/", "/admin/config",
        "/.env", "/.env.local", "/.env.prod",
        "/api/internal/debug", "/api/internal/admin",
        "/phpinfo.php", "/wp-admin", "/wp-login.php",
        "/actuator", "/actuator/env", "/actuator/beans",
        "/api/v1/admin", "/console", "/h2-console",
        "/api/users/dump", "/api/debug"
    })
    public ResponseEntity<Map<String, Object>> honeypotGet(HttpServletRequest request) {
        logHoneypot(request);
        return ResponseEntity.status(403).body(HONEY_RESPONSE);
    }

    @PostMapping({
        "/admin", "/admin/login",
        "/api/internal/debug", "/api/internal/exec",
        "/api/admin/reset", "/api/admin/secret"
    })
    public ResponseEntity<Map<String, Object>> honeypotPost(HttpServletRequest request) {
        logHoneypot(request);
        return ResponseEntity.status(403).body(HONEY_RESPONSE);
    }

    private void logHoneypot(HttpServletRequest request) {
        log.warn("[HONEYPOT] Acesso suspeito detectado: ip={} method={} path={} userAgent={}",
                resolveIp(request),
                request.getMethod(),
                request.getRequestURI(),
                request.getHeader("User-Agent"));
    }

    private String resolveIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
