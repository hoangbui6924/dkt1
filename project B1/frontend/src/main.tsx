import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { dangKyWebMcpTools } from './webmcp.ts'

// WebMCP: cho AI agent trình duyệt (Chrome 149+) gọi công cụ B1. No-op nếu trình duyệt chưa hỗ trợ.
dangKyWebMcpTools()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
