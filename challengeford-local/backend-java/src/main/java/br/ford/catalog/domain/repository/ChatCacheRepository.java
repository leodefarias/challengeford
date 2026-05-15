package br.ford.catalog.domain.repository;

import br.ford.catalog.domain.entity.ChatCacheEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ChatCacheRepository extends JpaRepository<ChatCacheEntity, Long> {

    Optional<ChatCacheEntity> findByPerguntaHashAndDataExpiracaoAfter(String hash, LocalDateTime agora);

    @Modifying
    @Query("DELETE FROM ChatCacheEntity c WHERE c.dataExpiracao < :agora")
    void deleteByDataExpiracaoBefore(LocalDateTime agora);
}
