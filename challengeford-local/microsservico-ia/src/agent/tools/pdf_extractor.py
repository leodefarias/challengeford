from __future__ import annotations

# pip install pdfplumber httpx

import hashlib
import logging
import re
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import pdfplumber

from config import PDF_CACHE_DIR

logger = logging.getLogger(__name__)

PDF_CACHE_DAYS = 30

# URLs de PDF oficiais estáveis (não inventar links). Sem PDF: agente usa sites + seed.
_PDF_URLS: dict[str, str | None] = {
    "ford_ranger_raptor":        "https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/ranger-raptor/pdf/fbr-ranger-raptor-ficha-tecnica.pdf",
    "toyota_hilux_gr-s":         "https://www.toyotacomunica.com.br/wp-content/uploads/2020/10/Ficha-Tecnica-Hilux-2024.pdf",
    "vw_amarok_v6_extreme":      None,  # sem PDF oficial estável — ficha na página vw.com.br
    "chevrolet_s10_high_country": None,  # sem PDF oficial estável — chevrolet.com.br/picapes/s10
    "mitsubishi_nova-triton_hpe-s": None,  # sem PDF oficial estável — mitsubishimotors.com.br
    "nissan_frontier_pro-4x":    None,  # specs em nissan.com.br/.../versoes.html, não PDF único
}

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}


def _cache_key(marca: str, modelo: str, versao: str) -> str:
    return f"{marca}_{modelo}_{versao}".lower().replace(" ", "_")


def _cache_path(key: str) -> Path:
    PDF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return PDF_CACHE_DIR / f"{key}.pdf"


def _hash_arquivo(path: Path) -> str:
    sha = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _cache_valido(path: Path) -> bool:
    if not path.exists():
        return False
    mtime = datetime.fromtimestamp(path.stat().st_mtime)
    return datetime.now() - mtime < timedelta(days=PDF_CACHE_DAYS)


async def _download_via_browser(url: str, cache: Path) -> Path | None:
    """
    Baixa conteúdo de URL protegida por WAF usando Cloudflare Browser Rendering
    ou Firecrawl como fallback. Salva como .txt (markdown/texto limpo).
    """
    cache_txt = cache.with_suffix(".txt")

    # 1. Cloudflare Browser Rendering (/scrape endpoint)
    try:
        from config import CF_ACCOUNT_ID, CF_API_TOKEN
        if CF_ACCOUNT_ID and CF_API_TOKEN:
            import httpx as _httpx
            cf_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/browser-rendering/scrape"
            payload = {"url": url, "elements": [{"selector": "body"}]}
            headers = {"Authorization": f"Bearer {CF_API_TOKEN}", "Content-Type": "application/json"}
            async with _httpx.AsyncClient(timeout=60) as c:
                r = await c.post(cf_url, json=payload, headers=headers)
                if r.status_code == 200:
                    data = r.json()
                    if data.get("success"):
                        partes = []
                        for elem in data.get("result", []):
                            for res in elem.get("results", []):
                                t = res.get("text", "").strip()
                                if t:
                                    partes.append(t)
                        texto = "\n".join(partes)
                        if texto and len(texto) > 500:
                            cache_txt.write_text(texto, encoding="utf-8")
                            logger.info("PDF via Cloudflare salvo: %s (%d chars)", cache_txt.name, len(texto))
                            return cache_txt
    except Exception as exc:
        logger.debug("Cloudflare Browser Rendering PDF falhou: %s", exc)

    # 2. Firecrawl como fallback
    try:
        from config import FIRECRAWL_API_KEY
        if not FIRECRAWL_API_KEY:
            return None
        import asyncio
        from firecrawl import FirecrawlApp

        def _sync():
            app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
            result = app.scrape(url, formats=["markdown"], only_main_content=False)
            return getattr(result, "markdown", None) or ""

        texto = await asyncio.to_thread(_sync)
        if not texto or len(texto) < 200:
            return None
        cache_txt.write_text(texto, encoding="utf-8")
        logger.info("PDF via Firecrawl salvo: %s (%d chars)", cache_txt.name, len(texto))
        return cache_txt
    except Exception as exc:
        logger.warning("Firecrawl PDF download falhou: %s", exc)
        return None


async def download_pdf(marca: str, modelo: str, versao: str) -> Path | None:
    key = _cache_key(marca, modelo, versao)
    cache = _cache_path(key)

    # Verifica cache (PDF binário ou texto via Firecrawl)
    cache_txt = cache.with_suffix(".txt")
    if _cache_valido(cache):
        logger.info("PDF cache hit: %s", cache.name)
        return cache
    if _cache_valido(cache_txt):
        logger.info("PDF texto cache hit: %s", cache_txt.name)
        return cache_txt

    url = _PDF_URLS.get(key)
    if not url:
        logger.info("Sem PDF registrado para %s", key)
        return None

    # Tenta httpx primeiro
    logger.info("Baixando PDF: %s", url)
    try:
        async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            cache.write_bytes(response.content)
            logger.info("PDF salvo: %s (%d bytes)", cache.name, len(response.content))
            return cache
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (403, 429):
            logger.info("PDF httpx bloqueado (%d) — tentando browser rendering: %s", exc.response.status_code, url)
            return await _download_via_browser(url, cache)
        logger.warning("PDF download falhou (%s): %s", exc.response.status_code, url)
        return None
    except httpx.TimeoutException:
        logger.warning("PDF download timeout: %s", url)
        return None


def _detectar_tipo(pdf_path: Path) -> str:
    """Retorna 'tabular' ou 'texto' baseado no conteúdo do PDF."""
    with pdfplumber.open(pdf_path) as pdf:
        total_celulas = 0
        total_chars = 0
        for page in pdf.pages[:5]:
            for table in page.extract_tables():
                total_celulas += sum(len(row) for row in table)
            texto = page.extract_text() or ""
            total_chars += len(texto)
    if total_celulas > 30:
        return "tabular"
    return "texto"


def _extrair_tabelas(pdf_path: Path) -> str:
    linhas: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            for table in page.extract_tables():
                for row in table:
                    celulas = [re.sub(r"\s+", " ", str(c or "")).strip() for c in row]
                    celulas = [c for c in celulas if c]
                    if celulas:
                        linhas.append(" | ".join(celulas))
    return "\n".join(linhas)


def _extrair_texto(pdf_path: Path) -> str:
    partes: list[str] = []
    header_pattern: set[str] = set()
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            texto = page.extract_text() or ""
            linhas = texto.split("\n")
            for linha in linhas:
                linha = linha.strip()
                if not linha or linha in header_pattern:
                    continue
                if len(linha) < 5:
                    continue
                partes.append(linha)
            # Registra primeiros/últimos como possíveis header/footer após 3 páginas
            if len(pdf.pages) > 3 and len(linhas) > 2:
                header_pattern.add(linhas[0].strip())
                header_pattern.add(linhas[-1].strip())
    return "\n".join(partes)


def extrair_texto_pdf(pdf_path: Path) -> tuple[str, str]:
    """Retorna (texto_extraido, tipo). Suporta .pdf e .txt (markdown via Firecrawl)."""
    if pdf_path.suffix == ".txt":
        texto = pdf_path.read_text(encoding="utf-8")
        logger.info("PDF texto (Firecrawl): %d chars", len(texto))
        return texto, "markdown"
    try:
        tipo = _detectar_tipo(pdf_path)
        if tipo == "tabular":
            texto = _extrair_tabelas(pdf_path)
        else:
            texto = _extrair_texto(pdf_path)
        logger.info("PDF extraído: tipo=%s, chars=%d", tipo, len(texto))
        return texto, tipo
    except pdfplumber.pdfminer.pdfparser.PDFSyntaxError:
        logger.error("PDF corrompido: %s", pdf_path.name)
        return "", "erro"
    except Exception as exc:
        logger.error("Erro ao extrair PDF %s: %s", pdf_path.name, exc)
        return "", "erro"


def calcular_hash_pdf(pdf_path: Path) -> str:
    return _hash_arquivo(pdf_path)


if __name__ == "__main__":
    import asyncio
    logging.basicConfig(level=logging.INFO)

    # Simula com arquivo local se existir, senão apenas testa lógica de cache
    test_path = PDF_CACHE_DIR / "test_mock.pdf"
    if not test_path.exists():
        logger.info("Nenhum PDF local para teste — verificando URLs registradas")
        for key, url in _PDF_URLS.items():
            status = "disponível" if url else "sem PDF"
            print(f"  {key}: {status}")
    else:
        texto, tipo = extrair_texto_pdf(test_path)
        print(f"Tipo: {tipo}")
        print(f"Primeiros 500 chars:\n{texto[:500]}")
