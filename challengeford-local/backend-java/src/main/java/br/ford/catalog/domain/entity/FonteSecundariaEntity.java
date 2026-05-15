package br.ford.catalog.domain.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "CATALOGO_FONTES_SECUNDARIAS")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FonteSecundariaEntity {

    public enum FonteStatus { confirma, diverge, complementa }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ATRIBUTO_ID", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private AtributoEntity atributo;

    @Column(name = "URL", length = 1000)
    private String url;

    @Column(name = "VALOR_TEXT", length = 4000)
    private String valorText;

    @Enumerated(EnumType.STRING)
    @Column(name = "STATUS", nullable = false, length = 20)
    private FonteStatus status;

    @Column(name = "CONFIANCA")
    private Double confianca;
}
