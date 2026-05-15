package br.ford.catalog.api.controller;

import br.ford.catalog.api.dto.request.LoginRequest;
import br.ford.catalog.api.dto.response.TokenDTO;
import br.ford.catalog.domain.entity.UsuarioEntity.UserRole;
import br.ford.catalog.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Autenticação", description = "Login JWT e cadastro de usuários")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Autenticar usuário", description = "Retorna Bearer token JWT válido por 8 horas")
    @ApiResponse(responseCode = "200", description = "Token gerado")
    @ApiResponse(responseCode = "401", description = "Credenciais inválidas")
    @PostMapping("/login")
    public ResponseEntity<TokenDTO> login(@Valid @RequestBody LoginRequest request) {
        TokenDTO token = authService.autenticar(request.email(), request.senha());
        return ResponseEntity.ok(token);
    }

    @Operation(summary = "Criar usuário", description = "Exclusivo ADMIN — cria conta com role admin, analista ou viewer")
    @ApiResponse(responseCode = "200", description = "Usuário criado")
    @ApiResponse(responseCode = "400", description = "Role inválido ou e-mail duplicado")
    @ApiResponse(responseCode = "403", description = "Acesso negado — requer ADMIN")
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> register(
            @RequestParam @Email @NotBlank @Size(max = 254) String email,
            @RequestParam @NotBlank @Size(min = 8, max = 72) String senha,
            @RequestParam @NotBlank @Size(max = 100) String nome,
            @RequestParam(defaultValue = "viewer") @Size(max = 20) String role) {
        UserRole userRole;
        try {
            userRole = UserRole.valueOf(role.toLowerCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Role inválido. Use: admin, analista ou viewer");
        }
        authService.criarUsuario(email, senha, nome, userRole);
        return ResponseEntity.ok(Map.of("message", "Usuário criado com sucesso"));
    }
}
