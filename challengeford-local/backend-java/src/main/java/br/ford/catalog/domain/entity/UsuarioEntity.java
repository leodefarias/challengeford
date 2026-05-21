package br.ford.catalog.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "USUARIOS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UsuarioEntity implements UserDetails {

    public enum UserRole { admin, analista, viewer }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "EMAIL", nullable = false, unique = true, length = 200)
    private String email;

    @Column(name = "SENHA_HASH", nullable = false, length = 200)
    private String senhaHash;

    @Column(name = "NOME", length = 200)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "ROLE", nullable = false, length = 20)
    private UserRole role;

    @Column(name = "ATIVO", nullable = false)
    private boolean ativo;

    @Column(name = "DATA_CRIACAO", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "ULTIMO_ACESSO")
    private LocalDateTime ultimoAcesso;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @PrePersist
    private void prePersist() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
        if (role == null) role = UserRole.viewer;
        ativo = true;
    }

    // UserDetails contract
    @Override public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name().toUpperCase()));
    }
    @Override public String getPassword()   { return senhaHash; }
    @Override public String getUsername()   { return email; }
    @Override public boolean isAccountNonExpired()     { return true; }
    @Override public boolean isAccountNonLocked()      { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled()               { return ativo; }
}
