import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ShortcutProvider } from './contexts/ShortcutContext'
import { HelpProvider } from './hooks/help'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ShortcutProvider>
      <HelpProvider>
        <App />
      </HelpProvider>
    </ShortcutProvider>
  </React.StrictMode>,
)
