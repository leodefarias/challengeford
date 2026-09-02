import axios from 'axios';
import { getItem, setItem, deleteItem } from '../utils/storage';
import { navigationRef } from '../navigation/navigationRef';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  try {
    const token = await getItem('jwt_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (_) {}
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    if (__DEV__) console.error('[API]', error?.config?.url, status, error?.message);
    if (status === 401 && error?.config?.url !== '/api/auth/login') {
      try { await deleteItem('jwt_token'); } catch (_) {}
      if (navigationRef.isReady()) {
        navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
    const safeMessages: Record<number, string> = {
      400: 'Requisição inválida.',
      401: 'Credenciais inválidas.',
      403: 'Acesso negado.',
      404: 'Recurso não encontrado.',
      500: 'Erro interno. Tente novamente mais tarde.',
    };
    const msg = safeMessages[status] ?? `Erro de comunicação. (${error?.message ?? 'sem resposta'})`;
    return Promise.reject(new Error(msg));
  }
);

// ── Types ──────────────────────────────────────────────────────────────────

export interface CatalogoResumo {
  id: number;
  marca: string;
  modelo: string;
  versao: string;
  anoModelo: number | null;
  segmento: string | null;
  status: string;
  coberturaPct: number | null;
  coberturaLivePct: number | null;
  scoreTecnico: number | null;
  scoreValor: number | null;
  dataExtracao: string | null;
}

export interface Atributo {
  atributo: string;
  valor: any;
  confianca: number;
  fontePrimaria: string | null;
  divergente: boolean;
  mercadoConfirmadoBr: boolean;
  schemaNivel: string;
}

export interface CapabilityScore {
  capability: string;
  nivel: number;
  nivelMaximoCluster: number;
  scoreBruto: number;
  scoreAjustado: number;
  liderMarca: string | null;
}

export interface CatalogoDetalhe extends CatalogoResumo {
  atributos: Atributo[];
  capabilities: CapabilityScore[];
}

export interface Comparativo {
  veiculos: string[];
  atributosComparados: string[];
  tabela: Record<string, Record<string, any>>;
  destaques: Record<string, string>;
}

export interface RankingBreakdown {
  valor: any;
  score_normalizado: number;
  peso: number;
  score_ponderado: number;
}

export interface RankingItem {
  veiculo: string;
  pontuacao_total: number;
  posicao: number;
  breakdown: Record<string, RankingBreakdown>;
}

export interface RankingResponse {
  perfil: string;
  criterios_aplicados: Record<string, number>;
  ranking: RankingItem[];
  justificativa: string | null;
}

export interface TermoPendente {
  id: number;
  termo: string;
  contexto: string | null;
  atributoSugerido: string | null;
  fonte: string | null;
  dataDetectado: string | null;
  status: string;
  revisadoPor: string | null;
  dataRevisao: string | null;
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function login(email: string, senha: string) {
  const res = await api.post('/api/auth/login', { email, senha });
  await setItem('jwt_token', res.data.token);
  if (res.data.nome) await setItem('user_name', res.data.nome);
  if (res.data.role) await setItem('user_role', res.data.role);
  return res.data;
}

export async function logout() {
  await deleteItem('jwt_token');
}

// ── Catálogos ─────────────────────────────────────────────────────────────

export async function getCatalogos(): Promise<CatalogoResumo[]> {
  const res = await api.get('/api/catalogos');
  return res.data;
}

export async function getCatalogo(id: number): Promise<CatalogoDetalhe> {
  const res = await api.get(`/api/catalogos/${id}`);
  return res.data;
}

export async function comparar(ids: number[]): Promise<Comparativo> {
  if (ids.length < 2) throw new Error('Selecione ao menos 2 veículos.');
  const res = await api.post('/api/catalogos/comparar', { catalogoIds: ids });
  return res.data;
}

export async function extrairCatalogo(
  marca: string,
  modelo: string,
  versao: string,
  forcarReprocessamento = true
): Promise<CatalogoDetalhe> {
  const res = await api.post('/api/catalogos/extrair', {
    marca,
    modelo,
    versao,
    forcarReprocessamento,
  });
  return res.data;
}

export async function getRanking(perfil?: string, ids?: number[]): Promise<RankingResponse> {
  const params: Record<string, any> = {};
  if (perfil) params.perfil = perfil;
  if (ids && ids.length > 0) params.ids = ids.join(',');
  const res = await api.get('/api/catalogos/ranking', { params });
  return res.data;
}

// ── Chat ──────────────────────────────────────────────────────────────────

export async function chat(message: string) {
  const res = await api.post('/api/chat', { pergunta: message });
  return res.data;
}

// ── Admin ─────────────────────────────────────────────────────────────────

export async function getTermosPendentes(status = 'pendente'): Promise<TermoPendente[]> {
  const res = await api.get('/api/admin/termos-pendentes', { params: { status } });
  return res.data;
}

export async function updateTermoPendente(id: number, status: string): Promise<TermoPendente> {
  const res = await api.patch(`/api/admin/termos-pendentes/${id}`, { status });
  return res.data;
}

export default api;
