package br.ford.catalog.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "TERMOS_PENDENTES")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TermoPendenteEntity {

    public enum TermoStatus { pendente, mapeado, descartado }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "TERMO", nullable = false, length = 200)
    private String termo;

    @Column(name = "CONTEXTO", length = 2000)
    private String contexto;

    @Column(name = "ATRIBUTO_SUGERIDO", length = 100)
    private String atributoSugerido;

    @Column(name = "FONTE", length = 1000)
    private String fonte;

    @Column(name = "DATA_DETECTADO", nullable = false, updatable = false)
    private LocalDateTime dataDetectado;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private TermoStatus status;

    @Column(name = "REVISADO_POR", length = 100)
    private String revisadoPor;

    @Column(name = "DATA_REVISAO")
    private LocalDateTime dataRevisao;

    @PrePersist
    private void prePersist() {
        if (dataDetectado == null) dataDetectado = LocalDateTime.now();
        if (status == null) status = TermoStatus.pendente;
    }
}
