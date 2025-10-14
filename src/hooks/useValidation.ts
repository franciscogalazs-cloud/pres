import { useState, useCallback } from 'react';
import { validateFinancialParams, validateMetrado, ValidationResult } from '../utils/validations';
import type { FinancialParams } from '../types';

// ====== Hook para validación de formularios ======

export function useFormValidation() {
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);

  const addError = useCallback((error: string) => {
    setErrors(prev => [...prev, error]);
    setIsValid(false);
  }, []);

  const removeError = useCallback((error: string) => {
    setErrors(prev => prev.filter(e => e !== error));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
    setIsValid(true);
  }, []);

  const validateField = useCallback(<T>(
    validation: ValidationResult<T>,
    fieldName: string
  ): T | null => {
    const errorKey = `${fieldName}_error`;
    
    if (validation.success) {
      removeError(errorKey);
      return validation.data!;
    } else {
      const errorMessage = `${fieldName}: ${validation.errors?.[0] || 'Error desconocido'}`;
      setErrors(prev => {
        const filtered = prev.filter(e => !e.startsWith(`${fieldName}:`));
        return [...filtered, errorMessage];
      });
      setIsValid(false);
      return null;
    }
  }, [removeError]);

  return {
    errors,
    isValid,
    addError,
    removeError,
    clearErrors,
    validateField
  };
}

// ====== Hook especializado para validación de parámetros financieros ======

export function useFinancialValidation(initialParams: FinancialParams) {
  const [params, setParams] = useState(initialParams);
  const { errors, isValid, validateField, clearErrors } = useFormValidation();

  const updateParam = useCallback((key: keyof FinancialParams, value: number) => {
    const newParams = { ...params, [key]: value };
    
    // Validar el parámetro específico
    const validation = validateFinancialParams(newParams);
    const validatedParams = validateField(validation, 'financial_params');
    
    if (validatedParams) {
      setParams(validatedParams);
      return validatedParams;
    } else {
      // Mantener el valor para permitir edición, pero marcar como inválido
      setParams(newParams);
      return null;
    }
  }, [params, validateField]);

  const setGG = useCallback((value: number) => updateParam('gg', value), [updateParam]);
  const setUtil = useCallback((value: number) => updateParam('util', value), [updateParam]);
  const setIva = useCallback((value: number) => updateParam('iva', value), [updateParam]);

  return {
    params,
    errors,
    isValid,
    setGG,
    setUtil,
    setIva,
    clearErrors
  };
}

// ====== Hook para validación de metrados ======

export function useMetradoValidation(initialValue: number = 1) {
  const [metrado, setMetrado] = useState(initialValue);
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState(true);

  const updateMetrado = useCallback((value: number) => {
    const validation = validateMetrado(value);
    
    if (validation.success) {
      setMetrado(validation.data!);
      setError('');
      setIsValid(true);
      return validation.data!;
    } else {
      setMetrado(value); // Mantener valor para edición
      setError(validation.errors?.[0] || 'Error de validación');
      setIsValid(false);
      return null;
    }
  }, []);

  const resetValidation = useCallback(() => {
    setError('');
    setIsValid(true);
  }, []);

  return {
    metrado,
    error,
    isValid,
    updateMetrado,
    resetValidation
  };
}

// ====== Hook para validación en tiempo real ======

export function useRealtimeValidation<T>(
  validationFn: (data: unknown) => ValidationResult<T>,
  initialValue: T
) {
  const [value, setValue] = useState<T>(initialValue);
  const [errors, setErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

  const updateValue = useCallback((newValue: T) => {
    setValue(newValue);
    setIsDirty(true);
    
    const validation = validationFn(newValue);
    
    if (validation.success) {
      setErrors([]);
      setIsValid(true);
    } else {
      setErrors(validation.errors || ['Error desconocido']);
      setIsValid(false);
    }
  }, [validationFn]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setErrors([]);
    setIsValid(true);
    setIsDirty(false);
  }, [initialValue]);

  return {
    value,
    errors,
    isValid,
    isDirty,
    updateValue,
    reset
  };
}