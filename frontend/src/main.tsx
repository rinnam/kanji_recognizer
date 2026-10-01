import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import './shared/ui/theme/tokens.css';
import './app/App.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
