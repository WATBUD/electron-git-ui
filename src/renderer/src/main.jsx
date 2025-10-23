import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './modules/git/store';
import { MainPageGit } from './modules/git/pages/main-page/main-page-git';
import { MainPageMacro } from './modules/macro-recorder/pages/main-page/main-page-macro';
import './main.css';

const container = document.getElementById('root');
if (!container) throw new Error('Failed to find the root element');
const root = createRoot(container);

const PAGES = {
  GIT: 'git',
  MACRO: 'macro'
};

const App = () => {
  const [currentPage, setCurrentPage] = useState(PAGES.MACRO);

  const navStyle = {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f6f8fa',
    borderBottom: '1px solid #d1d5da'
  };

  const buttonStyle = (isActive) => ({
    padding: '8px 16px',
    backgroundColor: isActive ? '#0366d6' : 'transparent',
    color: isActive ? 'white' : '#24292e',
    border: '1px solid #d1d5da',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: '#0366d6'
    }
  });

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* <nav style={navStyle}>
        <button 
          onClick={() => setCurrentPage(PAGES.GIT)}
          style={buttonStyle(currentPage === PAGES.GIT)}
        >
          Git
        </button>
        <button
          onClick={() => setCurrentPage(PAGES.MACRO)}
          style={buttonStyle(currentPage === PAGES.MACRO)}
        >
          Macro
        </button>
      </nav> */}
      
      <div style={{ flex: 1, overflow: 'auto' }}>
        {currentPage === PAGES.GIT ? <MainPageGit /> : <MainPageMacro />}
      </div>
    </div>
  );
};

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
