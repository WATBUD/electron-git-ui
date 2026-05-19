import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { X, Copy, Check } from 'lucide-react'
import { getCommitDiff } from '../../store/git/gitThunks'
import { DiffViewer, parseDiff } from '../Diff'
import styles from './CommitDiffModal.module.css'

// Renders the commit metadata header (Author / CommitDate / Message) with
// proper label/value alignment + color hierarchy.
const CommitMetadataHeader = ({ headerText }) => {
  const lines = headerText.split('\n')
  const messageIdx = lines.findIndex((l) => l.startsWith('Message:'))
  return (
    <pre className={styles.commitDiffHeaderText}>
      {lines.map((line, idx) => {
        const isMessage = messageIdx >= 0 && idx >= messageIdx
        if (isMessage) {
          const text = idx === messageIdx ? line.replace(/^Message:\s*/, '') : line
          return (
            <div key={idx} className={styles.commitDiffHeaderRow}>
              {idx === messageIdx && (
                <span className={styles.commitDiffHeaderLabel}>Message</span>
              )}
              <span className={styles.commitDiffHeaderMessage}>{text || ' '}</span>
            </div>
          )
        }
        const labelMatch = line.match(/^([A-Za-z]+:)\s*(.*)$/)
        if (labelMatch) {
          return (
            <div key={idx} className={styles.commitDiffHeaderRow}>
              <span className={styles.commitDiffHeaderLabel}>
                {labelMatch[1].replace(':', '')}
              </span>
              <span className={styles.commitDiffHeaderValue}>{labelMatch[2] || ' '}</span>
            </div>
          )
        }
        return (
          <div key={idx} className={styles.commitDiffHeaderRow}>
            <span className={styles.commitDiffHeaderValue}>{line || ' '}</span>
          </div>
        )
      })}
    </pre>
  )
}

export const CommitDiffModal = ({ commit, onClose }) => {
  const dispatch = useDispatch()
  const [files, setFiles] = useState([])
  const [diff, setDiff] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const handleCopyHash = useCallback(async () => {
    const hash = commit?.hash || commit?.shortHash
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard errors (focus / permission)
    }
  }, [commit])

  useEffect(() => {
    if (!commit) return
    let cancelled = false

    setFiles([])
    setDiff('')
    setError(null)
    setLoading(true)

    dispatch(getCommitDiff(commit.hash))
      .unwrap()
      .then((result) => {
        if (cancelled) return
        setFiles(result.data?.files || [])
        setDiff(result.data?.diff || '')
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError((typeof err === 'string' ? err : err?.message) || 'Failed to load commit diff')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [commit, dispatch])

  const parsed = useMemo(() => parseDiff(diff), [diff])

  if (!commit) return null

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.macModal} ${styles.commitDiffModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.commitDiffHeader}>
          <div className={styles.commitDiffTitleRow}>
            <span className={styles.commitDiffHashLabel}>Commit</span>
            <h3 className={styles.commitDiffHash} title={commit.hash}>
              {commit.hash || commit.shortHash}
            </h3>
            <button
              className={styles.commitDiffCopy}
              onClick={handleCopyHash}
              title={copied ? 'Copied!' : 'Copy hash'}
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <span className={styles.commitDiffTitleSpacer} />
            <button
              className={styles.commitDiffClose}
              onClick={onClose}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
          {parsed.header ? (
            <CommitMetadataHeader headerText={parsed.header} />
          ) : (
            <>
              <span className={styles.commitDiffSubject}>{commit.message}</span>
              <div className={styles.commitDiffMeta}>
                <span>{commit.author}</span>
                <span>{commit.date}</span>
              </div>
            </>
          )}
        </div>
        <div className={styles.commitDiffBody}>
          {loading ? (
            <div className={styles.commitDiffLoading}>Loading...</div>
          ) : error ? (
            <div className={styles.commitDiffError}>{error}</div>
          ) : (
            <DiffViewer parsedFiles={parsed.files} fileMeta={files} />
          )}
        </div>
      </div>
    </div>
  )
}

export default CommitDiffModal
