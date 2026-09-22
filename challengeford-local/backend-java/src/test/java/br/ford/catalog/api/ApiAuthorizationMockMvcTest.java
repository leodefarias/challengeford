package br.ford.catalog.api;

import br.ford.catalog.api.controller.AuthController;
import br.ford.catalog.api.controller.CatalogoController;
import br.ford.catalog.api.dto.response.CatalogoResponseDTO;
import br.ford.catalog.api.dto.response.TokenDTO;
import br.ford.catalog.api.exception.GlobalExceptionHandler;
import br.ford.catalog.domain.repository.UsuarioRepository;
import br.ford.catalog.security.JwtUtil;
import br.ford.catalog.service.AuthService;
import br.ford.catalog.service.CatalogoService;
import br.ford.catalog.service.PythonClientService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testes HTTP da API: sucesso, erro de credencial e acesso não autorizado (401/403).
 */
@WebMvcTest(controllers = {AuthController.class, CatalogoController.class})
@Import({ApiAuthorizationMockMvcTest.TestSecurityConfig.class, GlobalExceptionHandler.class})
class ApiAuthorizationMockMvcTest {

    @Autowired MockMvc mockMvc;

    @MockBean AuthService authService;
    @MockBean CatalogoService catalogoService;
    @MockBean PythonClientService pythonClient;
    /** Necessário porque @WebMvcTest registra Filters (@Component) do pacote — JwtFilter depende disso. */
    @MockBean JwtUtil jwtUtil;
    @MockBean UsuarioRepository usuarioRepository;

    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            AuthenticationEntryPoint entryPoint = (request, response, ex) -> {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"UNAUTHORIZED\",\"message\":\"Token ausente ou inválido\",\"status\":401}");
            };
            http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(e -> e.authenticationEntryPoint(entryPoint))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/login").permitAll()
                    .requestMatchers("/actuator/health").permitAll()
                    .anyRequest().authenticated()
                );
            return http.build();
        }
    }

    private static CatalogoResponseDTO catalogoStub() {
        return new CatalogoResponseDTO(
                1L, "ford", "Ranger", "Raptor", 2026, "pickup", "completo",
                90.0, 90.0, 80.0, 70.0, LocalDateTime.now(), List.of(), List.of());
    }

    @Test
    @DisplayName("POST /api/auth/login — credenciais válidas → 200 + token")
    void login_sucesso_retorna200() throws Exception {
        when(authService.autenticar("admin@ford.com.br", "Admin@Ford2025"))
                .thenReturn(new TokenDTO("jwt.test.token", LocalDateTime.now().plusHours(8), "Admin", "admin"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@ford.com.br","senha":"Admin@Ford2025"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt.test.token"))
                .andExpect(jsonPath("$.role").value("admin"));
    }

    @Test
    @DisplayName("POST /api/auth/login — senha inválida → 401")
    void login_senhaInvalida_retorna401() throws Exception {
        when(authService.autenticar(anyString(), anyString()))
                .thenThrow(new BadCredentialsException("Credenciais inválidas"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@ford.com.br","senha":"senhaErrada1"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/catalogos sem autenticação → 401")
    void catalogos_semToken_retorna401() throws Exception {
        mockMvc.perform(get("/api/catalogos"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/catalogos com VIEWER → 200")
    @WithMockUser(username = "viewer@ford.com.br", roles = "VIEWER")
    void catalogos_viewerAutenticado_retorna200() throws Exception {
        when(catalogoService.listarCatalogos()).thenReturn(List.of());

        mockMvc.perform(get("/api/catalogos"))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
    }

    @Test
    @DisplayName("POST /api/catalogos/extrair com VIEWER → 403")
    @WithMockUser(username = "viewer@ford.com.br", roles = "VIEWER")
    void extrair_viewer_retorna403() throws Exception {
        mockMvc.perform(post("/api/catalogos/extrair")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marca":"ford","modelo":"Ranger","versao":"Raptor","forcarReprocessamento":false}
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/catalogos/extrair com ANALISTA → 200")
    @WithMockUser(username = "analista@ford.com.br", roles = "ANALISTA")
    void extrair_analista_retorna200() throws Exception {
        when(catalogoService.solicitarExtracao(eq("ford"), eq("Ranger"), eq("Raptor"), eq(false)))
                .thenReturn(catalogoStub());

        mockMvc.perform(post("/api/catalogos/extrair")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"marca":"ford","modelo":"Ranger","versao":"Raptor","forcarReprocessamento":false}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.marca").value("ford"))
                .andExpect(jsonPath("$.modelo").value("Ranger"));
    }

    @Test
    @DisplayName("POST /api/auth/register com VIEWER → 403")
    @WithMockUser(roles = "VIEWER")
    void register_viewer_retorna403() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .param("email", "novo@ford.com.br")
                        .param("senha", "Senha@123")
                        .param("nome", "Novo")
                        .param("role", "viewer"))
                .andExpect(status().isForbidden());
    }
}
