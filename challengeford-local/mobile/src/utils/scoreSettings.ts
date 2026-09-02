import { getItem, setItem } from './storage';

export const SCORE_SETTINGS_KEY = 'score_custom_criterios';

export interface WeightCategory {
  key: string;
  label: string;
  attributes: string[];
}

export const SCORE_CATEGORIES: WeightCategory[] = [
  { key: 'motorizacao', label: 'Motorização', attributes: ['potencia_cv', 'torque_nm'] },
  { key: 'seguranca', label: 'Segurança & ADAS', attributes: ['airbags_quantidade', 'frenagem_autonoma'] },
  { key: 'offroad', label: 'Off-Road', attributes: ['profundidade_vadeo_mm', 'angulo_ataque_graus', 'capacidade_reboque_kg'] },
  { key: 'conforto', label: 'Conforto & Conect.', attributes: ['tela_central_pol', 'carplay'] },
  { key: 'tracao', label: 'Transmissão & Tração', attributes: ['cambio_marchas', 'reducao'] },
  { key: 'preco', label: 'Preço', attributes: ['preco_tabela_brl'] },
  { key: 'dimensoes', label: 'Dimensões', attributes: ['capacidade_carga_kg'] },
];

export const DEFAULT_CATEGORY_WEIGHTS: Record<string, number> = {
  motorizacao: 40,
  seguranca: 20,
  offroad: 15,
  conforto: 10,
  tracao: 5,
  preco: 5,
  dimensoes: 5,
};

export function buildCriteriosFromWeights(weights: Record<string, number>): Record<string, number> {
  const criterios: Record<string, number> = {};
  for (const cat of SCORE_CATEGORIES) {
    const catWeight = weights[cat.key] ?? 0;
    if (catWeight <= 0 || cat.attributes.length === 0) continue;
    const perAttr = catWeight / cat.attributes.length;
    for (const attr of cat.attributes) {
      criterios[attr] = (criterios[attr] ?? 0) + perAttr;
    }
  }
  return criterios;
}

export async function saveCustomCriterios(criterios: Record<string, number>): Promise<void> {
  await setItem(SCORE_SETTINGS_KEY, JSON.stringify(criterios));
}

export async function loadCustomCriterios(): Promise<Record<string, number> | null> {
  const raw = await getItem(SCORE_SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return null;
  }
}

export async function clearCustomCriterios(): Promise<void> {
  await setItem(SCORE_SETTINGS_KEY, '');
}
