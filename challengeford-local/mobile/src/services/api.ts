import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const safeMessages: Record<number, string> = {
      400: 'Requisição inválida.',
      401: 'Sessão expirada. Faça login novamente.',
      403: 'Acesso negado.',
      404: 'Recurso não encontrado.',
      500: 'Erro interno. Tente novamente mais tarde.',
    };
    const msg = safeMessages[status] ?? 'Erro de comunicação.';
    return Promise.reject(new Error(msg));
  }
);

export async function login(email: string, senha: string) {
  const res = await api.post('/api/auth/login', { email, senha });
  await SecureStore.setItemAsync('jwt_token', res.data.token);
  if (res.data.nome) {
    await SecureStore.setItemAsync('user_name', res.data.nome);
    await SecureStore.setItemAsync('user_role', res.data.role ?? 'viewer');
  }
  return res.data;
}

export async function logout() {
  await SecureStore.deleteItemAsync('jwt_token');
}

export async function getCatalogos() {
  const res = await api.get('/api/catalogos');
  return res.data;
}

export async function getCatalogo(id: number) {
  const res = await api.get(`/api/catalogos/${id}`);
  return res.data;
}

const VALID_CATALOG_IDS = [1, 2, 3, 4, 5, 6] as const;

export async function comparar(ids: number[]) {
  const safeIds = ids.filter((id) => (VALID_CATALOG_IDS as readonly number[]).includes(id));
  if (safeIds.length === 0) throw new Error('IDs inválidos.');
  const res = await api.post('/api/catalogos/comparar', { ids: safeIds });
  return res.data;
}

export async function getRanking() {
  const res = await api.get('/api/catalogos/ranking');
  return res.data;
}

export async function chat(message: string) {
  const res = await api.post('/api/chat', { pergunta: message });
  return res.data;
}

export default api;
