import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BookmarksProvider } from "./context/BookmarksContext";
import "./index.css";
import { CollectionsProvider } from "./context/CollectionsContext";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BookmarksProvider>
      <CollectionsProvider>
        <App />
      </CollectionsProvider>
    </BookmarksProvider>
  </StrictMode>,
)
