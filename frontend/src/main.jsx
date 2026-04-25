// React entry point — mounts the root App component into index.html's #root element.
// StrictMode enables extra runtime warnings in development (double-invocations, etc.).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
