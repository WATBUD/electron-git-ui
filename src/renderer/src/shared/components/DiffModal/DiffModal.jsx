import React, { useState } from 'react'
import { flushSync } from 'react-dom'
import { Copy, Check, X, Sparkles } from 'lucide-react'
import { ModalPortal } from '../ModalPortal'
import styles from './DiffModal.module.css'

export const DiffModal = ({ diff, onClose, show }) => {
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')
  const [viewMode, setViewMode] = useState('diff') // 'diff' or 'message'

  // Clear generated message when modal opens
  React.useEffect(() => {
    if (show) {
      setGeneratedMessage('')
    }
  }, [show])

  if (!show) return null
  const displayDiff = diff || (diff === '' ? 'No staged changes found. Stage some changes to see the diff.' : 'No staged changes found.')

  const isValidMessage = (message) => {
    if (!message) return false
    const errorKeywords = ['API', 'Failed', 'quota', 'unavailable', 'forbidden', 'not found']
    return !errorKeywords.some(keyword => message.includes(keyword))
  }

  const handleCopy = () => {
    let textToCopy
    if (viewMode === 'message' && isValidMessage(generatedMessage)) {
      textToCopy = generatedMessage
    } else {
      textToCopy = displayDiff
    }
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'diff' ? 'message' : 'diff')
  }

  const generateCommitMessage = async () => {
    // Use flushSync to immediately hide the generated message area
    flushSync(() => {
      setIsGenerating(true)
      setGeneratedMessage('') // Clear previous message immediately
    })
    
    try {
      // Get Google Gemini API key from environment variable
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      console.log('API Key value:', apiKey)
      console.log('API Key length:', apiKey?.length)
      
      if (!apiKey) {
        console.error('Google Gemini API key not configured')
        setGeneratedMessage('API key not configured. Please set VITE_GEMINI_API_KEY in your environment.')
        return
      }
      
      // AI Router with multi-model fallback
      const MODELS = [
        // 'models/gemini-2.5-flash',
        'models/gemini-2.5-flash-lite', 
        // 'models/gemini-2.0-flash',
        // 'models/gemini-2.0-flash-lite'
      ]

      const callModelWithRetry = async (model, payload, retries = 2) => {
        for (let i = 0; i < retries; i++) {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            }
          )

          if (response.status === 503) {
            console.warn(`Model ${model} temporarily unavailable, retry ${i + 1}/${retries}`)
            await new Promise(resolve => setTimeout(resolve, 500 * (i + 1)))
            continue
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          return await response.json()
        }
        throw new Error(`Model ${model} failed after ${retries} retries`)
      }

      const generateWithFallback = async (payload) => {
        for (const model of MODELS) {
          try {
            console.log(`Trying model: ${model}`)
            const result = await callModelWithRetry(model, payload)
            console.log(`✅ Success with model: ${model}`)
            return result
          } catch (error) {
            console.warn(`❌ Model ${model} failed:`, error.message)
            continue
          }
        }
        throw new Error('All models failed')
      }

      // Limit diff content to avoid errors
      const maxDiffLength = 6000
      const truncatedDiff = displayDiff.length > maxDiffLength 
        ? displayDiff.substring(0, maxDiffLength) + '\n... (truncated)'
        : displayDiff
      
      // Prepare payload
      const payload = {
        contents: [{
          parts: [{
            text: `Generate a commit message in this format:

type: brief description

- specific change 1
- specific change 2
- specific change 3

The first line should be type: description (no scope). Then add bullet points with specific details. Examples:

feat: improve git diff handling and command history UI

- support diff output for new/untracked files by reading file content
- add GitHistory component with copy and clear functionality
- refactor FooterArea to use reusable GitHistory module
- improve command history tracking with operation start index
- clean up git thunks and remove redundant history updates

fix: resolve authentication timeout issues

- increase session timeout duration
- add retry mechanism for failed auth requests
- improve error handling for expired tokens

Diff:\n${truncatedDiff}\n\nCommit message:`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        }
      }

      // Call AI Router
      const data = await generateWithFallback(payload)
      console.log('AI Router Response data:', data)
      const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      
      if (message) {
        setGeneratedMessage(message)
        console.log('Generated message:', message)
        // Auto-copy only successful commit messages to clipboard
        await navigator.clipboard.writeText(message)
      } else {
        throw new Error('No message generated')
      }
      
    } catch (error) {
      console.error('Error generating commit message:', error)
      
      // Handle API errors
      if (error.message && (error.message.includes('429') || error.message.includes('quota') || error.message.includes('limit'))) {
        setGeneratedMessage('Gemini API quota exceeded. Free tier has limits. Please try again later or check billing.')
        alert('⚠️ Gemini API quota exceeded\n\nFree tier has usage limits. Please try again later or consider upgrading your plan.')
      } else if (error.message && error.message.includes('All models failed')) {
        setGeneratedMessage('All AI models are currently unavailable. Please try again later.')
        alert('⚠️ All AI models unavailable\n\nAll Gemini models are currently experiencing issues. Please try again in a few minutes.')
      } else {
        setGeneratedMessage('Failed to generate commit message. Please try again.')
        alert('⚠️ Generation failed\n\nUnable to generate commit message. Please try again.')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  
  const copyGeneratedMessage = () => {
    if (generatedMessage && !generatedMessage.includes('API') && !generatedMessage.includes('Failed') && !generatedMessage.includes('quota') && !generatedMessage.includes('unavailable') && !generatedMessage.includes('forbidden') && !generatedMessage.includes('not found')) {
      navigator.clipboard.writeText(generatedMessage).then(() => {
        // Could add a toast notification here
      })
    }
  }

  return (
    <ModalPortal>
      <div className={styles.diffModalOverlay} onClick={onClose}>
        <div className={styles.diffModalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.diffModalHeader}>
            <h3>Git Cached Diff</h3>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'diff' ? styles.active : ''}`}
                onClick={() => setViewMode('diff')}
              >
                Diff
              </button>
              <button
                className={`${styles.toggleBtn} ${viewMode === 'message' ? styles.active : ''}`}
                onClick={() => setViewMode('message')}
                disabled={!isValidMessage(generatedMessage)}
              >
                AI Message
              </button>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.generateBtn} ${isGenerating ? styles.generating : ''}`}
                onClick={generateCommitMessage}
                title="Generate commit message with AI"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Sparkles size={18} className={styles.spinning} />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>AI Commit</span>
                  </>
                )}
              </button>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                onClick={handleCopy}
                title={viewMode === 'message' && isValidMessage(generatedMessage) ? "Copy commit message to clipboard" : "Copy diff to clipboard"}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          {viewMode === 'message' && isValidMessage(generatedMessage) ? (
            <div className={styles.diffModalBody}>
              <div className={styles.generatedMessageContainer}>
                <div className={styles.generatedMessageHeader}>
                  <h4>Generated Commit Message</h4>
                </div>
                <div className={styles.generatedMessageContent}>
                  <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '14px', lineHeight: '1.5'}}>{generatedMessage}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.diffModalBody}>
              <pre className={styles.diffText}>{displayDiff}</pre>
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  )
}
