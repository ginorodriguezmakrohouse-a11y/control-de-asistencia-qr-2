/**
 * Utilidades para las URLs de fotos/avatares de colaboradores.
 *
 * Motivo: ciertas URL de hosts como 1024terabox.com / terabox.app NO son
 * imágenes directas — son páginas HTML de "compartir archivo" que además
 * exigen verificación humana ("need verify", errno 400141) y bloquean el
 * hotlinking. Un <img> apuntando a esas URLs nunca carga.
 *
 * Este módulo normaliza la URL (convirtiendo enlaces conocidos de Terabox
 * en su variante de descarga directa cuando es posible), detecta si el
 * origen es una URL no válida y permite reintentar con un avatar generado
 * localmente (iniciales) como respaldo, sin dependencias externas.
 */

const FALLBACK_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

/** Convierte enlaces de Terabox en la URL de descarga directa conocida (si aplica). */
export function normalizeAvatarUrl(raw?: string | null): string {
  const url = (raw ?? '').trim();
  if (!url) return '';

  // 1024terabox.com/s/<id>, terabox.app/s/<id>, 1024tera.com, freeterabox, etc.
  const teraboxShare = url.match(
    /^https?:\/\/(?:www\.)?(?:1024terabox|1024tera|teraboxapp|terabox|freeterabox|mshare)\.(?:com|app|link|fun|win|net)\/s\/([A-Za-z0-9_-]+)/i,
  );
  if (teraboxShare) {
    const id = teraboxShare[1];
    // Variante de descarga directa que Terabox expone bajo d.terabox.app.
    // Nota: puede seguir requiriendo cookies; por eso el componente
    // conserva el respaldo a avatar local si esta URL tampoco carga.
    return `https://d.terabox.app/sharing/link?surl=${encodeURIComponent(id.replace(/^1/, ''))}`;
  }

  return url;
}

/** true si la URL apunta a un host de enlaces-compartidos que no sirve como imagen directa. */
export function isNonDirectImageUrl(url?: string | null): boolean {
  const u = (url ?? '').toLowerCase();
  if (!u) return false;
  return /(terabox|1024tera|mega\.nz|drive\.google\.com\/file|dropbox\.com\/s\/)/.test(u) && !/^https?:\/\/d\./.test(u);
}

/** Genera un data-URL SVG con las iniciales del colaborador (respaldo local). */
export function initialsAvatarDataUrl(name: string): string {
  const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
  const initials = ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  const color = FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
    `<rect width="200" height="200" fill="${color}" opacity="0.18"/>` +
    `<circle cx="100" cy="100" r="72" fill="${color}"/>` +
    `<text x="100" y="100" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${initials}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
