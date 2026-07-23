// external libs
import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/unbounded/700.css'
import '@fontsource/unbounded/800.css'
import '@fontsource/sora/400.css'
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/chivo-mono/700.css'

// internal — absolute paths
import { StoreProvider } from '@/store'
import App from '@/App'

// internal — relative
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </React.StrictMode>,
)
