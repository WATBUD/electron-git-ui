import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import './FooterArea.css';
import { Copy } from 'lucide-react';
import { clearCommandHistory } from '../../../store/gitSlice';

export const FooterArea = () => {
  const dispatch = useDispatch();
  const commandHistory = useSelector((state) => state.git.commandHistory);
  const [activeCommandTab, setActiveCommandTab] = useState('history');
  const [height, setHeight] = useState(200);
  const [isResizing, setIsResizing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const footerRef = useRef(null);
  
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const rafRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    e.preventDefault();
  }, [height]);

  const updateHeight = useCallback((newHeight) => {
    if (newHeight > 100 && newHeight < window.innerHeight - 100) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        setHeight(newHeight);
      });
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const deltaY = startYRef.current - e.clientY;
      const newHeight = startHeightRef.current + deltaY;
      updateHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isResizing, updateHeight]);

  return (
    <div 
      className="footer-area" 
      ref={footerRef}
      style={{ height: `${height}px` }}
    >
      <div className="resize-handle" onMouseDown={handleMouseDown} />
      <div className="command-tabs">
        <button 
          className={`command-tab ${activeCommandTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveCommandTab('history')}
        >
          Command History
        </button>
        {/* <button 
          className={`command-tab ${activeCommandTab === 'terminal' ? 'active' : ''}`}
          onClick={() => setActiveCommandTab('terminal')}
        >
          Terminal
        </button> */}
      </div>
      {activeCommandTab === 'history' && (
        <>
          <div className="command-history-header">
            <button onClick={() => dispatch(clearCommandHistory())} className="clear-history-btn">
              Clear History
            </button>
          </div>
          <div className="command-list">
            {commandHistory
              .slice()
              .reverse()
              .map((command, index) => (
                <div key={commandHistory.length - 1 - index} className="command-item">
                  <span className="command-number">{commandHistory.length - index}.</span>
                  <span className="command-text">{command}</span>
                  <button 
                    className={`copy-button ${copiedIndex === index ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(command, index)}
                    title="Copy command"
                  >
                    <Copy size={14} />
                    {copiedIndex === index && <span className="copied-text">Copied!</span>}
                  </button>
                </div>
              ))}
          </div>
        </>
      )}
      {activeCommandTab === 'terminal' && (
        <div className="terminal-container">
          <div className="terminal-content">
            Terminal content will be implemented here
          </div>
        </div>
      )}
    </div>
  );
}; 