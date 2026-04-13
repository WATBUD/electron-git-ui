import React, { useState } from 'react'
import { Copy, Check, X, Sparkles } from 'lucide-react'
import { ModalPortal } from '../ModalPortal'
import styles from './DiffModal.module.css'

export const DiffModal = ({ diff, onClose, show }) => {
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedMessage, setGeneratedMessage] = useState('')

  if (!show) return null
  const displayDiff = diff || 'No staged changes found.'

  const handleCopy = () => {
    navigator.clipboard.writeText(displayDiff).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const generateCommitMessage = async () => {
    setIsGenerating(true)
    setGeneratedMessage('')
    
    try {
      // Use the API key directly
      const apiKey = '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'
      console.log('API Key check:', apiKey ? 'Key exists' : 'No key found')
      
      if (!apiKey) {
        console.error('OpenAI API key not configured')
        return
      }
      
      // Limit diff content to avoid 431 error
      const maxDiffLength = 6000
      const truncatedDiff = displayDiff.length > maxDiffLength 
        ? displayDiff.substring(0, maxDiffLength) + '\n... (truncated)'
        : displayDiff
      
      console.log('Making API request...')
      
      // Call GPT API directly with optimized request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Generate conventional commit messages. Format: type(scope): description.'
            },
            {
              role: 'user',
              content: `Generate commit message:\n\n${truncatedDiff}`
            }
          ],
          max_tokens: 40,
          temperature: 0.3
        })
      })

      console.log('API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`API request failed: ${response.status}`)
      }

      const data = await response.json()
      console.log('API Response data:', data)
      const message = data.choices[0]?.message?.content?.trim()
      
      if (message) {
        setGeneratedMessage(message)
        console.log('Generated message:', message)
        // Auto-copy to clipboard
        await navigator.clipboard.writeText(message)
      } else {
        throw new Error('No message generated')
      }
      
    } catch (error) {
      console.error('Error generating commit message:', error)
      
      // Check if it's a quota exceeded error (429)
      if (error.message && error.message.includes('429')) {
        console.log('API quota exceeded, opening ChatGPT as fallback')
        const prompt = `Generate conventional commit message for this diff:\n\n${displayDiff.substring(0, 2000)}`
        const chatGptUrl = `https://chat.openai.com/?q=${encodeURIComponent(prompt)}`
        window.open(chatGptUrl, '_blank')
      }
    } finally {
      setIsGenerating(false)
      console.log('Generation completed, loading state set to false')
    }
  }

  const copyGeneratedMessage = () => {
    if (generatedMessage) {
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
                title="Copy diff to clipboard"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          {generatedMessage && (
            <div className={styles.generatedMessageContainer}>
              <div className={styles.generatedMessageHeader}>
                <h4>Generated Commit Message</h4>
                <button
                  className={styles.copyGeneratedBtn}
                  onClick={copyGeneratedMessage}
                  title="Copy generated message"
                >
                  <Copy size={16} />
                </button>
              </div>
              <div className={styles.generatedMessageContent}>
                <code>{generatedMessage}</code>
              </div>
            </div>
          )}
          <div className={styles.diffModalBody}>
            <pre className={styles.diffText}>{displayDiff}</pre>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}
