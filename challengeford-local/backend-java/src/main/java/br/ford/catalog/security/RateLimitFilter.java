package br.ford.catalog.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final long CLEANUP_AFTER_MS = 2 * WINDOW_MS;

    private static final Map<String, Integer> ENDPOINT_LIMITS = Map.of(
            "/api/auth/login",        60,
            "/api/catalogos/extrair", 10,
            "/api/chat",              20
    );

    private static final Set<String> TRUSTED_PROXY_PREFIXES = Set.of(
            "127.0.0.1", "::1", "0:0:0:0:0:0:0:1",
            "172.16.", "172.17.", "172.18.", "172.19.", "172.20.",
            "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
            "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
            "10.", "192.168."
    );

    private final ConcurrentHashMap<String, List<Long>> attempts = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return true;
        return !ENDPOINT_LIMITS.containsKey(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String ip   = resolveIp(request);
        String path = request.getRequestURI();
        String key  = ip + ":" + path;
        int    limit = ENDPOINT_LIMITS.getOrDefault(path, 10);
        long   now  = System.currentTimeMillis();

        List<Long> windows = attempts.compute(key, (k, list) -> {
            if (list == null) list = new ArrayList<>();
            list.removeIf(t -> now - t > WINDOW_MS);
            list.add(now);
            return list;
        });

        // cleanup stale keys (no activity for 2 windows)
        attempts.entrySet().removeIf(e ->
                !e.getValue().isEmpty() && now - e.getValue().getLast() > CLEANUP_AFTER_MS);

        if (windows.size() > limit) {
            log.warn("[SECURITY_ALERT] Rate limit hit: ip={}, endpoint={}, attempts={}",
                    ip, path, windows.size());
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"error\":\"TOO_MANY_REQUESTS\",\"message\":\"Muitas tentativas. Tente novamente em 60 segundos.\",\"status\":429}");
            return;
        }

        chain.doFilter(request, response);
    }

    private String resolveIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (isTrustedProxy(remoteAddr)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }

    private boolean isTrustedProxy(String addr) {
        for (String prefix : TRUSTED_PROXY_PREFIXES) {
            if (addr.equals(prefix) || addr.startsWith(prefix)) return true;
        }
        return false;
    }
}
