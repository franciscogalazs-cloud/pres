import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppModular from './AppModular'
import './index.css'

// Permite seleccionar variante de la app por feature flag/env
// VITE_APP_VARIANT = 'modular' | 'default'
const variant = (import.meta as any)?.env?.VITE_APP_VARIANT || 'default';
const RootApp = String(variant).toLowerCase() === 'modular' ? (AppModular as any) : (App as any);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
)
