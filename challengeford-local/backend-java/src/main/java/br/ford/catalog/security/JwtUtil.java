package br.ford.catalog.security;

import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;

@Slf4j
@Component
public class JwtUtil {

    private static final String ISSUER   = "ford-catalog";
    private static final String AUDIENCE = "ford-catalog-api";

    private final PrivateKey privateKey;
    private final PublicKey  publicKey;
    private final long       expirationHours;

    public JwtUtil(
            @Value("${app.jwt.rsa-private-key:}") String rsaPrivateKeyB64,
            @Value("${app.jwt.rsa-public-key:}")  String rsaPublicKeyB64,
            @Value("${app.jwt.expiration-hours}")  long expirationHours) throws Exception {
        this.expirationHours = expirationHours;

        if (!rsaPrivateKeyB64.isBlank() && !rsaPublicKeyB64.isBlank()) {
            KeyFactory kf = KeyFactory.getInstance("RSA");
            byte[] privBytes = Base64.getDecoder().decode(rsaPrivateKeyB64.trim());
            byte[] pubBytes  = Base64.getDecoder().decode(rsaPublicKeyB64.trim());
            this.privateKey = kf.generatePrivate(new PKCS8EncodedKeySpec(privBytes));
            this.publicKey  = kf.generatePublic(new X509EncodedKeySpec(pubBytes));
            log.info("[SECURITY] JWT RS256 — par de chaves RSA carregado das variáveis de ambiente");
        } else {
            log.warn("[SECURITY] RSA_PRIVATE_KEY/RSA_PUBLIC_KEY não configurados — gerando par efêmero 2048-bit. Tokens invalidados a cada restart.");
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048, new SecureRandom());
            KeyPair kp = kpg.generateKeyPair();
            this.privateKey = kp.getPrivate();
            this.publicKey  = kp.getPublic();
        }
    }

    public String gerarToken(Long userId, String email, UserRole role) {
        Date expiration = Date.from(
                LocalDateTime.now().plusHours(expirationHours)
                        .atZone(ZoneId.systemDefault()).toInstant());
        return Jwts.builder()
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .subject(email)
                .claim("userId", userId)
                .claim("role", role.name())
                .issuedAt(new Date())
                .expiration(expiration)
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    public boolean validarToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(publicKey)
                    .requireIssuer(ISSUER)
                    .requireAudience(AUDIENCE)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.warn("[SECURITY] JWT inválido: {}", e.getMessage());
            return false;
        }
    }

    public String extrairEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extrairRole(String token) {
        return getClaims(token).get("role", String.class);
    }

    public Long extrairUserId(String token) {
        return getClaims(token).get("userId", Long.class);
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(publicKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
