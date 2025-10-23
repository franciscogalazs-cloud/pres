// Diccionario de sinónimos y normalizaciones para obras

export const SYNONYMS: Array<[string, string[]]> = [
  // radier / losa delgada
  ['radier', ['losa delgada', 'radiel', 'radier h-25', 'radier h25', 'radier 10 cm']],
  // techumbre / cubierta zinc
  ['zinc acanalado', ['cubierta zinc', 'plancha zinc', 'zinc 0,35', 'zinc ondulado']],
  // yeso carton
  ['yeso cartón', ['yesocarton', 'yeso-carton', 'drywall', 'volcanita']],
  // pvc desagüe
  ['pvc desagüe', ['pvc alcantarillado', 'pvc sanitario', 'pvc 110']],
  // ppr agua
  ['ppr agua', ['ppr agua fría', 'ppr agua caliente', 'ppr']],
  // puerta exterior
  ['puerta exterior', ['puerta principal']],
  // herrajes
  ['herrajes', ['bisagras', 'picaportes', 'cerraduras']],
  // aislación
  ['aislación', ['aislante', 'lana de vidrio', 'lana']],
  // dren de infiltración
  ['dren infiltración', ['dren de infiltracion', 'drenaje infiltracion']],
];

export function applySynonyms(text: string): string {
  let out = String(text || '');
  for (const [canon, alts] of SYNONYMS) {
    for (const alt of alts) {
      const re = new RegExp(`\\b${alt.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'gi');
      out = out.replace(re, canon);
    }
  }
  return out;
}
