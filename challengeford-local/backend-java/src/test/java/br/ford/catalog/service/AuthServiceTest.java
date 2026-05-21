package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.TokenDTO;
import br.ford.catalog.domain.entity.UsuarioEntity;
import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import br.ford.catalog.domain.repository.UsuarioRepository;
import br.ford.catalog.security.JwtUtil;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtUtil jwtUtil;

    @InjectMocks private AuthService authService;

    private UsuarioEntity adminFixture() {
        return UsuarioEntity.builder()
                .id(1L)
                .email("admin@ford.com.br")
                .senhaHash("$2b$12$hashed")
                .nome("Admin")
                .role(UserRole.admin)
                .ativo(true)
                .build();
    }

    @Test
    void autenticar_credenciaisValidas_retornaToken() {
        when(usuarioRepository.findByEmailAndAtivoTrue("admin@ford.com.br"))
                .thenReturn(Optional.of(adminFixture()));
        when(passwordEncoder.matches("Admin@Ford2025", "$2b$12$hashed")).thenReturn(true);
        when(jwtUtil.gerarToken(1L, "admin@ford.com.br", UserRole.admin)).thenReturn("jwt.token.aqui");

        TokenDTO token = authService.autenticar("admin@ford.com.br", "Admin@Ford2025");

        assertThat(token.token()).isEqualTo("jwt.token.aqui");
        assertThat(token.role()).isEqualTo("admin");
        assertThat(token.nome()).isEqualTo("Admin");
    }

    @Test
    void autenticar_usuarioNaoExiste_lancaBadCredentials() {
        when(usuarioRepository.findByEmailAndAtivoTrue(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.autenticar("nao@existe.com", "senha"))
                .isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(jwtUtil);
    }

    @Test
    void autenticar_senhaErrada_lancaBadCredentials() {
        when(usuarioRepository.findByEmailAndAtivoTrue("admin@ford.com.br"))
                .thenReturn(Optional.of(adminFixture()));
        when(passwordEncoder.matches("senhaErrada", "$2b$12$hashed")).thenReturn(false);

        assertThatThrownBy(() -> authService.autenticar("admin@ford.com.br", "senhaErrada"))
                .isInstanceOf(BadCredentialsException.class);
        verifyNoInteractions(jwtUtil);
    }

    @Test
    void criarUsuario_emailDuplicado_lancaIllegalArgument() {
        when(usuarioRepository.findByEmail("admin@ford.com.br"))
                .thenReturn(Optional.of(adminFixture()));

        assertThatThrownBy(() -> authService.criarUsuario("admin@ford.com.br", "pw", "Nome", UserRole.viewer))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("já cadastrado");
        verify(usuarioRepository, never()).save(any());
    }

    @Test
    void criarUsuario_emailNovo_salvaComBCrypt() {
        when(usuarioRepository.findByEmail("novo@ford.com.br")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("senha")).thenReturn("$2b$12$hashed_novo");
        when(usuarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        UsuarioEntity criado = authService.criarUsuario("novo@ford.com.br", "senha", "Novo", UserRole.analista);

        assertThat(criado.getSenhaHash()).isEqualTo("$2b$12$hashed_novo");
        assertThat(criado.getRole()).isEqualTo(UserRole.analista);
    }

    @Test
    void anonimizarUsuario_usuarioExiste_anonimizaDados() {
        UsuarioEntity usuario = adminFixture();
        when(usuarioRepository.findByEmail("admin@ford.com.br")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.encode(anyString())).thenReturn("$2b$12$random_hash");
        when(usuarioRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        authService.anonimizarUsuario("admin@ford.com.br");

        assertThat(usuario.getEmail()).startsWith("anonimizado_");
        assertThat(usuario.getNome()).isEqualTo("Usuário Removido");
        assertThat(usuario.isAtivo()).isFalse();
        assertThat(usuario.getDeletedAt()).isNotNull();
    }

    @Test
    void anonimizarUsuario_usuarioNaoExiste_lancaIllegalArgument() {
        when(usuarioRepository.findByEmail(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.anonimizarUsuario("nao@existe.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("não encontrado");
    }
}
