package br.ford.catalog.security;

import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        String priv = Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded());
        String pub = Base64.getEncoder().encodeToString(kp.getPublic().getEncoded());
        jwtUtil = new JwtUtil(priv, pub, 8);
    }

    @Test
    void gerarEValidarToken_ok() {
        String token = jwtUtil.gerarToken(1L, "analista@ford.com.br", UserRole.analista);

        assertThat(jwtUtil.validarToken(token)).isTrue();
        assertThat(jwtUtil.extrairEmail(token)).isEqualTo("analista@ford.com.br");
        assertThat(jwtUtil.extrairRole(token)).isEqualTo("analista");
        assertThat(jwtUtil.extrairUserId(token)).isEqualTo(1L);
    }

    @Test
    void tokenAdulterado_invalido() {
        String token = jwtUtil.gerarToken(1L, "admin@ford.com.br", UserRole.admin);
        String adulterado = token.substring(0, token.length() - 4) + "xxxx";

        assertThat(jwtUtil.validarToken(adulterado)).isFalse();
    }

    @Test
    void tokenDeOutraChave_invalido() throws Exception {
        String token = jwtUtil.gerarToken(2L, "viewer@ford.com.br", UserRole.viewer);

        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair other = kpg.generateKeyPair();
        JwtUtil otherUtil = new JwtUtil(
                Base64.getEncoder().encodeToString(other.getPrivate().getEncoded()),
                Base64.getEncoder().encodeToString(other.getPublic().getEncoded()),
                8);

        assertThat(otherUtil.validarToken(token)).isFalse();
    }
}
