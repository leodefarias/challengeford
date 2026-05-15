package br.ford.catalog.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "SCORE_COMPETITIVO")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreCompetitivoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "CATALOGO_ID", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CatalogoEntity catalogo;

    @Column(name = "SCORE_TECNICO")
    private Double scoreTecnico;

    @Column(name = "SCORE_VALOR")
    private Double scoreValor;

    @Column(name = "PERFIL_COMPETICAO", length = 50)
    private String perfilCompeticao;

    @Column(name = "CLUSTER_IDS", length = 500)
    private String clusterIds;

    @Column(name = "DATA_CALCULO", nullable = false)
    private LocalDateTime dataCalculo;

    @PrePersist
    private void prePersist() {
        if (dataCalculo == null) dataCalculo = LocalDateTime.now();
    }
}
