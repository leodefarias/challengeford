package br.ford.catalog.config;

import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class FlywayConfig {

    /**
     * Estratégia de migração segura para Oracle FIAP.
     * Chama repair() para limpar entradas falhas do histórico antes de migrar.
     * Os scripts V1-V4 são idempotentes (PL/SQL + MERGE) e toleram
     * re-execução em banco já populado.
     */
    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            try {
                flyway.repair();
                log.info("Flyway: repair executado — entradas falhas removidas do histórico");
            } catch (Exception e) {
                log.warn("Flyway repair (ignorado): {}", e.getMessage());
            }
            flyway.migrate();
        };
    }
}
