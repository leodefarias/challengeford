package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.CatalogoEntity;
import br.ford.catalog.domain.entity.CatalogoEntity.CatalogoStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CatalogoRepository extends JpaRepository<CatalogoEntity, Long> {

    Optional<CatalogoEntity> findByMarcaIgnoreCaseAndModeloIgnoreCaseAndVersaoIgnoreCase(String marca, String modelo, String versao);

    default Optional<CatalogoEntity> findByMarcaAndModeloAndVersao(String marca, String modelo, String versao) {
        return findByMarcaIgnoreCaseAndModeloIgnoreCaseAndVersaoIgnoreCase(marca, modelo, versao);
    }

    Optional<CatalogoEntity> findByMarcaAndModeloAndVersaoAndAnoModelo(
            String marca, String modelo, String versao, Integer anoModelo);

    List<CatalogoEntity> findByStatus(CatalogoStatus status);

    List<CatalogoEntity> findAllByOrderByDataExtracaoDesc();
}
