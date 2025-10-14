import React, { createContext, useContext } from 'react';
import { motion, Variants } from 'framer-motion';

// ====== Configuraciones de animaciones ======

export const animationConfig = {
  // Durations
  durations: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  
  // Easing functions
  easing: {
    easeOut: [0.4, 0.0, 0.2, 1],
    easeIn: [0.4, 0.0, 1, 1],
    easeInOut: [0.4, 0.0, 0.2, 1],
    bounce: [0.68, -0.55, 0.265, 1.55],
  },
  
  // Stagger configuration
  stagger: {
    children: 0.1,
    grid: 0.05,
  },
} as const;

// ====== Variantes de animación comunes ======

export const fadeInUp: Variants = {
  initial: { 
    opacity: 0, 
    y: 20,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: animationConfig.durations.normal, ease: animationConfig.easing.easeOut }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

export const fadeIn: Variants = {
  initial: { 
    opacity: 0,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1,
    transition: { duration: animationConfig.durations.normal, ease: animationConfig.easing.easeOut }
  },
  exit: { 
    opacity: 0,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

export const slideInFromRight: Variants = {
  initial: { 
    opacity: 0, 
    x: 20,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { duration: animationConfig.durations.normal, ease: animationConfig.easing.easeOut }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

export const scaleIn: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: animationConfig.durations.normal, ease: animationConfig.easing.easeOut }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

export const bounceIn: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.3,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: animationConfig.durations.slow, ease: animationConfig.easing.bounce }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

// Variantes para contenedores con stagger
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: animationConfig.stagger.children,
      delayChildren: 0.1,
    }
  },
  exit: {
    transition: {
      staggerChildren: animationConfig.stagger.children / 2,
      staggerDirection: -1,
    }
  },
};

// Variantes para items dentro de contenedores stagger
export const staggerItem: Variants = {
  initial: { 
    opacity: 0, 
    y: 10,
    transition: { duration: animationConfig.durations.fast }
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: animationConfig.durations.normal, ease: animationConfig.easing.easeOut }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: animationConfig.durations.fast, ease: animationConfig.easing.easeIn }
  },
};

// ====== Contexto de animaciones ======

interface AnimationContextType {
  config: typeof animationConfig;
  variants: {
    fadeInUp: Variants;
    fadeIn: Variants;
    slideInFromRight: Variants;
    scaleIn: Variants;
    bounceIn: Variants;
    staggerContainer: Variants;
    staggerItem: Variants;
  };
  reducedMotion: boolean;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

// ====== Provider de animaciones ======

interface AnimationProviderProps {
  children: React.ReactNode;
}

export const AnimationProvider: React.FC<AnimationProviderProps> = ({ children }) => {
  // Detectar preferencia de usuario para reducir animaciones
  const reducedMotion = React.useMemo(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const contextValue: AnimationContextType = {
    config: animationConfig,
    variants: {
      fadeInUp,
      fadeIn,
      slideInFromRight,
      scaleIn,
      bounceIn,
      staggerContainer,
      staggerItem,
    },
    reducedMotion,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

// ====== Hook para usar el contexto ======

export const useAnimation = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimation debe ser usado dentro de AnimationProvider');
  }
  return context;
};

// ====== Componentes de animación reutilizables ======

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof AnimationContextType['variants'];
  delay?: number;
  stagger?: boolean;
}

export const AnimatedContainer: React.FC<AnimatedContainerProps> = React.memo(({
  children,
  className = "",
  variant = 'fadeInUp',
  delay = 0,
  stagger = false,
}) => {
  const { variants, reducedMotion } = useAnimation();
  
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  
  const selectedVariant = stagger ? variants.staggerContainer : variants[variant];
  
  return (
    <motion.div
      className={className}
      variants={selectedVariant}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
});

AnimatedContainer.displayName = 'AnimatedContainer';

interface AnimatedItemProps {
  children: React.ReactNode;
  className?: string;
  variant?: keyof AnimationContextType['variants'];
  delay?: number;
}

export const AnimatedItem: React.FC<AnimatedItemProps> = React.memo(({
  children,
  className = "",
  variant = 'staggerItem',
  delay = 0,
}) => {
  const { variants, reducedMotion } = useAnimation();
  
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      className={className}
      variants={variants[variant]}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
});

AnimatedItem.displayName = 'AnimatedItem';

// ====== Componente para tabs animados ======

interface AnimatedTabsProps {
  children: React.ReactNode;
  activeTab: string;
  className?: string;
}

export const AnimatedTabs: React.FC<AnimatedTabsProps> = React.memo(({
  children,
  activeTab,
  className = "",
}) => {
  const { reducedMotion } = useAnimation();
  
  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      key={activeTab}
      className={className}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ 
        duration: animationConfig.durations.normal,
        ease: animationConfig.easing.easeOut
      }}
    >
      {children}
    </motion.div>
  );
});

AnimatedTabs.displayName = 'AnimatedTabs';

// ====== Hover animations ======

export const hoverAnimations = {
  button: {
    whileHover: { 
      scale: 1.02,
      transition: { duration: animationConfig.durations.fast }
    },
    whileTap: { 
      scale: 0.98,
      transition: { duration: animationConfig.durations.fast }
    },
  },
  
  card: {
    whileHover: { 
      y: -2,
      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      transition: { duration: animationConfig.durations.fast }
    },
  },
  
  icon: {
    whileHover: { 
      rotate: 5,
      scale: 1.1,
      transition: { duration: animationConfig.durations.fast }
    },
  },
};

// ====== Utility para crear transiciones personalizadas ======

export const createTransition = (
  duration: keyof typeof animationConfig.durations = 'normal',
  easing: keyof typeof animationConfig.easing = 'easeOut',
  delay: number = 0
) => ({
  duration: animationConfig.durations[duration],
  ease: animationConfig.easing[easing],
  delay,
});