import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimation } from '../contexts/AnimationContext';

// ====== Hook para manejar estados de loading ======

export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  
  const withLoading = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    minLoadingTime: number = 500
  ): Promise<T> => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const result = await asyncFn();
      const elapsedTime = Date.now() - startTime;
      
      // Asegurar que el loading sea visible por un tiempo mínimo
      if (elapsedTime < minLoadingTime) {
        await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return { isLoading, setIsLoading, withLoading };
};

// ====== Componente de loading con diferentes estilos ======

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dots' | 'spinner' | 'pulse' | 'bars';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = 'md',
  variant = 'spinner',
  className = "",
}) => {
  const { reducedMotion } = useAnimation();
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  if (reducedMotion) {
    return <div className={`${sizeClasses[size]} bg-sky-500 rounded-full ${className}`} />;
  }
  
  if (variant === 'dots') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${size === 'sm' ? 'w-1 h-1' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3'} bg-sky-500 rounded-full`}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }
  
  if (variant === 'pulse') {
    return (
      <motion.div
        className={`${sizeClasses[size]} bg-sky-500 rounded-full ${className}`}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    );
  }
  
  if (variant === 'bars') {
    return (
      <div className={`flex gap-1 ${className}`}>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${size === 'sm' ? 'w-1 h-3' : size === 'md' ? 'w-1 h-4' : 'w-2 h-6'} bg-sky-500 rounded-full`}
            animate={{
              scaleY: [1, 2, 1],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }
  
  // Default: spinner
  return (
    <motion.div
      className={`${sizeClasses[size]} border-2 border-slate-300 border-t-sky-500 rounded-full ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// ====== Botón con feedback visual ======

interface FeedbackButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  onAsyncClick?: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = React.memo(({
  children,
  onAsyncClick,
  onClick,
  successMessage = "¡Éxito!",
  errorMessage = "Error",
  loadingMessage = "Procesando...",
  variant = 'primary',
  disabled,
  className = "",
  ...props
}) => {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const { reducedMotion } = useAnimation();
  
  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onAsyncClick) {
      setState('loading');
      try {
        await onAsyncClick();
        setState('success');
        setTimeout(() => setState('idle'), 2000);
      } catch {
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      }
    } else if (onClick) {
      onClick(e);
    }
  };
  
  const baseStyles = "px-4 py-2 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500",
    secondary: "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-500",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
    success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500",
  };
  
  const stateStyles = {
    idle: variantStyles[variant],
    loading: "bg-sky-400 text-white cursor-wait",
    success: "bg-green-500 text-white",
    error: "bg-red-500 text-white",
  };
  
  const buttonClass = `${baseStyles} ${stateStyles[state]} ${className}`;
  
  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" variant="spinner" />
            <span>{loadingMessage}</span>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{successMessage}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2">
            <span>✗</span>
            <span>{errorMessage}</span>
          </div>
        );
      default:
        return children;
    }
  };
  
  if (reducedMotion) {
    return (
      <button
        className={buttonClass}
        onClick={handleClick}
        disabled={disabled || state === 'loading'}
        {...props}
      >
        {getContent()}
      </button>
    );
  }
  
  return (
    <motion.button
      className={buttonClass}
      onClick={handleClick}
      disabled={disabled || state === 'loading'}
      whileHover={state === 'idle' ? { scale: 1.02 } : {}}
      whileTap={state === 'idle' ? { scale: 0.98 } : {}}
      animate={{
        scale: state === 'success' ? [1, 1.05, 1] : 1,
      }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {getContent()}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
});

FeedbackButton.displayName = 'FeedbackButton';

// ====== Input con validación visual ======

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  loading?: boolean;
  onValidate?: (value: string) => Promise<string | null>;
  debounceMs?: number;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = React.memo(({
  label,
  error,
  success,
  loading,
  onValidate,
  debounceMs = 500,
  className = "",
  onChange,
  ...props
}) => {
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const { reducedMotion } = useAnimation();
  
  const debounceValidation = React.useMemo(() => {
    if (debounceMs > 0) {
      return (value: string) => {
        const timeoutId = setTimeout(async () => {
          if (onValidate) {
            setIsValidating(true);
            try {
              const validationError = await onValidate(value);
              setInternalError(validationError);
              setIsValid(!validationError);
            } catch {
              setInternalError('Error de validación');
              setIsValid(false);
            } finally {
              setIsValidating(false);
            }
          }
        }, debounceMs);
        return () => clearTimeout(timeoutId);
      };
    }
    return async (value: string) => {
      if (onValidate) {
        setIsValidating(true);
        try {
          const validationError = await onValidate(value);
          setInternalError(validationError);
          setIsValid(!validationError);
        } catch {
          setInternalError('Error de validación');
          setIsValid(false);
        } finally {
          setIsValidating(false);
        }
      }
    };
  }, [onValidate, debounceMs]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onChange) onChange(e);
    
    if (onValidate) {
      const cleanup = debounceValidation(value);
      if (cleanup && typeof cleanup === 'function') {
        return cleanup;
      }
    }
  }, [onChange, debounceValidation, onValidate]);
  
  const currentError = error || internalError;
  const currentSuccess = success || isValid;
  const currentLoading = loading || isValidating;
  
  const inputStyles = `
    w-full px-3 py-2 rounded-xl border transition-all duration-200
    bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100
    placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    ${currentError 
      ? 'border-red-500 focus:ring-red-500' 
      : currentSuccess && !currentLoading
        ? 'border-green-500 focus:ring-green-500'
        : 'border-slate-300 dark:border-slate-600 focus:ring-sky-500'
    }
    ${className}
  `;
  
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          className={inputStyles}
          onChange={handleChange}
          {...props}
        />
        
        {/* Indicadores de estado */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <AnimatePresence>
            {currentLoading && (
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                exit={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
              >
                <LoadingSpinner size="sm" />
              </motion.div>
            )}
            {!currentLoading && currentSuccess && (
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                exit={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                className="text-green-500"
              >
                ✓
              </motion.div>
            )}
            {!currentLoading && currentError && (
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
                exit={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                className="text-red-500"
              >
                ✗
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Mensajes de error */}
      <AnimatePresence>
        {currentError && (
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
            className="text-red-400 text-sm"
          >
            {currentError}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

ValidatedInput.displayName = 'ValidatedInput';

// ====== Tooltip animado ======

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = React.memo(({
  children,
  content,
  position = 'top',
  delay = 500,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { reducedMotion } = useAnimation();
  
  const positionStyles = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };
  
  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setTimeout(() => setIsVisible(true), delay)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className={`absolute z-50 px-2 py-1 text-sm bg-slate-800 text-white rounded-lg shadow-lg whitespace-nowrap ${positionStyles[position]}`}
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
            animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
            exit={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          >
            {content}
            <div className="absolute w-2 h-2 bg-slate-800 transform rotate-45" 
                 style={{
                   [position === 'top' ? 'top' : position === 'bottom' ? 'bottom' : position === 'left' ? 'left' : 'right']: '-4px',
                   [position === 'top' || position === 'bottom' ? 'left' : 'top']: '50%',
                   transform: `translateX(-50%) ${position === 'bottom' ? 'rotate(45deg)' : position === 'top' ? 'rotate(225deg)' : position === 'right' ? 'rotate(135deg)' : 'rotate(315deg)'}`
                 }} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

Tooltip.displayName = 'Tooltip';