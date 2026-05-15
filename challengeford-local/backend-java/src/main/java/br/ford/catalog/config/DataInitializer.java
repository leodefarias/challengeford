package br.ford.catalog.config;

import br.ford.catalog.domain.entity.UsuarioEntity;
import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import br.ford.catalog.domain.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String adminPassword = System.getenv("FORD_ADMIN_PASSWORD");
        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("FORD_ADMIN_PASSWORD não definido — usuários padrão não serão criados");
            return;
        }
        criarUsuarioSeNaoExiste("admin@ford.com.br", adminPassword, "Administrador Ford", UserRole.admin);
        criarUsuarioSeNaoExiste("analista@ford.com.br", adminPassword, "Analista Ford", UserRole.analista);
    }

    private void criarUsuarioSeNaoExiste(String email, String senha, String nome, UserRole role) {
        if (usuarioRepository.findByEmail(email).isEmpty()) {
            UsuarioEntity usuario = UsuarioEntity.builder()
                    .email(email)
                    .senhaHash(passwordEncoder.encode(senha))
                    .nome(nome)
                    .role(role)
                    .ativo(true)
                    .build();
            usuarioRepository.save(usuario);
            log.info("Usuário criado: {} ({})", email, role);
        }
    }
}
