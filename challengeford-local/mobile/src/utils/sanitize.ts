export function sanitizeInput(raw: string, maxLength = 500): string {
  return raw
    .replace(/[<>]/g, '')
    .replace(/['";]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\bxp_/gi, '')
    .replace(/\b(DROP|INSERT|UPDATE|DELETE|SELECT|UNION|EXEC|CAST|DECLARE)\b/gi, '')
    .trim()
    .slice(0, maxLength);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}
