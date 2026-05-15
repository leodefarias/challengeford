package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.CapabilityScoreEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CapabilityScoreRepository extends JpaRepository<CapabilityScoreEntity, Long> {

    List<CapabilityScoreEntity> findByCatalogoId(Long catalogoId);

    @Modifying
    @Query("DELETE FROM CapabilityScoreEntity c WHERE c.catalogo.id = :catalogoId")
    void deleteByCatalogoId(Long catalogoId);
}
