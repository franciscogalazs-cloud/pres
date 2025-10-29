import { describe, it, expect } from 'vitest';
import { unitCost, unitCostBySection } from '../src/utils/calculations';

// Recursos mock
const resources = {
  mat: { id: 'mat', tipo: 'material', nombre: 'Material X', unidad: 'u', precio: 1000 },
  mo:  { id: 'mo',  tipo: 'mano_obra', nombre: 'Mano de Obra', unidad: 'jornal', precio: 500 },
  eq:  { id: 'eq',  tipo: 'equipo', nombre: 'Equipo', unidad: 'hora', precio: 2000 },
  sv:  { id: 'sv',  tipo: 'servicio', nombre: 'Servicio', unidad: 'u', precio: 300 },
} as const;

describe('unitCost (items coef/rendimiento)', () => {
  it('suma coef con merma y rendimiento', () => {
    const apu = {
      id: 'apu1',
      items: [
        { tipo: 'coef', resourceId: 'mat', coef: 2, merma: 0.05 }, // 2 * 1000 * 1.05 = 2100
        { tipo: 'rendimiento', resourceId: 'mo', rendimiento: 10 }, // 500 / 10 = 50
      ],
    };
    const res = unitCost(apu as any, resources as any);
    expect(Math.round(res.unit)).toBe(2150);
    expect(res.desglose.length).toBe(2);
  });
});

describe('unitCostBySection (por tipo de recurso)', () => {
  it('asigna costos a materiales/mano_obra/equipos/varios', () => {
    const apu = {
      id: 'apu2',
      items: [
        { tipo: 'coef', resourceId: 'mat', coef: 1 },     // 1000 -> materiales
        { tipo: 'coef', resourceId: 'mo', coef: 0.1 },    // 50   -> mano_obra
        { tipo: 'coef', resourceId: 'eq', coef: 0.01 },   // 20   -> equipos
        { tipo: 'coef', resourceId: 'sv', coef: 2 },      // 600  -> varios (servicio)
      ],
    };
    const by = unitCostBySection(apu as any, resources as any);
    expect(by.materiales).toBe(1000);
    expect(by.manoObra).toBe(50);
    expect(by.equipos).toBe(20);
    expect(by.varios).toBe(600);
    const total = unitCost(apu as any, resources as any).unit;
    expect(by.materiales + by.manoObra + by.equipos + by.varios).toBe(total);
  });
});

describe('Preferencia por secciones sobre items', () => {
  it('cuando hay filas en secciones, ignora items legacy', () => {
    const apu = {
      id: 'apu3',
      secciones: {
        materiales: [ { descripcion: 'mat', unidad: 'u', cantidad: 2, pu: 100 } ], // 200
        manoObra:   [ { descripcion: 'mo',  unidad: 'j', cantidad: 1, pu: 50 } ],   // 50
        equipos:    [],
        varios:     [],
        extras:     [ { title: 'obs', rows: [ { descripcion: 'nota', unidad: 'u', cantidad: 1, pu: 25 } ] } ], // 25 a varios
        // sección heredada no estándar
        anotaciones: [ { descripcion: 'ajuste', unidad: 'u', cantidad: 1, pu: 10 } ], // 10 a varios
      },
      items: [
        { tipo: 'coef', resourceId: 'mat', coef: 10 }, // debería ignorarse si hay secciones
      ],
    };
    const res = unitCost(apu as any, resources as any);
    expect(res.unit).toBe(285); // 200 + 50 + 25 + 10
    const by = unitCostBySection(apu as any, resources as any);
    expect(by.materiales).toBe(200);
    expect(by.manoObra).toBe(50);
    expect(by.equipos).toBe(0);
    expect(by.varios).toBe(35); // 25 + 10
  });
});
