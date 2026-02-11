import React, { useState } from 'react'
import { Copy, Check, X } from 'lucide-react'
import { ModalPortal } from '../ModalPortal'
import './DiffModal.css'

export const DiffModal = ({ diff, onClose, show }) => {
  const [copied, setCopied] = useState(false)

  if (!show) return null
  const displayDiff = diff || 'No staged changes found.'

  const handleCopy = () => {
    navigator.clipboard.writeText(displayDiff).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <ModalPortal>
      <div className="diff-modal-overlay" onClick={onClose}>
        <div className="diff-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="diff-modal-header">
            <h3>Git Cached Diff</h3>
            <div className="header-actions">
              <button
                className={`copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                title="Copy diff to clipboard"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="diff-modal-body">
            <pre className="diff-text">{displayDiff}</pre>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
