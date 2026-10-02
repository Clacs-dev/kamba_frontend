import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import FronteiraErros from './components/FronteiraErros.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FronteiraErros>
      <App />
    </FronteiraErros>
  </StrictMode>,
)
