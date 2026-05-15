package br.ford.catalog.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "CAPABILITY_SCORES")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CapabilityScoreEntity {

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

    @Column(name = "CAPABILITY", nullable = false, length = 100)
    private String capability;

    @Column(name = "NIVEL", nullable = false)
    private Integer nivel;

    @Column(name = "NIVEL_MAXIMO_CLUSTER")
    private Integer nivelMaximoCluster;

    @Column(name = "SCORE_BRUTO")
    private Double scoreBruto;

    @Column(name = "SCORE_AJUSTADO")
    private Double scoreAjustado;

    @Column(name = "LIDER_MARCA", length = 50)
    private String liderMarca;

    @Column(name = "DATA_CALCULO", nullable = false)
    private LocalDateTime dataCalculo;

    @PrePersist
    private void prePersist() {
        if (dataCalculo == null) dataCalculo = LocalDateTime.now();
    }
}
