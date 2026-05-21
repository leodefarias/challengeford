package br.ford.catalog.security;

import br.ford.catalog.domain.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private static final int BRUTE_FORCE_THRESHOLD = 5;
    private final ConcurrentHashMap<String, AtomicInteger> invalidTokenCountByIp = new ConcurrentHashMap<>();

    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        if (!jwtUtil.validarToken(token)) {
            String ip = request.getRemoteAddr();
            int failures = invalidTokenCountByIp
                    .computeIfAbsent(ip, k -> new AtomicInteger(0))
                    .incrementAndGet();
            log.warn("[SECURITY] Token JWT inválido rejeitado: ip={} failures={}", ip, failures);
            if (failures >= BRUTE_FORCE_THRESHOLD) {
                log.warn("[SECURITY_ALERT] type=suspicious_token_reuse ip={} failures={} — possível ataque de força bruta ou replay", ip, failures);
            }
            sendUnauthorized(response);
            return;
        }

        String ip = request.getRemoteAddr();
        invalidTokenCountByIp.remove(ip);

        String email = jwtUtil.extrairEmail(token);
        if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = usuarioRepository.findByEmailAndAtivoTrue(email).orElse(null);
            if (userDetails != null) {
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Token inválido ou expirado\",\"status\":401}");
    }
}
