import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { X, Copy, Check } from 'lucide-react'
import { getCommitDiff } from '../../store/git/gitThunks'
import styles from './CommitDiffModal.module.css'

// Split `git show` output into per-file sections so each can be viewed individually.
const parseDiff = (diffText) => {
  const text = diffText || ''
  if (!text) return { header: '', files: [] }

  const lines = text.split('\n')
  const fileStartIdxs = []
  lines.forEach((line, idx) => {
    if (line.startsWith('diff --git ')) fileStartIdxs.push(idx)
  })

  const headerLines = fileStartIdxs.length > 0
    ? lines.slice(0, fileStartIdxs[0])
    : lines
  const filteredHeaderLines = headerLines.filter(
    (l) =>
      !/^AuthorDate:/i.test(l) &&
      !/^Commit:/i.test(l) &&
      !/^commit\s+[0-9a-f]{7,}/i.test(l)
  )
  const metaLines = []
  const bodyLines = []
  let inBody = false
  for (const l of filteredHeaderLines) {
    if (!inBody) {
      if (/^[A-Z][A-Za-z]*:/.test(l)) {
        metaLines.push(l.replace(/^([A-Za-z]+:)\s+/, '$1 '))
      } else if (l.trim() === '') {
        inBody = true
      } else {
        inBody = true
        bodyLines.push(l)
      }
    } else {
      bodyLines.push(l)
    }
  }
  const messageBody = bodyLines
    .map((l) => l.replace(/^ {4}/, ''))
    .join('\n')
    .trim()
  const header = [
    metaLines.join('\n'),
    messageBody ? `Message: ${messageBody}` : ''
  ]
    .filter(Boolean)
    .join('\n')
    .trim()

  const files = fileStartIdxs.map((startIdx, i) => {
    const endIdx = i + 1 < fileStartIdxs.length ? fileStartIdxs[i + 1] : lines.length
    const sectionLines = lines.slice(startIdx, endIdx)
    let path = null
    for (const l of sectionLines) {
      if (l.startsWith('+++ b/')) {
        path = l.slice(6)
        break
      }
    }
    if (!path) {
      const m = sectionLines[0].match(/^diff --git a\/(.+?) b\/(.+)$/)
      if (m) path = m[2]
    }
    return { path: path || `file-${i}`, lines: sectionLines }
  })

  return { header, files }
}

const diffLineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---')) return styles.diffMeta
  if (line.startsWith('@@')) return styles.diffHunk
  if (line.startsWith('+')) return styles.diffAdd
  if (line.startsWith('-')) return styles.diffDel
  if (
    line.startsWith('diff ') ||
    line.startsWith('index ') ||
    line.startsWith('new file') ||
    line.startsWith('deleted file') ||
    line.startsWith('similarity ') ||
    line.startsWith('rename ')
  ) {
    return styles.diffMeta
  }
  return styles.diffContext
}

const MIN_LIST_WIDTH = 160
const MAX_LIST_WIDTH = 600
const DEFAULT_LIST_WIDTH = 280

export const CommitDiffModal = ({ commit, onClose }) => {
  const dispatch = useDispatch()
  const [files, setFiles] = useState([])
  const [diff, setDiff] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH)
  const [copied, setCopied] = useState(false)
  const splitRef = useRef(null)
  const draggingRef = useRef(false)

  const handleCopyHash = useCallback(async () => {
    const hash = commit?.hash || commit?.shortHash
    if (!hash) return
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard errors
    }
  }, [commit])

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current || !splitRef.current) return
      const rect = splitRef.current.getBoundingClientRect()
      const next = Math.min(
        MAX_LIST_WIDTH,
        Math.max(MIN_LIST_WIDTH, e.clientX - rect.left)
      )
      setListWidth(next)
    }
    const handleUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  useEffect(() => {
    if (!commit) return
    let cancelled = false

    setFiles([])
    setDiff('')
    setError(null)
    setSelectedKey(null)
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

  const parsedDiffFiles = useMemo(() => parseDiff(diff), [diff])

  useEffect(() => {
    if (selectedKey !== null) return
    if (parsedDiffFiles.files.length > 0) {
      setSelectedKey(parsedDiffFiles.files[0].path)
    }
  }, [parsedDiffFiles, selectedKey])

  const selectedFile = useMemo(() => {
    if (selectedKey === null) return null
    return parsedDiffFiles.files.find((f) => f.path === selectedKey) || null
  }, [parsedDiffFiles, selectedKey])

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
          {parsedDiffFiles.header ? (
            <pre className={styles.commitDiffHeaderText}>
              {(() => {
                const allLines = parsedDiffFiles.header.split('\n')
                const messageIdx = allLines.findIndex((l) => l.startsWith('Message:'))
                return allLines.map((line, idx) => {
                  const isMessage = messageIdx >= 0 && idx >= messageIdx
                  const labelMatch = !isMessage && line.match(/^([A-Za-z]+:)\s*(.*)$/)
                  if (isMessage) {
                    const text =
                      idx === messageIdx ? line.replace(/^Message:\s*/, '') : line
                    return (
                      <div key={idx} className={styles.commitDiffHeaderRow}>
                        {idx === messageIdx && (
                          <span className={styles.commitDiffHeaderLabel}>Message</span>
                        )}
                        <span className={styles.commitDiffHeaderMessage}>
                          {text || ' '}
                        </span>
                      </div>
                    )
                  }
                  if (labelMatch) {
                    return (
                      <div key={idx} className={styles.commitDiffHeaderRow}>
                        <span className={styles.commitDiffHeaderLabel}>
                          {labelMatch[1].replace(':', '')}
                        </span>
                        <span className={styles.commitDiffHeaderValue}>
                          {labelMatch[2] || ' '}
                        </span>
                      </div>
                    )
                  }
                  return (
                    <div key={idx} className={styles.commitDiffHeaderRow}>
                      <span className={styles.commitDiffHeaderValue}>{line || ' '}</span>
                    </div>
                  )
                })
              })()}
            </pre>
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
            <div className={styles.commitDiffSplit} ref={splitRef}>
              <div
                className={styles.commitDiffFileList}
                style={{ width: `${listWidth}px` }}
              >
                {parsedDiffFiles.files.map((f) => {
                  const meta = files.find(
                    (it) => it.file === f.path || it.oldFile === f.path
                  )
                  const status = meta?.status
                  const isActive = selectedKey === f.path
                  const displayName = meta?.oldFile
                    ? `${meta.oldFile} → ${meta.file}`
                    : f.path
                  return (
                    <button
                      key={f.path}
                      type="button"
                      className={`${styles.commitDiffFileItem} ${
                        isActive ? styles.commitDiffFileItemActive : ''
                      }`}
                      onClick={() => setSelectedKey(f.path)}
                      title={displayName}
                    >
                      {status && (
                        <span
                          className={`${styles.commitDiffFileStatus} ${
                            styles[`status_${status.charAt(0)}`] || ''
                          }`}
                        >
                          {status}
                        </span>
                      )}
                      <span className={styles.commitDiffFileName}>{displayName}</span>
                    </button>
                  )
                })}
              </div>
              <div
                className={styles.commitDiffResizer}
                onMouseDown={handleResizeStart}
                role="separator"
                aria-orientation="vertical"
              />
              <div className={styles.commitDiffDetail}>
                {selectedFile ? (
                  <pre className={styles.commitDiffContent}>
                    {selectedFile.lines.map((line, idx) => (
                      <div key={idx} className={diffLineClass(line)}>
                        {line || ' '}
                      </div>
                    ))}
                  </pre>
                ) : (
                  <div className={styles.commitDiffEmpty}>Select a file to view its diff</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommitDiffModal
