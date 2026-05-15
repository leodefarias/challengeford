package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.ScoreCompetitivoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScoreCompetitivoRepository extends JpaRepository<ScoreCompetitivoEntity, Long> {

    List<ScoreCompetitivoEntity> findByCatalogoId(Long catalogoId);

    @Modifying
    @Query("DELETE FROM ScoreCompetitivoEntity s WHERE s.catalogo.id = :catalogoId AND s.perfilCompeticao = :perfil")
    void deleteByCatalogoIdAndPerfil(Long catalogoId, String perfil);
}
