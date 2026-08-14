/* eslint-disable react/prop-types */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { X, Copy, Check, ArrowUpDown } from 'lucide-react'
import { getCommitDiff, getRangeDiff } from '../../store/git/gitThunks'
import { DiffViewer, parseDiff } from '../Diff'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import styles from './CommitDiffModal.module.css'

const baseName = (p) => p.split('/').pop()
const extOf = (p) => {
  const b = baseName(p)
  const i = b.lastIndexOf('.')
  return i > 0 ? b.slice(i + 1).toLowerCase() : ''
}
// Broad category so "File type" groups all images / scripts / styles together
// regardless of their specific extension (distinct from an A–Z extension sort).
const TYPE_BY_EXT = {
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  bmp: 'image',
  avif: 'image',
  css: 'style',
  scss: 'style',
  sass: 'style',
  less: 'style',
  js: 'script',
  jsx: 'script',
  ts: 'script',
  tsx: 'script',
  mjs: 'script',
  cjs: 'script',
  vue: 'script',
  html: 'markup',
  htm: 'markup',
  xml: 'markup',
  json: 'config',
  yml: 'config',
  yaml: 'config',
  toml: 'config',
  ini: 'config',
  env: 'config',
  lock: 'config',
  md: 'doc',
  txt: 'doc',
  pdf: 'doc'
}
const typeOf = (p) => TYPE_BY_EXT[extOf(p)] || 'other'

const SORT_MODES = [
  { key: 'path', label: 'Default order' },
  { key: 'name', label: 'File name' },
  { key: 'type', label: 'File type' },
  { key: 'ext', label: 'File extension' }
]

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
              {idx === messageIdx && <span className={styles.commitDiffHeaderLabel}>Message</span>}
              <span className={styles.commitDiffHeaderMessage}>{text || ' '}</span>
            </div>
          )
        }
        const labelMatch = line.match(/^([A-Za-z]+:)\s*(.*)$/)
        if (labelMatch) {
          return (
            <div key={idx} className={styles.commitDiffHeaderRow}>
              <span className={styles.commitDiffHeaderLabel}>{labelMatch[1].replace(':', '')}</span>
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

// `compare` (optional): { fromRef, fromLabel } switches the modal to a
// cumulative range diff — all changes to go from `fromRef` to the clicked
// commit — instead of showing just that commit's own diff.
export const CommitDiffModal = ({ commit, onClose, compare }) => {
  const dispatch = useDispatch()
  const [files, setFiles] = useState([])
  const [diff, setDiff] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [sortMode, setSortMode] = useState('path')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef(null)

  useEffect(() => {
    if (!sortOpen) return
    const onDown = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sortOpen])

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

    // Base = the clicked commit, target = the current branch tip (compare.fromRef,
    // e.g. HEAD). This way the changes accumulated between them read as additions
    // (+) — the work the branch has on top of that commit — not removals.
    const request = compare?.fromRef
      ? dispatch(getRangeDiff({ fromRef: commit.hash, toRef: compare.fromRef }))
      : dispatch(getCommitDiff(commit.hash))

    request
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
  }, [commit, compare?.fromRef, dispatch])

  const parsed = useMemo(() => parseDiff(diff), [diff])

  const sortedFiles = useMemo(() => {
    if (sortMode === 'path') return parsed.files
    const cmpName = (a, b) =>
      baseName(a.path).toLowerCase().localeCompare(baseName(b.path).toLowerCase())
    const arr = [...parsed.files]
    if (sortMode === 'name') arr.sort(cmpName)
    else if (sortMode === 'ext')
      arr.sort((a, b) => extOf(a.path).localeCompare(extOf(b.path)) || cmpName(a, b))
    else if (sortMode === 'type')
      arr.sort((a, b) => typeOf(a.path).localeCompare(typeOf(b.path)) || cmpName(a, b))
    return arr
  }, [parsed.files, sortMode])

  if (!commit) return null

  return (
    <ModalPortal>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div
          className={`${styles.macModal} ${styles.commitDiffModal}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.commitDiffHeader}>
            <div className={styles.commitDiffTitleRow}>
              <span className={styles.commitDiffHashLabel}>
                {compare?.fromRef ? 'Compare' : 'Commit'}
              </span>
              <h3 className={styles.commitDiffHash} title={commit.hash}>
                {compare?.fromRef
                  ? `${commit.shortHash || commit.hash} → ${compare.fromLabel || compare.fromRef}`
                  : commit.hash || commit.shortHash}
              </h3>
              <button
                className={styles.commitDiffCopy}
                onClick={handleCopyHash}
                title={copied ? 'Copied!' : 'Copy hash'}
                type="button"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <div className={styles.sortWrap} ref={sortRef}>
                <button
                  className={styles.commitDiffCopy}
                  onClick={() => setSortOpen((o) => !o)}
                  title="Sort files"
                  type="button"
                >
                  <ArrowUpDown size={14} />
                </button>
                {sortOpen && (
                  <div className={styles.sortMenu}>
                    {SORT_MODES.map((s) => (
                      <button
                        key={s.key}
                        className={styles.sortItem}
                        onClick={() => {
                          setSortMode(s.key)
                          setSortOpen(false)
                        }}
                        type="button"
                      >
                        {sortMode === s.key ? (
                          <Check size={12} />
                        ) : (
                          <span className={styles.sortCheckSpacer} />
                        )}
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className={styles.commitDiffTitleSpacer} />
              <button className={styles.commitDiffClose} onClick={onClose} title="Close">
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
              <DiffViewer
                parsedFiles={sortedFiles}
                fileMeta={files}
                // Preview images at the target version: the commit itself, or
                // (range mode) the branch tip the diff runs up to.
                previewRef={compare?.fromRef || commit.hash}
              />
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default CommitDiffModal
