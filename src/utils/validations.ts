import { z } from 'zod';

// ====== Esquemas de validación ======

// Validación para recursos
export const ResourceSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  tipo: z.enum(['mano_obra', 'material', 'equipo', 'servicio']),
  nombre: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  unidad: z.string().min(1, 'Unidad es requerida').max(20, 'Unidad muy larga'),
  precio: z.number().min(0, 'Precio debe ser positivo').max(100000000, 'Precio muy alto')
});

// Validación para items APU
export const ApuItemCoefSchema = z.object({
  resourceId: z.string().min(1, 'ID de recurso requerido'),
  tipo: z.literal('coef'),
  coef: z.number().min(0, 'Coeficiente debe ser positivo').max(1000, 'Coeficiente muy alto'),
  merma: z.number().min(0, 'Merma debe ser positiva').max(1, 'Merma máxima 100%').optional()
});

export const ApuItemRendSchema = z.object({
  resourceId: z.string().min(1, 'ID de recurso requerido'),
  tipo: z.literal('rendimiento'),
  rendimiento: z.number().min(0.01, 'Rendimiento debe ser mayor a 0').max(10000, 'Rendimiento muy alto')
});

export const ApuItemSubApuSchema = z.object({
  tipo: z.literal('subapu'),
  apuRefId: z.string().min(1, 'ID de APU referenciado requerido'),
  coef: z.number().min(0, 'Coeficiente debe ser positivo').max(1000, 'Coeficiente muy alto').optional(),
  rendimiento: z.number().min(0.01, 'Rendimiento debe ser mayor a 0').max(10000, 'Rendimiento muy alto').optional()
}).refine(it => typeof it.coef === 'number' || typeof it.rendimiento === 'number', {
  message: 'Debe especificar coeficiente o rendimiento para el sub-APU'
});

export const ApuItemSchema = z.union([ApuItemCoefSchema, ApuItemRendSchema, ApuItemSubApuSchema]);

// Validación para APU
export const ApuSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  descripcion: z.string().min(5, 'Descripción muy corta').max(200, 'Descripción muy larga'),
  unidadSalida: z.string().min(1, 'Unidad es requerida').max(10, 'Unidad muy larga'),
  items: z.array(ApuItemSchema).min(1, 'Debe tener al menos un item')
});

// Validación para metrados
export const MetradoSchema = z.number()
  .min(0, 'Metrado debe ser positivo')
  .max(1000000, 'Metrado muy alto')
  .refine(val => !isNaN(val), 'Metrado debe ser un número válido');

// Validación para parámetros financieros
export const FinancialParamsSchema = z.object({
  gg: z.number().min(0, 'Gastos generales deben ser positivos').max(1, 'Máximo 100%'),
  util: z.number().min(0, 'Utilidad debe ser positiva').max(1, 'Máximo 100%'),
  iva: z.number().min(0, 'IVA debe ser positivo').max(1, 'Máximo 100%')
});

// Validación para calculadora de metrados
export const MetradoCalculatorSchema = z.object({
  cantidad: z.number().min(0, 'Cantidad debe ser positiva').max(10000, 'Cantidad muy alta'),
  largo: z.number().min(0, 'Largo debe ser positivo').max(1000, 'Largo muy grande'),
  ancho: z.number().min(0, 'Ancho debe ser positivo').max(1000, 'Ancho muy grande'),
  altura: z.number().min(0, 'Altura debe ser positiva').max(1000, 'Altura muy grande'),
  espesor: z.number().min(0.01, 'Espesor mínimo 1cm').max(10, 'Espesor muy grande'),
  // Más validaciones específicas pueden agregarse según necesidad
});

// Validación para plantillas
export const TemplateSchema = z.object({
  name: z.string().min(1, 'Nombre de plantilla requerido').max(50, 'Nombre muy largo'),
  items: z.array(z.object({
    apuId: z.string().min(1, 'APU ID requerido'),
    metrados: MetradoSchema
  })).min(1, 'Plantilla debe tener al menos una partida')
});

// ====== Funciones de validación ======

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: string[];
};

export function validateResource(data: unknown): ValidationResult<z.infer<typeof ResourceSchema>> {
  try {
    const result = ResourceSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

export function validateApu(data: unknown): ValidationResult<z.infer<typeof ApuSchema>> {
  try {
    const result = ApuSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

export function validateMetrado(value: unknown): ValidationResult<number> {
  try {
    const result = MetradoSchema.parse(value);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map(e => e.message)
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

export function validateFinancialParams(data: unknown): ValidationResult<z.infer<typeof FinancialParamsSchema>> {
  try {
    const result = FinancialParamsSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

export function validateTemplate(data: unknown): ValidationResult<z.infer<typeof TemplateSchema>> {
  try {
    const result = TemplateSchema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.issues.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Error de validación desconocido'] };
  }
}

// ====== Utilidades de validación ======

export function validateNumber(value: string | number, min = 0, max = Infinity): ValidationResult<number> {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return { success: false, errors: ['Debe ser un número válido'] };
  }
  
  if (num < min) {
    return { success: false, errors: [`Valor mínimo: ${min}`] };
  }
  
  if (num > max) {
    return { success: false, errors: [`Valor máximo: ${max}`] };
  }
  
  return { success: true, data: num };
}

export function validateString(value: string, minLength = 1, maxLength = 100): ValidationResult<string> {
  if (typeof value !== 'string') {
    return { success: false, errors: ['Debe ser texto'] };
  }
  
  if (value.length < minLength) {
    return { success: false, errors: [`Mínimo ${minLength} caracteres`] };
  }
  
  if (value.length > maxLength) {
    return { success: false, errors: [`Máximo ${maxLength} caracteres`] };
  }
  
  return { success: true, data: value };
}