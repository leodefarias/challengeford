package br.ford.catalog.service;

import br.ford.catalog.api.dto.response.ChatResponseDTO;
import br.ford.catalog.domain.entity.ChatCacheEntity;
import br.ford.catalog.domain.repository.ChatCacheRepository;
import br.ford.catalog.security.InputSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatCacheRepository cacheRepository;
    private final PythonClientService pythonClient;
    private final InputSanitizer inputSanitizer;

    @Transactional
    public ChatResponseDTO chat(String pergunta, String usuarioId) {
        pergunta = inputSanitizer.sanitize(pergunta);
        String hash = sha256(normalizarPergunta(pergunta));

        Optional<ChatCacheEntity> cached = cacheRepository
                .findByPerguntaHashAndDataExpiracaoAfter(hash, LocalDateTime.now());

        if (cached.isPresent()) {
            log.info("Cache hit para pergunta (hash={})", hash.substring(0, 8));
            ChatCacheEntity entry = cached.get();
            return new ChatResponseDTO(
                    entry.getResposta(),
                    parseFontes(entry.getFontesCitadas()),
                    true,
                    true
            );
        }

        log.info("Cache miss — chamando Python /chat");
        Map<String, Object> resultado = pythonClient.chat(pergunta, null);

        String resposta = (String) resultado.getOrDefault("resposta", "");
        Boolean respondido = (Boolean) resultado.getOrDefault("contexto_utilizado", false);

        ChatCacheEntity entry = ChatCacheEntity.builder()
                .perguntaHash(hash)
                .perguntaOriginal(pergunta)
                .resposta(resposta)
                .dataExpiracao(LocalDateTime.now().plusDays(30))
                .build();
        cacheRepository.save(entry);

        return new ChatResponseDTO(resposta, List.of(), respondido, false);
    }

    private String normalizarPergunta(String p) {
        return p.toLowerCase().trim().replaceAll("[^a-z0-9 áéíóúâêîôûãõ]", " ").strip();
    }

    private String sha256(String texto) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(texto.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 não disponível", e);
        }
    }

    @SuppressWarnings("unchecked")
    private List<String> parseFontes(String fontesCitadas) {
        if (fontesCitadas == null || fontesCitadas.isBlank()) return List.of();
        return List.of(fontesCitadas.split(","));
    }
}
