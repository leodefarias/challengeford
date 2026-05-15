export function sanitizeInput(raw: string, maxLength = 500): string {
  return raw
    .replace(/[<>]/g, '')
    .replace(/['";]/g, '')
    .trim()
    .slice(0, maxLength);
}
