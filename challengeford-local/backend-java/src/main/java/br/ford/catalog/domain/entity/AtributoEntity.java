package br.ford.catalog.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "CATALOGO_ATRIBUTOS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AtributoEntity {

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

    @Column(name = "ATRIBUTO", nullable = false, length = 100)
    private String atributo;

    @Column(name = "VALOR_TEXT", length = 4000)
    private String valorText;

    @Column(name = "VALOR_NUMBER")
    private Double valorNumber;

    @Column(name = "TIPO_VALOR", nullable = false, length = 20)
    private String tipoValor;

    @Column(name = "CONFIANCA", nullable = false)
    private Double confianca;

    @Column(name = "FONTE_PRIMARIA", length = 1000)
    private String fontePrimaria;

    @Column(name = "MERCADO_CONFIRMADO_BR", nullable = false)
    private boolean mercadoConfirmadoBr;

    @Column(name = "DIVERGENTE", nullable = false)
    private boolean divergente;

    @Column(name = "REVISADO_HUMANO", nullable = false)
    private boolean revisadoHumano;

    @Column(name = "SCHEMA_NIVEL", nullable = false, length = 20)
    private String schemaNivel;

    @OneToMany(mappedBy = "atributo", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    @Builder.Default
    private List<FonteSecundariaEntity> fontes = new ArrayList<>();

    /** Retorna o valor no tipo correto conforme TIPO_VALOR. */
    public Object getValor() {
        return switch (tipoValor) {
            case "number"  -> valorNumber;
            case "boolean" -> "true".equalsIgnoreCase(valorText);
            case "null"    -> null;
            default        -> valorText;
        };
    }
}
