import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { EmitterPage } from './EmitterPage';
import './emitter-page.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

createRoot(root).render(
  <StrictMode>
    <EmitterPage />
  </StrictMode>,
);
