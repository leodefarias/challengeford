package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.AtributoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AtributoRepository extends JpaRepository<AtributoEntity, Long> {

    List<AtributoEntity> findByCatalogoId(Long catalogoId);

    Optional<AtributoEntity> findByCatalogoIdAndAtributo(Long catalogoId, String atributo);

    List<AtributoEntity> findByDivergenteTrue();
}
