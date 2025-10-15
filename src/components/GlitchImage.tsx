import React from 'react'
import './GlitchImage.css'

type Props = {
  src: string
  alt?: string
  className?: string
  speed?: number
  enableOnHover?: boolean
  enableShadows?: boolean
}

const GlitchImage: React.FC<Props> = ({
  src,
  alt = '',
  className = '',
  speed = 1,
  enableOnHover = false,
  enableShadows = true,
}) => {
  const styles = {
    ['--after-duration' as any]: `${speed * 3}s`,
    ['--before-duration' as any]: `${speed * 2}s`,
    ['--after-filter' as any]: enableShadows ? 'drop-shadow(-10px 0 red)' : 'none',
    ['--before-filter' as any]: enableShadows ? 'drop-shadow(10px 0 cyan)' : 'none',
  } as React.CSSProperties

  return (
    <span className={`glitch-img ${enableOnHover ? 'enable-on-hover' : ''} ${className}`} style={styles}>
      <img src={src} alt={alt} className="glitch-img__base" />
      <img src={src} alt="" aria-hidden className="glitch-img__layer glitch-img__after" />
      <img src={src} alt="" aria-hidden className="glitch-img__layer glitch-img__before" />
    </span>
  )
}

export default GlitchImage
