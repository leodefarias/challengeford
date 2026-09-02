package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.TermoPendenteEntity;
import br.ford.catalog.domain.entity.TermoPendenteEntity.TermoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TermoPendenteRepository extends JpaRepository<TermoPendenteEntity, Long> {

    List<TermoPendenteEntity> findByStatus(TermoStatus status);

    List<TermoPendenteEntity> findByStatusOrderByDataDetectadoDesc(TermoStatus status);

    boolean existsByTermoIgnoreCaseAndFonteAndStatus(String termo, String fonte, TermoStatus status);
}
