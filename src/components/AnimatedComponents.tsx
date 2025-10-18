import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimation, fadeInUp, scaleIn, bounceIn, hoverAnimations } from '../contexts/AnimationContext';

// ====== Botón animado ======

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = React.memo(({
  children,
  className = "",
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props
}) => {
  const { reducedMotion } = useAnimation();

  const baseStyles = "rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500",
    secondary: "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-500",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
    success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500",
  } as const;

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  } as const;

  const buttonClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  const MotionButton: any = reducedMotion ? 'button' : motion.button;

  return (
    <MotionButton
      className={buttonClass}
      disabled={disabled || loading}
      {...(!reducedMotion ? { whileTap: { scale: 0.98 } } : {})}
      {...props}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={reducedMotion ? {} : { opacity: 0 }}
            animate={reducedMotion ? {} : { opacity: 1 }}
            exit={reducedMotion ? {} : { opacity: 0 }}
            className="flex items-center gap-2"
          >
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span>Cargando...</span>
          </motion.div>
        ) : (
          <motion.span
            key="content"
            initial={reducedMotion ? {} : { opacity: 0 }}
            animate={reducedMotion ? {} : { opacity: 1 }}
            exit={reducedMotion ? {} : { opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </MotionButton>
  );
});

AnimatedButton.displayName = 'AnimatedButton';

// ====== Card animada ======

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = React.memo(({
  children,
  className = "",
  delay = 0,
  hover = true,
}) => {
  const { reducedMotion } = useAnimation();
  
  const baseStyles = "bg-slate-800 rounded-2xl p-6 border border-slate-700";
  const cardClass = `${baseStyles} ${className}`;
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  const motionProps = reducedMotion ? {} : {
    variants: fadeInUp,
    initial: "initial",
    animate: "animate",
    transition: { delay },
    ...(hover ? hoverAnimations.card : {}),
  };
  
  return (
    <MotionDiv
      className={cardClass}
      {...motionProps}
    >
      {children}
    </MotionDiv>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

// ====== Input animado ======

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
}

export const AnimatedInput: React.FC<AnimatedInputProps> = React.memo(({
  label,
  error,
  success,
  className = "",
  ...props
}) => {
  const { reducedMotion } = useAnimation();
  
  const inputStyles = `
    w-full px-3 py-2 rounded-xl border transition-all duration-200
    bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100
    placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
    ${error 
      ? 'border-red-500 focus:ring-red-500' 
      : success 
        ? 'border-green-500 focus:ring-green-500'
        : 'border-slate-300 dark:border-slate-600 focus:ring-sky-500'
    }
    ${className}
  `;
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  const MotionInput: any = reducedMotion ? 'input' : motion.input;
  
  return (
    <MotionDiv
      variants={reducedMotion ? undefined : fadeInUp}
      initial={reducedMotion ? undefined : "initial"}
      animate={reducedMotion ? undefined : "animate"}
      className="space-y-2"
    >
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <MotionInput
        className={inputStyles}
        whileFocus={reducedMotion ? {} : { scale: 1.01 }}
        transition={reducedMotion ? {} : { duration: 0.2 }}
        {...props}
      />
      <AnimatePresence>
        {error && (
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
            animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -10 }}
            className="text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
});

AnimatedInput.displayName = 'AnimatedInput';

// ====== Notificación animada ======

interface AnimatedNotificationProps {
  children: React.ReactNode;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose?: () => void;
}

export const AnimatedNotification: React.FC<AnimatedNotificationProps> = React.memo(({
  children,
  type = 'info',
  onClose,
}) => {
  const { reducedMotion } = useAnimation();
  
  const typeStyles = {
    success: "bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-600 text-green-800 dark:text-green-400",
    error: "bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-600 text-red-800 dark:text-red-400",
    warning: "bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600 text-yellow-800 dark:text-yellow-400",
    info: "bg-sky-100 dark:bg-sky-900/20 border-sky-300 dark:border-sky-600 text-sky-800 dark:text-sky-400",
  };
  
  const baseStyles = `p-4 rounded-xl border flex items-center justify-between ${typeStyles[type]}`;
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  
  return (
    <MotionDiv
      className={baseStyles}
      variants={reducedMotion ? undefined : bounceIn}
      initial={reducedMotion ? undefined : "initial"}
      animate={reducedMotion ? undefined : "animate"}
      exit={reducedMotion ? undefined : "exit"}
      layout={!reducedMotion}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <AnimatedButton
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="ml-3 !px-2 !py-1"
        >
          ✕
        </AnimatedButton>
      )}
    </MotionDiv>
  );
});

AnimatedNotification.displayName = 'AnimatedNotification';

// ====== Tab content animado ======

interface AnimatedTabContentProps {
  children: React.ReactNode;
  tabKey: string;
  className?: string;
}

export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = React.memo(({
  children,
  tabKey,
  className = "",
}) => {
  const { reducedMotion } = useAnimation();
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  
  return (
    <MotionDiv
      key={tabKey}
      className={className}
      initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
      animate={reducedMotion ? {} : { opacity: 1, x: 0 }}
      exit={reducedMotion ? {} : { opacity: 0, x: -20 }}
      transition={reducedMotion ? {} : { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
    >
      {children}
    </MotionDiv>
  );
});

AnimatedTabContent.displayName = 'AnimatedTabContent';

// ====== Modal animado ======

interface AnimatedModalProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const AnimatedModal: React.FC<AnimatedModalProps> = React.memo(({
  children,
  isOpen,
  onClose,
  title,
}) => {
  const { reducedMotion } = useAnimation();
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <MotionDiv
            className="absolute inset-0 bg-black/50"
            initial={reducedMotion ? {} : { opacity: 0 }}
            animate={reducedMotion ? {} : { opacity: 1 }}
            exit={reducedMotion ? {} : { opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <MotionDiv
            className="relative bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 border border-slate-700"
            variants={reducedMotion ? undefined : scaleIn}
            initial={reducedMotion ? undefined : "initial"}
            animate={reducedMotion ? undefined : "animate"}
            exit={reducedMotion ? undefined : "exit"}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                <AnimatedButton
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  className="!px-2 !py-1"
                >
                  ✕
                </AnimatedButton>
              </div>
            )}
            {children}
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
});

AnimatedModal.displayName = 'AnimatedModal';

// ====== Lista animada con stagger ======

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export const AnimatedList: React.FC<AnimatedListProps> = React.memo(({
  children,
  className = "",
  staggerDelay = 0.1,
}) => {
  const { reducedMotion } = useAnimation();
  
  const MotionDiv = reducedMotion ? 'div' : motion.div;
  
  return (
    <MotionDiv
      className={className}
      initial={reducedMotion ? {} : "initial"}
      animate={reducedMotion ? {} : "animate"}
      variants={reducedMotion ? undefined : {
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          }
        }
      }}
    >
      {children}
    </MotionDiv>
  );
});

AnimatedList.displayName = 'AnimatedList';