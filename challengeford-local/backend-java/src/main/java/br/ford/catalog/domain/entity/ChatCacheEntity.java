package br.ford.catalog.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "CHAT_CACHE")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatCacheEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "PERGUNTA_HASH", nullable = false, unique = true, length = 64)
    private String perguntaHash;

    @Lob
    @Column(name = "PERGUNTA_ORIGINAL", nullable = false)
    private String perguntaOriginal;

    @Lob
    @Column(name = "RESPOSTA", nullable = false)
    private String resposta;

    @Column(name = "FONTES_CITADAS", length = 2000)
    private String fontesCitadas;

    @Column(name = "DATA_CRIACAO", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @Column(name = "DATA_EXPIRACAO", nullable = false)
    private LocalDateTime dataExpiracao;

    @PrePersist
    private void prePersist() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
    }

    public boolean isExpirado() {
        return LocalDateTime.now().isAfter(dataExpiracao);
    }
}
