import './GlitchText.css'
import React from 'react'

type Props = {
  children: React.ReactNode
  speed?: number
  enableShadows?: boolean
  enableOnHover?: boolean
  className?: string
}

const GlitchText: React.FC<Props> = ({
  children,
  speed = 1,
  enableShadows = true,
  enableOnHover = true,
  className = '',
}) => {
  // Aseguramos que data-text sea un string (necesario para content: attr(data-text))
  const text = React.useMemo(() => {
    if (typeof children === 'string') return children.trim();
    const parts = React.Children.toArray(children).map((c) => (typeof c === 'string' ? c : ''));
    return parts.join(' ').trim();
  }, [children]);
  const inlineStyles = {
    ['--after-duration' as any]: `${speed * 3}s`,
    ['--before-duration' as any]: `${speed * 2}s`,
    ['--after-shadow' as any]: enableShadows ? '-5px 0 red' : 'none',
    ['--before-shadow' as any]: enableShadows ? '5px 0 cyan' : 'none',
  } as React.CSSProperties

  const hoverClass = enableOnHover ? 'enable-on-hover' : ''

  return (
    <div className={`glitch ${hoverClass} ${className}`} style={inlineStyles} data-text={text}>
      {children}
    </div>
  )
}

export default GlitchText
