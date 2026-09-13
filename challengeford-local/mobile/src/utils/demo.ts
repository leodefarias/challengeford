export const DEMO_EMAIL = 'analista@ford.com.br';
export const DEMO_PASSWORD = 'Ford@2025';

export function isDemoMode(): boolean {
  if (process.env.EXPO_PUBLIC_DEMO === '1') return true;
  if (typeof window !== 'undefined') {
    try {
      return new URLSearchParams(window.location.search).get('demo') === '1';
    } catch {
      return false;
    }
  }
  return false;
}
