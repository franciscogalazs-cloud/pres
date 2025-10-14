import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnimation, fadeInUp, scaleIn, bounceIn, hoverAnimations } from '../contexts/AnimationContext';

// ====== Botón animado simple ======

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
  onClick,
  ...props
}) => {
  const { reducedMotion } = useAnimation();
  
  const baseStyles = "rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantStyles = {
    primary: "bg-sky-500 hover:bg-sky-600 text-white focus:ring-sky-500",
    secondary: "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 focus:ring-slate-500",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500",
    success: "bg-green-500 hover:bg-green-600 text-white focus:ring-green-500",
  };
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const buttonClass = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  
  if (reducedMotion) {
    return (
      <button
        className={buttonClass}
        disabled={disabled || loading}
        onClick={onClick}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Cargando...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
  
  return (
    <motion.button
      className={buttonClass}
      disabled={disabled || loading}
      onClick={onClick}
      {...hoverAnimations.button}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2"
          >
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Cargando...</span>
          </motion.div>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
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
  
  if (reducedMotion) {
    return <div className={cardClass}>{children}</div>;
  }
  
  return (
    <motion.div
      className={cardClass}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={{ delay }}
      {...(hover ? hoverAnimations.card : {})}
    >
      {children}
    </motion.div>
  );
});

AnimatedCard.displayName = 'AnimatedCard';

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
  
  if (reducedMotion) {
    return (
      <div className={baseStyles}>
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 px-2 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded-lg"
          >
            ✕
          </button>
        )}
      </div>
    );
  }
  
  return (
    <motion.div
      className={baseStyles}
      variants={bounceIn}
      initial="initial"
      animate="animate"
      exit="exit"
      layout
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
    </motion.div>
  );
});

AnimatedNotification.displayName = 'AnimatedNotification';

// ====== Tab content animado ======

interface AnimatedTabContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tabKey: string;
  className?: string;
}

export const AnimatedTabContent: React.FC<AnimatedTabContentProps> = React.memo(({
  children,
  tabKey,
  className = "",
  id,
  role,
  ...ariaProps
}) => {
  const { reducedMotion } = useAnimation();
  
  const divProps = {
    id,
    role,
    ...ariaProps,
  };
  
  if (reducedMotion) {
    return <div className={className} {...divProps}>{children}</div>;
  }
  
  return (
    <motion.div
      key={tabKey}
      className={className}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
      id={id}
      role={role}
      {...(ariaProps as any)}
    >
      {children}
    </motion.div>
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
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          {reducedMotion ? (
            <div
              className="absolute inset-0 bg-black/50"
              onClick={onClose}
            />
          ) : (
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
          )}
          
          {/* Modal */}
          {reducedMotion ? (
            <div className="relative bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 border border-slate-700">
              {title && (
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
                  <button
                    onClick={onClose}
                    className="px-2 py-1 text-sm bg-slate-200 dark:bg-slate-700 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              )}
              {children}
            </div>
          ) : (
            <motion.div
              className="relative bg-slate-800 rounded-2xl p-6 max-w-lg w-full mx-4 border border-slate-700"
              variants={scaleIn}
              initial="initial"
              animate="animate"
              exit="exit"
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
            </motion.div>
          )}
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
  
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
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
    </motion.div>
  );
});

AnimatedList.displayName = 'AnimatedList';