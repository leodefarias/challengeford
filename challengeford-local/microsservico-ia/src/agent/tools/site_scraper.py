from __future__ import annotations

import asyncio
import logging
import re
from datetime import date
from pathlib import Path

import httpx

from config import CF_ACCOUNT_ID, CF_API_TOKEN, FIRECRAWL_API_KEY, HTML_CACHE_DIR

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,*/*",
}

# iCarros: fonte universal BR, acessível sem bloqueio, specs completos
_ICARROS_URLS: dict[str, str] = {
    "ford":       "https://www.icarros.com.br/ford/ranger/ficha-tecnica",
    "toyota":     "https://www.icarros.com.br/toyota/hilux/ficha-tecnica",
    "vw":         "https://www.icarros.com.br/volkswagen/amarok/ficha-tecnica",
    "chevrolet":  "https://www.icarros.com.br/chevrolet/s10/ficha-tecnica",
    "mitsubishi": "https://www.icarros.com.br/mitsubishi/nova-triton/ficha-tecnica",
    "nissan":     "https://www.icarros.com.br/nissan/frontier/ficha-tecnica",
}

# Site oficial Mitsubishi: httpx funciona, dados ricos incluindo Nova Triton
_MITSUBISHI_URL = "https://www.mitsubishimotors.com.br/picapes/nova-triton/"

# Sites/PDFs oficiais — acessados via Firecrawl (Playwright como fallback)
# URLs verificadas em maio/2026
_OFICIAL_URLS: dict[str, str] = {
    # Ford: PDF da ficha técnica acessível via Firecrawl (tem todos os atributos)
    "ford":      "https://www.ford.com.br/content/dam/Ford/website-assets/latam/br/nameplate/2025/ranger-raptor/pdf/fbr-ranger-raptor-ficha-tecnica.pdf",
    "toyota":    "https://www.toyota.com.br/modelos/hilux/versoes/",
    "chevrolet": "https://www.chevrolet.com.br/picapes/s10",
    # Nissan: versoes.html tem specs completas (29k chars, todos os atributos)
    "nissan":    "https://www.nissan.com.br/veiculos/modelos/frontier/versoes.html",
    "vw":        "https://www.vw.com.br/pt/carros/amarok.html",
    # Mitsubishi: página de versões com JS — mostra specs específicas por versão (HPE-S, etc.)
    # O site httpx-only captura GL MT (versão básica) por padrão; Firecrawl/CF renderizam JS
    "mitsubishi": "https://www.mitsubishimotors.com.br/picapes/nova-triton/",
}


class ScraperBloqueadoError(Exception):
    pass


def _cache_path(marca: str, modelo: str, versao: str, fonte: str) -> Path:
    HTML_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    nome = f"{marca}_{modelo}_{versao}_{fonte}_{date.today().isoformat()}.html".replace(" ", "_").lower()
    return HTML_CACHE_DIR / nome


def _cache_valido(path: Path) -> bool:
    return path.exists()


def _limpar_html(html: str) -> str:
    texto = re.sub(r"<script[^>]*>.*?</script>", " ", html, flags=re.DOTALL)
    texto = re.sub(r"<style[^>]*>.*?</style>", " ", texto, flags=re.DOTALL)
    texto = re.sub(r"<[^>]+>", " ", texto)
    texto = re.sub(r"&[a-z]+;", " ", texto)
    texto = re.sub(r"\s+", " ", texto)
    return texto.strip()


def _extrair_bloco_specs(texto: str, marca: str, versao: str) -> str:
    """Extrai o trecho mais relevante de specs do texto limpo."""
    marcadores = [
        "ficha técnica", "especificações", "motorização", "motor",
        "potência", "torque", "câmbio", "tração", "dimensões",
    ]

    melhor_idx = -1
    for marcador in marcadores:
        idx = texto.lower().find(marcador)
        if idx > 0:
            melhor_idx = idx if melhor_idx < 0 else min(melhor_idx, idx)

    if melhor_idx > 0:
        return texto[max(0, melhor_idx - 200): melhor_idx + 8000]
    return texto[:8000]


async def _fetch_httpx(url: str) -> str:
    async with httpx.AsyncClient(headers=_HEADERS, follow_redirects=True, timeout=20) as client:
        r = await client.get(url)
        if r.status_code == 403:
            raise ScraperBloqueadoError(f"403 Forbidden: {url}")
        if r.status_code >= 400:
            logger.warning("HTTP %d para %s", r.status_code, url)
        return r.text


_FIRECRAWL_SEMAPHORE = asyncio.Semaphore(2)
_CF_SEMAPHORE = asyncio.Semaphore(3)


async def _fetch_cloudflare(url: str) -> str:
    """
    Fetch via Cloudflare Browser Rendering API (/scrape endpoint).
    Renderiza JS no browser headless da Cloudflare — mais barato que Firecrawl.
    Requer CF_ACCOUNT_ID e CF_API_TOKEN no .env com permissão Browser Rendering.
    """
    if not (CF_ACCOUNT_ID and CF_API_TOKEN):
        raise RuntimeError("CF_ACCOUNT_ID / CF_API_TOKEN não configurados")

    cf_url = f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT_ID}/browser-rendering/scrape"
    headers = {
        "Authorization": f"Bearer {CF_API_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "url": url,
        "elements": [{"selector": "body"}],
    }

    async with _CF_SEMAPHORE:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(cf_url, json=payload, headers=headers)
            if r.status_code == 401:
                raise RuntimeError("Cloudflare: token inválido ou sem permissão Browser Rendering")
            if r.status_code == 429:
                raise ScraperBloqueadoError(f"Cloudflare: rate limit para {url}")
            if r.status_code >= 400:
                raise ScraperBloqueadoError(f"Cloudflare Browser Rendering erro {r.status_code}: {url}")
            data = r.json()
            if not data.get("success"):
                raise ScraperBloqueadoError(f"Cloudflare: resposta sem sucesso para {url}")
            # Extrai texto de todos os elementos retornados
            partes: list[str] = []
            for elem in data.get("result", []):
                for res in elem.get("results", []):
                    texto_elem = res.get("text", "").strip()
                    if texto_elem:
                        partes.append(texto_elem)
            texto = "\n".join(partes)
            if not texto:
                raise ScraperBloqueadoError(f"Cloudflare: sem texto para {url}")
            if any(p in texto.lower() for p in ["captcha", "robot", "verify you are human"]):
                raise ScraperBloqueadoError(f"CAPTCHA via Cloudflare em {url}")
            logger.info("Cloudflare /scrape OK: %d chars de %s", len(texto), url)
            return texto


async def _fetch_firecrawl(url: str) -> str:
    """Fetch via Firecrawl API — retorna markdown limpo do conteúdo renderizado."""
    if not FIRECRAWL_API_KEY:
        raise RuntimeError("FIRECRAWL_API_KEY não configurado")

    def _sync_scrape() -> str:
        from firecrawl import FirecrawlApp
        app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)
        result = app.scrape(url, formats=["markdown"], only_main_content=False)
        markdown = getattr(result, "markdown", None) or (result.get("markdown") if isinstance(result, dict) else None)
        if not markdown:
            raise ScraperBloqueadoError(f"Firecrawl sem conteúdo para {url}")
        if any(p in markdown.lower() for p in ["captcha", "robot", "verify you are human"]):
            raise ScraperBloqueadoError(f"CAPTCHA via Firecrawl em {url}")
        return markdown

    async with _FIRECRAWL_SEMAPHORE:
        return await asyncio.to_thread(_sync_scrape)


async def _fetch_playwright(url: str, seletor: str = "body") -> str:
    import random
    from playwright.async_api import async_playwright, TimeoutError as PwTimeout

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=_HEADERS["User-Agent"],
            locale="pt-BR",
            timezone_id="America/Sao_Paulo",
            viewport={"width": 1440, "height": 900},
            java_script_enabled=True,
        )
        # Oculta webdriver flag (anti-detecção básica)
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()
        try:
            response = await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            if response and response.status == 403:
                raise ScraperBloqueadoError(f"403 Forbidden: {url}")
            # Scroll gradual para disparar lazy loading
            await page.evaluate("""
                async () => {
                    await new Promise(resolve => {
                        let total = document.body.scrollHeight;
                        let current = 0;
                        const step = Math.max(300, total / 10);
                        const timer = setInterval(() => {
                            window.scrollBy(0, step);
                            current += step;
                            if (current >= total) { clearInterval(timer); resolve(); }
                        }, 300);
                        setTimeout(resolve, 8000);
                    });
                }
            """)
            await asyncio.sleep(random.uniform(2.0, 3.5))
            try:
                await page.wait_for_selector(seletor, timeout=10_000)
            except PwTimeout:
                pass
            conteudo = await page.inner_text("body")
            if any(p in conteudo.lower() for p in ["captcha", "robot", "verify you are human"]):
                raise ScraperBloqueadoError(f"CAPTCHA em {url}")
            return conteudo
        finally:
            await browser.close()


async def _scrape_icarros(marca: str, modelo: str, versao: str) -> dict | None:
    url = _ICARROS_URLS.get(marca.lower())
    if not url:
        return None

    cache = _cache_path(marca, modelo, versao, "icarros")
    if _cache_valido(cache):
        logger.info("iCarros cache hit: %s", cache.name)
        texto = cache.read_text(encoding="utf-8")
    else:
        logger.info("iCarros scraping: %s", url)
        try:
            html = await _fetch_httpx(url)
            texto = _limpar_html(html)
            cache.write_text(texto, encoding="utf-8")
            logger.info("iCarros salvo: %d chars", len(texto))
        except ScraperBloqueadoError:
            raise
        except Exception as exc:
            logger.error("iCarros erro %s: %s", marca, exc)
            return None

    bloco = _extrair_bloco_specs(texto, marca, versao)
    return {
        "texto_estruturado": bloco,
        "fonte": url,
        "mercado_br": True,
        "tipo_fonte": "review_br",
    }


async def _scrape_mitsubishi_oficial() -> dict | None:
    """Site oficial Mitsubishi funciona com httpx — dados da Nova Triton."""
    cache = _cache_path("mitsubishi", "triton", "hpes", "oficial")
    if _cache_valido(cache):
        texto = cache.read_text(encoding="utf-8")
    else:
        logger.info("Scraping Mitsubishi oficial: %s", _MITSUBISHI_URL)
        try:
            html = await _fetch_httpx(_MITSUBISHI_URL)
            texto = _limpar_html(html)
            cache.write_text(texto, encoding="utf-8")
        except Exception as exc:
            logger.warning("Mitsubishi oficial erro: %s", exc)
            return None

    bloco = _extrair_bloco_specs(texto, "mitsubishi", "HPE-S")
    return {
        "texto_estruturado": bloco,
        "fonte": _MITSUBISHI_URL,
        "mercado_br": True,
        "tipo_fonte": "site_oficial",
    }


_SPEC_KEYWORDS = ("potência", "torque", "cilindrada", "tração", "cambio", "câmbio")


def _conteudo_suficiente(texto: str) -> bool:
    return len(texto) >= 5000 and any(k in texto.lower() for k in _SPEC_KEYWORDS)


async def _scrape_oficial_js(marca: str, modelo: str, versao: str) -> dict | None:
    """
    Tenta obter dados do site oficial JS-rendered.
    Hierarquia: Playwright (gratuito) → Cloudflare → Firecrawl.
    """
    url = _OFICIAL_URLS.get(marca.lower())
    if not url:
        return None

    cache = _cache_path(marca, modelo, versao, "oficial_js")

    if _cache_valido(cache):
        logger.info("Oficial JS cache hit: %s", cache.name)
        texto = cache.read_text(encoding="utf-8")
        bloco = _extrair_bloco_specs(texto, marca, versao)
        return {
            "texto_estruturado": bloco,
            "fonte": url,
            "mercado_br": True,
            "tipo_fonte": "site_oficial",
        }

    # 1. Playwright — gratuito, renderiza SPAs completamente
    logger.info("%s: tentando Playwright em %s", marca, url)
    try:
        texto = await _fetch_playwright(url)
        if _conteudo_suficiente(texto):
            cache.write_text(texto, encoding="utf-8")
            bloco = _extrair_bloco_specs(texto, marca, versao)
            logger.info("%s: Playwright OK (%d chars)", marca, len(texto))
            return {
                "texto_estruturado": bloco,
                "fonte": url,
                "mercado_br": True,
                "tipo_fonte": "site_oficial",
            }
        logger.warning("%s: Playwright conteúdo insuficiente (%d chars)", marca, len(texto))
    except ScraperBloqueadoError as exc:
        logger.warning("Playwright bloqueado para %s: %s", marca, exc)
    except Exception as exc:
        logger.warning("Playwright erro %s: %s", marca, exc)

    # 2. Cloudflare Browser Rendering — fallback pago, sem overhead de API externa
    if CF_ACCOUNT_ID and CF_API_TOKEN:
        logger.info("%s: tentando Cloudflare Browser Rendering em %s", marca, url)
        try:
            texto = await _fetch_cloudflare(url)
            if not _conteudo_suficiente(texto):
                raise ScraperBloqueadoError(
                    f"Cloudflare: conteúdo insuficiente ({len(texto)} chars)"
                )
            cache.write_text(texto, encoding="utf-8")
            bloco = _extrair_bloco_specs(texto, marca, versao)
            logger.info("%s: Cloudflare OK (%d chars)", marca, len(texto))
            return {
                "texto_estruturado": bloco,
                "fonte": url,
                "mercado_br": True,
                "tipo_fonte": "site_oficial",
            }
        except ScraperBloqueadoError as exc:
            logger.warning("Cloudflare insuficiente para %s: %s", marca, exc)
        except RuntimeError:
            pass  # credenciais não configuradas
        except Exception as exc:
            logger.warning("Cloudflare erro %s: %s", marca, exc)

    # 3. Firecrawl — último recurso
    if FIRECRAWL_API_KEY:
        logger.info("%s: tentando Firecrawl em %s", marca, url)
        try:
            texto = await _fetch_firecrawl(url)
            cache.write_text(texto, encoding="utf-8")
            bloco = _extrair_bloco_specs(texto, marca, versao)
            logger.info("%s: Firecrawl OK (%d chars)", marca, len(texto))
            return {
                "texto_estruturado": bloco,
                "fonte": url,
                "mercado_br": True,
                "tipo_fonte": "site_oficial",
            }
        except ScraperBloqueadoError as exc:
            logger.warning("Firecrawl bloqueado para %s: %s", marca, exc)
        except Exception as exc:
            logger.warning("Firecrawl erro %s: %s", marca, exc)

    return None


async def scrape(marca: str, modelo: str, versao: str) -> dict | None:
    """
    Hierarquia de coleta:
    1. iCarros (httpx, 200 OK para todos os 6 modelos)
    2. Site oficial JS-rendered: Playwright → Cloudflare → Firecrawl
    Nota: o bypass httpx para Mitsubishi foi removido pois capturava apenas a versão GL MT
    por padrão (sem JS). iCarros e o fallback JS-rendered são mais precisos para HPE-S.
    """
    # iCarros como fonte primária universal
    try:
        resultado = await _scrape_icarros(marca, modelo, versao)
        if resultado and len(resultado.get("texto_estruturado", "")) > 200:
            logger.info("%s: iCarros OK (%d chars)", marca, len(resultado["texto_estruturado"]))
            return resultado
    except ScraperBloqueadoError as exc:
        logger.warning("iCarros bloqueado para %s: %s", marca, exc)

    # Fallback: site oficial JS-rendered (Playwright → Cloudflare → Firecrawl)
    return await _scrape_oficial_js(marca, modelo, versao)


if __name__ == "__main__":
    import json
    logging.basicConfig(level=logging.INFO)

    async def _test():
        print("=== Testando scraper: Ford Ranger Raptor (iCarros) ===")
        r = await scrape("ford", "Ranger", "Raptor")
        if r:
            print(f"Fonte: {r['fonte']}")
            print(f"Chars: {len(r['texto_estruturado'])}")
            print(f"Preview:\n{r['texto_estruturado'][:1500]}")
        else:
            print("Sem resultado")

        print("\n=== Testando scraper: Nissan Frontier PRO-4X ===")
        r2 = await scrape("nissan", "Frontier", "PRO-4X")
        if r2:
            print(f"Fonte: {r2['fonte']}")
            print(f"Preview:\n{r2['texto_estruturado'][:1000]}")
        else:
            print("Sem resultado")

    asyncio.run(_test())
