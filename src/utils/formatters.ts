// ====== Utilidades de formateo ======

export const fmt = (n: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(n || 0);
};

export const normUnit = (u: string): string => {
  // Normaliza unidades con superíndices reales y variantes a forma plana antes de compararlas
  // Ejemplos: m² -> m2, m³ -> m3, ㎡ -> m2, ㎥ -> m3, m^2 -> m2, M^3 -> m3
  let s = String(u || '').trim();
  // Normalización Unicode de compatibilidad (convierte algunos símbolos a formas base cuando procede)
  try { s = s.normalize('NFKC'); } catch {}
  // Reemplazos explícitos de superíndices U+00B2/U+00B3
  s = s.replace(/²/g, '2').replace(/³/g, '3');
  // Símbolos cuadrados/cúbicos especiales (U+33A1, U+33A5)
  s = s.replace(/\u33A1/g, 'm2').replace(/\u33A5/g, 'm3');
  // Notación con circunflejo: permitir espacios alrededor de ^ y después de m
  s = s.replace(/m\s*\^\s*2/gi, 'm2').replace(/m\s*\^\s*3/gi, 'm3');
  // Quitar espacios y bajar a minúsculas
  s = s.replace(/\s+/g, '').toLowerCase();
  return s;
};

export const clamp0 = (x: number): number => {
  return Math.max(0, x || 0);
};

export const uid = (): string => {
  return Math.random().toString(36).slice(2);
};

// Normaliza a Unicode NFC para evitar textos con tildes rotas por copias/importaciones
export const toNFC = (s: string): string => {
  try { return String(s || '').normalize('NFC'); } catch { return String(s || ''); }
};

// Correcciones comunes de mojibake (UTF-8 mal interpretado como ISO-8859-1)
export const fixMojibake = (s: string): string => {
  const map: Record<string, string> = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú',
    'Ã±': 'ñ', 'Ã‘': 'Ñ', 'Ã¼': 'ü', 'Ãœ': 'Ü',
    'Â¿': '¿', 'Â¡': '¡', 'Âº': 'º', 'Âª': 'ª',
    'Ã€': 'À', 'Ã‰': 'É', 'Ãˆ': 'È', 'Ã‚': 'Â', 'â€“': '–', 'â€”': '—', 'â€˜': '‘', 'â€™': '’', 'â€œ': '“', 'â€': '”', 'â€¢': '•', 'â€¦': '…',
    'mÂ²': 'm²', 'mÂ³': 'm³'
  };
  let out = String(s || '');
  for (const [bad, good] of Object.entries(map)) out = out.replace(new RegExp(bad, 'g'), good);
  return toNFC(out);
};

// ====== Utilidades de cálculo ======

export const slopeFactor = (pct: number): number => {
  return Math.sqrt(1 + Math.pow((pct || 0) / 100, 2));
};

export const approx = (a: number, b: number, tol: number = 1e-2): boolean => {
  return Math.abs(a - b) <= tol;
};

// ====== Constantes ======

// kg/m por diámetro (aprox) => d^2/162
export const rebarKgPerM: Record<string, number> = {
  "6": 0.222,
  "8": 0.395,
  "10": 0.617,
  "12": 0.888,
  "16": 1.578,
  "20": 2.466,
};

// ====== Labels para UI ======

export const label2D = (p: string): string => {
  switch (p) {
    case 'rect': return 'Rectángulo';
    case 'tabique': return 'Tabique';
    case 'muro': return 'Muro';
    case 'muro_curvo': return 'Muro curvo';
    case 'pintura': return 'Pintura';
    case 'piso': return 'Piso/Cerámica';
    case 'cielo': return 'Cielo falso';
    case 'techumbre': return 'Techumbre';
    case 'fachada': return 'Revestimiento fachada';
    default: return p;
  }
};

export const label3D = (p: string): string => {
  switch (p) {
    case 'generico': return 'Genérico';
    case 'radier': return 'Radier';
    case 'losa': return 'Losa';
    case 'zanja': return 'Zanja';
    case 'relleno': return 'Relleno compactado';
    case 'zapata': return 'Zapata aislada';
    case 'zapata_corrida': return 'Zapata corrida';
    case 'viga': return 'Viga';
    case 'columna': return 'Columna';
    case 'escalera': return 'Escalera de hormigón';
    default: return p;
  }
};

export const label1D = (p: string): string => {
  switch (p) {
    case 'generico': return 'Genérico';
    case 'tuberia': return 'Tubería/trayecto';
    case 'perimetro': return 'Perímetro';
    case 'cerchas': return 'Cerchas por nave';
    case 'cumbrera': return 'Cumbrera por ml';
    default: return p;
  }
};

export const labelKg = (p: string): string => {
  switch (p) {
    case 'generico': return 'Genérico';
    case 'barras_rectas': return 'Barras rectas';
    case 'malla': return 'Malla electrosoldada';
    case 'estribos': return 'Estribos';
    default: return p;
  }
};