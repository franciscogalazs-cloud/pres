import React, { useState, useCallback } from 'react';
import { validateNumber, validateString } from '../utils/validations';

// ====== Input numérico validado ======

interface ValidatedNumInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  showValidation?: boolean;
}

export const ValidatedNumInput: React.FC<ValidatedNumInputProps> = React.memo(({
  label,
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 0.01,
  className = "",
  showValidation = true
}) => {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState(true);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (showValidation) {
      const validation = validateNumber(inputValue, min, max);
      
      if (!validation.success) {
        setError(validation.errors?.[0] || 'Error de validación');
        setIsValid(false);
        return;
      }
      
      setError('');
      setIsValid(true);
      onChange(validation.data!);
    } else {
      const numValue = Math.max(min, Math.min(max, parseFloat(inputValue) || 0));
      onChange(numValue);
    }
  }, [onChange, min, max, showValidation]);

  return (
    <label className={`text-sm text-slate-300 grid gap-1 ${className}`}>
      <span className="flex items-center gap-2">
        {label}
        {showValidation && !isValid && (
          <span className="text-red-400 text-xs">⚠️</span>
        )}
      </span>
      <input
        type="number"
        step={step}
        min={min}
        max={max !== Infinity ? max : undefined}
        value={value}
        onChange={handleChange}
        className={`w-full bg-slate-900 border rounded-xl p-2 transition-colors ${
          showValidation && !isValid 
            ? 'border-red-500 focus:border-red-400' 
            : 'border-slate-700 focus:border-slate-500'
        }`}
      />
      {showValidation && error && (
        <span className="text-red-400 text-xs mt-1">{error}</span>
      )}
    </label>
  );
});

ValidatedNumInput.displayName = 'ValidatedNumInput';

// ====== Input de texto validado ======

interface ValidatedTextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
  pattern?: RegExp;
  patternMessage?: string;
}

export const ValidatedTextInput: React.FC<ValidatedTextInputProps> = React.memo(({
  label,
  value,
  onChange,
  minLength = 1,
  maxLength = 100,
  placeholder,
  className = "",
  showValidation = true,
  pattern,
  patternMessage = 'Formato inválido'
}) => {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState(true);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    if (showValidation) {
      // Validación básica de string
      const validation = validateString(inputValue, minLength, maxLength);
      
      if (!validation.success) {
        setError(validation.errors?.[0] || 'Error de validación');
        setIsValid(false);
        onChange(inputValue); // Mantener el valor para permitir edición
        return;
      }
      
      // Validación de patrón si se proporciona
      if (pattern && !pattern.test(inputValue)) {
        setError(patternMessage);
        setIsValid(false);
        onChange(inputValue);
        return;
      }
      
      setError('');
      setIsValid(true);
      onChange(inputValue);
    } else {
      onChange(inputValue);
    }
  }, [onChange, minLength, maxLength, showValidation, pattern, patternMessage]);

  return (
    <label className={`text-sm text-slate-300 grid gap-1 ${className}`}>
      <span className="flex items-center gap-2">
        {label}
        {showValidation && !isValid && (
          <span className="text-red-400 text-xs">⚠️</span>
        )}
        {showValidation && isValid && value.length > 0 && (
          <span className="text-green-400 text-xs">✓</span>
        )}
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-slate-900 border rounded-xl p-2 transition-colors ${
          showValidation && !isValid 
            ? 'border-red-500 focus:border-red-400' 
            : showValidation && isValid && value.length > 0
            ? 'border-green-500 focus:border-green-400'
            : 'border-slate-700 focus:border-slate-500'
        }`}
      />
      {showValidation && error && (
        <span className="text-red-400 text-xs mt-1">{error}</span>
      )}
      {showValidation && !error && value.length > 0 && (
        <span className="text-green-400 text-xs mt-1">
          {value.length}/{maxLength} caracteres
        </span>
      )}
    </label>
  );
});

ValidatedTextInput.displayName = 'ValidatedTextInput';

// ====== Indicador de validación de formulario ======

interface FormValidationStatusProps {
  isValid: boolean;
  errors: string[];
  className?: string;
}

export const FormValidationStatus: React.FC<FormValidationStatusProps> = React.memo(({
  isValid,
  errors,
  className = ""
}) => {
  if (errors.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-green-400 text-sm ${className}`}>
        <span>✓</span>
        <span>Todos los campos son válidos</span>
      </div>
    );
  }

  return (
    <div className={`bg-red-900/20 border border-red-500 rounded-xl p-3 ${className}`}>
      <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
        <span>⚠️</span>
        <span>Errores de validación:</span>
      </div>
      <ul className="text-red-300 text-xs space-y-1 ml-4">
        {errors.map((error, index) => (
          <li key={index}>• {error}</li>
        ))}
      </ul>
    </div>
  );
});

FormValidationStatus.displayName = 'FormValidationStatus';