import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import './CopyButton.css';

export const CopyButton = ({ 
  textToCopy, 
  title = "Copy", 
  size = 14,
  className = "",
  showCopiedText = false 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`copy-button ${copied ? 'copied' : ''} ${className}`}
      title={title}
    >
      <Copy size={size} />
      {showCopiedText && copied && <span className="copied-text">Copied!</span>}
    </button>
  );
};
