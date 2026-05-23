package br.ford.catalog.config;

import br.ford.catalog.domain.entity.UsuarioEntity;
import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import br.ford.catalog.domain.repository.CatalogoRepository;
import br.ford.catalog.domain.repository.UsuarioRepository;
import br.ford.catalog.service.CatalogoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final CatalogoRepository catalogoRepository;
    private final CatalogoService catalogoService;

    record VeiculoSeed(String marca, String modelo, String versao) {}

    private static final List<VeiculoSeed> SEED_VEHICLES = List.of(
        new VeiculoSeed("ford",       "ranger",      "raptor"),
        new VeiculoSeed("toyota",     "hilux",       "gr-s"),
        new VeiculoSeed("vw",         "amarok",      "v6 extreme"),
        new VeiculoSeed("chevrolet",  "s10",         "high country"),
        new VeiculoSeed("mitsubishi", "nova-triton", "hpe-s"),
        new VeiculoSeed("nissan",     "frontier",    "pro-4x")
    );

    @Override
    public void run(String... args) {
        String adminPassword = System.getenv("FORD_ADMIN_PASSWORD");
        if (adminPassword == null || adminPassword.isBlank()) {
            log.warn("FORD_ADMIN_PASSWORD não definido — usuários padrão não serão criados");
            return;
        }
        criarUsuarioSeNaoExiste("admin@ford.com.br", adminPassword, "Administrador Ford", UserRole.admin);
        criarUsuarioSeNaoExiste("analista@ford.com.br", adminPassword, "Analista Ford", UserRole.analista);

        normalizarCatalogos();
        seedCatalogosSeVazio();
    }

    private void criarUsuarioSeNaoExiste(String email, String senha, String nome, UserRole role) {
        var existing = usuarioRepository.findByEmail(email);
        if (existing.isEmpty()) {
            UsuarioEntity usuario = UsuarioEntity.builder()
                    .email(email)
                    .senhaHash(passwordEncoder.encode(senha))
                    .nome(nome)
                    .role(role)
                    .ativo(true)
                    .build();
            usuarioRepository.save(usuario);
            log.info("Usuário criado: {} ({})", email, role);
        } else {
            UsuarioEntity usuario = existing.get();
            usuario.setSenhaHash(passwordEncoder.encode(senha));
            usuario.setAtivo(true);
            usuarioRepository.save(usuario);
            log.info("Senha sincronizada: {} ({})", email, role);
        }
    }

    private void normalizarCatalogos() {
        try {
            var todos = catalogoRepository.findAll();
            for (var c : todos) {
                boolean reconhecido = SEED_VEHICLES.stream().anyMatch(s ->
                    s.marca().equalsIgnoreCase(c.getMarca() != null ? c.getMarca().trim() : "") &&
                    s.modelo().equalsIgnoreCase(c.getModelo() != null ? c.getModelo().trim() : "") &&
                    s.versao().equalsIgnoreCase(c.getVersao() != null ? c.getVersao().trim() : ""));
                if (!reconhecido) {
                    catalogoRepository.deleteById(c.getId());
                    log.warn("Catálogo desconhecido removido: {}/{}/{} (id={})",
                            c.getMarca(), c.getModelo(), c.getVersao(), c.getId());
                }
            }
        } catch (Exception e) {
            log.warn("Falha na limpeza de catálogos: {}", e.getMessage());
        }
    }

    private void seedCatalogosSeVazio() {
        int sucesso = 0;
        for (VeiculoSeed v : SEED_VEHICLES) {
            boolean jaExiste = catalogoRepository
                    .findByMarcaAndModeloAndVersao(v.marca(), v.modelo(), v.versao())
                    .isPresent();
            if (jaExiste) {
                log.info("Catálogo já existe: {} {} {}", v.marca(), v.modelo(), v.versao());
                sucesso++;
                continue;
            }
            try {
                catalogoService.solicitarExtracao(v.marca(), v.modelo(), v.versao());
                log.info("Catálogo seed OK: {} {} {}", v.marca(), v.modelo(), v.versao());
                sucesso++;
            } catch (Exception e) {
                log.warn("Catálogo seed FALHOU ({} {} {}): {}", v.marca(), v.modelo(), v.versao(), e.getMessage());
            }
        }
        log.info("Seed concluído: {}/{} catálogos verificados.", sucesso, SEED_VEHICLES.size());
    }
}
