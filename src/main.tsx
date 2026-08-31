import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './styles/fonts'
import './styles/tokens.css'
import './styles/base.css'
import './styles/reda-ui.css'
import './styles/reda-studio.css'
import './styles/reda-workbench.css'
import './styles/reda-viewer.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
