import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { DataProvider } from './contexts/DataContext.jsx'
import { FilterProvider } from './contexts/FilterContext.jsx'
import { ChatbotProvider } from './contexts/ChatbotContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <DataProvider>
        <FilterProvider>
          <ChatbotProvider>
            <App />
          </ChatbotProvider>
        </FilterProvider>
      </DataProvider>
    </AuthProvider>
  </StrictMode>,
)
