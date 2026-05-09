export function parseExpirationToSeconds(exp: string): number {
  const match = exp.trim().match(/^(\d+)([smhd]?)$/i);
  if (!match) {
    throw new Error(
      `Formato inválido para expiración: "${exp}". Usa ej: 15m, 2h, 7d`,
    );
  }

  const value = Number(match[1]);
  const unit = (match[2] || 's').toLowerCase(); // default segundos si no hay unidad

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error(`Unidad desconocida: ${unit}`);
  }
}
