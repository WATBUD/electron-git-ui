import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';          // ← 你的 Redux store
import { GitMainPage } from './components/git/GitMainPage';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <GitMainPage />
    </Provider>
  </React.StrictMode>
);
