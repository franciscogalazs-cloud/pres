// Utilidades de matching/similitud y limpieza para APUs

export type Trigram = string;

export const removeDiacritics = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const tokenize = (s: string): string[] => removeDiacritics(s).split(/[^a-z0-9]+/).filter(Boolean);

export const trigrams = (s: string): Trigram[] => {
  const str = `  ${removeDiacritics(s)}  `; // padding para bordes
  const arr: Trigram[] = [];
  for (let i = 0; i < str.length - 2; i++) arr.push(str.slice(i, i + 3));
  return arr;
};

export const trigramJaccard = (a: string, b: string): number => {
  const A = new Set(trigrams(a));
  const B = new Set(trigrams(b));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union > 0 ? inter / union : 0;
};

export const jaccardTokens = (a: string, b: string): number => {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter || 1);
};

export const similarityScore = (a: string, b: string): number => {
  // Combinación robusta: Jaccard de trigramas + tokens + bonus por prefijo/contención
  const t = trigramJaccard(a, b);
  const j = jaccardTokens(a, b);
  const an = removeDiacritics(a); const bn = removeDiacritics(b);
  const incl = (bn.includes(an) || an.includes(bn)) ? 0.1 : 0;
  const pref = (an && bn.startsWith(an)) || (bn && an.startsWith(bn)) ? 0.05 : 0;
  return 0.6 * t + 0.4 * j + incl + pref; // ~0..1.15
};

export const normalizeUnitCanonical = (u: string): string => {
  const n = removeDiacritics(u);
  if (n === 'm2' || n.startsWith('m2')) return 'm2';
  if (n === 'm3' || n.startsWith('m3')) return 'm3';
  if (n === 'ml' || n === 'm' || n === 'metro lineal') return 'ml';
  if (n === 'kg') return 'kg';
  if (['u','un','und','unidad','unid','un.'].includes(n)) return 'u';
  if (['gl','lote','kit','set'].includes(n)) return 'gl';
  return n || '';
};

export type ApuLike = { id: string; descripcion: string; unidadSalida?: string; secciones?: any; items?: any[] };

export const isApuIncomplete = (apu: ApuLike): boolean => {
  return isApuIncompleteDetail(apu).incomplete;
};

export function isApuIncompleteDetail(apu: ApuLike): { incomplete: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!apu) return { incomplete: true, reasons: ['APU inexistente'] };
  const unit = String((apu as any).unidadSalida || '').trim();
  if (!unit) reasons.push('sin unidad');
  const s = (apu as any).secciones || {};
  const arr = [s.materiales, s.manoObra, s.equipos, s.varios].filter(Boolean);
  const rows = arr.flat().filter(Boolean) as Array<{ pu?: number; cantidad?: number }>;
  const hasRows = rows.length > 0;
  if (!hasRows && !Array.isArray((apu as any).items)) reasons.push('sin secciones/items');
  const anyPU = rows.some(r => Number(r?.pu || 0) > 0);
  if (hasRows && !anyPU) reasons.push('PU=0 en todas las filas');
  // Si existen items legacy se considera potencialmente completo (se calculará por recursos), salvo que no haya unidad
  const hasItems = Array.isArray((apu as any).items) && (apu as any).items.length > 0;
  const incomplete = reasons.length > 0 && !hasItems;
  return { incomplete, reasons };
}

export function groupSimilarApus(apus: ApuLike[], opts?: { threshold?: number; sameUnit?: boolean }) {
  const th = opts?.threshold ?? 0.42; // umbral conservador
  const sameUnit = opts?.sameUnit ?? true;
  const groups: Array<{ key: string; unit: string; ids: string[]; labels: string[] }> = [];

  const used = new Set<string>();
  for (let i = 0; i < apus.length; i++) {
    const a = apus[i]; if (!a || used.has(a.id)) continue;
    const unitA = normalizeUnitCanonical(String(a.unidadSalida || ''));
    const bucket: string[] = [a.id];
    const labels: string[] = [a.descripcion];
    for (let j = i + 1; j < apus.length; j++) {
      const b = apus[j]; if (!b || used.has(b.id)) continue;
      const unitB = normalizeUnitCanonical(String(b.unidadSalida || ''));
      if (sameUnit && unitA && unitB && unitA !== unitB) continue;
      const sim = similarityScore(a.descripcion, b.descripcion);
      if (sim >= th) {
        bucket.push(b.id); labels.push(b.descripcion);
        used.add(b.id);
      }
    }
    if (bucket.length > 1) {
      groups.push({ key: a.id, unit: unitA, ids: bucket, labels });
      bucket.forEach(id => used.add(id));
    }
  }
  return groups;
}

// Alias map helpers (para fusiones): { oldId -> canonicalId }
export type AliasMap = Record<string, string>;
export const readAliasMap = (): AliasMap => {
  try { return JSON.parse(localStorage.getItem('apu-aliases') || '{}') || {}; } catch { return {}; }
};
export const writeAliasMap = (m: AliasMap) => {
  try { localStorage.setItem('apu-aliases', JSON.stringify(m || {})); } catch {}
};
