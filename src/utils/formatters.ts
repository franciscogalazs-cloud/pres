// ====== Utilidades de formateo ======

export const fmt = (n: number): string => {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0
  }).format(n || 0);
};

export const normUnit = (u: string): string => {
  return u.replace("²", "2").replace("³", "3").toLowerCase();
};

export const clamp0 = (x: number): number => {
  return Math.max(0, x || 0);
};

export const uid = (): string => {
  return Math.random().toString(36).slice(2);
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