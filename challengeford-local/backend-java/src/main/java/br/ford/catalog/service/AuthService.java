package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.TokenDTO;
import br.ford.catalog.domain.entity.UsuarioEntity;
import br.ford.catalog.domain.repository.UsuarioRepository;
import br.ford.catalog.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public TokenDTO autenticar(String email, String senha) {
        UsuarioEntity usuario = usuarioRepository.findByEmailAndAtivoTrue(email)
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (!passwordEncoder.matches(senha, usuario.getSenhaHash())) {
            log.warn("Senha inválida para: {}", email);
            throw new BadCredentialsException("Credenciais inválidas");
        }

        String token = jwtUtil.gerarToken(usuario.getId(), usuario.getEmail(), usuario.getRole());
        log.info("Login efetuado: {} ({})", email, usuario.getRole());

        return new TokenDTO(
                token,
                LocalDateTime.now().plusHours(8),
                usuario.getNome(),
                usuario.getRole().name()
        );
    }

    @Transactional
    public UsuarioEntity criarUsuario(String email, String senha, String nome, UsuarioEntity.UserRole role) {
        if (usuarioRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email já cadastrado: " + email);
        }
        UsuarioEntity usuario = UsuarioEntity.builder()
                .email(email)
                .senhaHash(passwordEncoder.encode(senha))
                .nome(nome)
                .role(role)
                .ativo(true)
                .build();
        UsuarioEntity salvo = usuarioRepository.save(usuario);
        log.info("AUDIT|usuario_criado|email={}|role={}", email, role);
        return salvo;
    }
}
