import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground p-6">
          <h1 className="text-2xl font-semibold">CaseSync</h1>
          <p className="text-muted-foreground">Bootstrapped. Ready to build.</p>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
