package br.ford.catalog.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "CATALOGOS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CatalogoEntity {

    public enum CatalogoStatus { completo, parcial, pendente_revisao }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "MARCA", nullable = false, length = 50)
    private String marca;

    @Column(name = "MODELO", nullable = false, length = 100)
    private String modelo;

    @Column(name = "VERSAO", nullable = false, length = 100)
    private String versao;

    @Column(name = "ANO_MODELO", nullable = false)
    private Integer anoModelo;

    @Column(name = "SEGMENTO", nullable = false, length = 20)
    private String segmento;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 30)
    private CatalogoStatus status;

    @Column(name = "COBERTURA_PCT")
    private Double coberturaPct;

    @Column(name = "COBERTURA_LIVE_PCT")
    private Double coberturaLivePct;

    @Column(name = "FONTES_UTILIZADAS", length = 2000)
    private String fontesUtilizadas;

    @Column(name = "DATA_EXTRACAO", nullable = false)
    private LocalDateTime dataExtracao;

    @Column(name = "DATA_CRIACAO", nullable = false, updatable = false)
    private LocalDateTime dataCriacao;

    @OneToMany(mappedBy = "catalogo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<AtributoEntity> atributos = new ArrayList<>();

    @OneToMany(mappedBy = "catalogo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<CapabilityScoreEntity> capabilityScores = new ArrayList<>();

    @OneToMany(mappedBy = "catalogo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<ScoreCompetitivoEntity> scores = new ArrayList<>();

    @PrePersist
    private void prePersist() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
    }
}
