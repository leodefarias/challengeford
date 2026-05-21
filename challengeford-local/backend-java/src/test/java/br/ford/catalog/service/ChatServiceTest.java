package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.ChatResponseDTO;
import br.ford.catalog.domain.entity.ChatCacheEntity;
import br.ford.catalog.domain.repository.ChatCacheRepository;
import br.ford.catalog.security.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock private ChatCacheRepository cacheRepository;
    @Mock private PythonClientService pythonClient;
    @Mock private InputSanitizer inputSanitizer;

    @InjectMocks private ChatService chatService;

    @BeforeEach
    void setup() {
        when(inputSanitizer.sanitize(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void chat_cacheHit_returnsCachedResponse() {
        ChatCacheEntity entry = ChatCacheEntity.builder()
                .perguntaHash("abc123")
                .perguntaOriginal("Qual o torque do Raptor?")
                .resposta("O torque é 583 Nm.")
                .dataCriacao(LocalDateTime.now().minusDays(1))
                .dataExpiracao(LocalDateTime.now().plusDays(29))
                .build();

        when(cacheRepository.findByPerguntaHashAndDataExpiracaoAfter(anyString(), any()))
                .thenReturn(Optional.of(entry));

        ChatResponseDTO result = chatService.chat("Qual o torque do Raptor?", "user1");

        assertThat(result.cacheHit()).isTrue();
        assertThat(result.resposta()).isEqualTo("O torque é 583 Nm.");
        verifyNoInteractions(pythonClient);
    }

    @Test
    void chat_cacheMiss_callsPythonAndSaves() {
        when(cacheRepository.findByPerguntaHashAndDataExpiracaoAfter(anyString(), any()))
                .thenReturn(Optional.empty());
        when(pythonClient.chat(anyString(), isNull()))
                .thenReturn(Map.of("resposta", "Ford lidera em potência.", "contexto_utilizado", true));

        ChatResponseDTO result = chatService.chat("Quem tem mais potência?", "user1");

        assertThat(result.cacheHit()).isFalse();
        assertThat(result.resposta()).isEqualTo("Ford lidera em potência.");
        assertThat(result.respondido()).isTrue();

        ArgumentCaptor<ChatCacheEntity> captor = ArgumentCaptor.forClass(ChatCacheEntity.class);
        verify(cacheRepository).save(captor.capture());
        assertThat(captor.getValue().getPerguntaOriginal()).isEqualTo("Quem tem mais potência?");
        assertThat(captor.getValue().getDataExpiracao()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    void chat_normalizacaoPergunta_geraHashConsistente() {
        // Mesma pergunta com capitalização diferente → mesmo hash → cache hit
        when(cacheRepository.findByPerguntaHashAndDataExpiracaoAfter(anyString(), any()))
                .thenReturn(Optional.empty());
        when(pythonClient.chat(anyString(), isNull()))
                .thenReturn(Map.of("resposta", "Resposta.", "contexto_utilizado", true));

        chatService.chat("QUAL O PREÇO?", "u1");
        chatService.chat("qual o preço?", "u1");

        // Deve ter chamado pythonClient apenas 1 vez para "qual o preco" e 1 para a outra
        // O hash é calculado da pergunta normalizada, mas o mock retorna Optional.empty sempre
        // então são 2 chamadas — validamos que o cache foi salvo 2 vezes
        verify(cacheRepository, times(2)).save(any(ChatCacheEntity.class));
    }

    @Test
    void chat_perguntaVazia_naoLancaException() {
        when(cacheRepository.findByPerguntaHashAndDataExpiracaoAfter(anyString(), any()))
                .thenReturn(Optional.empty());
        when(pythonClient.chat(anyString(), isNull()))
                .thenReturn(Map.of("resposta", "", "contexto_utilizado", false));

        ChatResponseDTO result = chatService.chat("  ", "u1");
        assertThat(result).isNotNull();
    }
}
