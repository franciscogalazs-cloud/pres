import { describe, it, expect } from 'vitest';
import { normUnit } from '../src/utils/formatters';

describe('normUnit', () => {
  it('convierte superíndices reales a forma plana', () => {
    expect(normUnit('m²')).toBe('m2');
    expect(normUnit('m³')).toBe('m3');
  });
  it('convierte símbolos especiales ㎡/㎥ a forma plana', () => {
    expect(normUnit('㎡')).toBe('m2');
    expect(normUnit('㎥')).toBe('m3');
  });
  it('acepta notación con ^2/^3 y espacios', () => {
    expect(normUnit('m^2')).toBe('m2');
    expect(normUnit('m ^ 3')).toBe('m3');
  });
  it('es robusto ante mayúsculas/minúsculas y espacios', () => {
    expect(normUnit(' M² ')).toBe('m2');
  });
});
