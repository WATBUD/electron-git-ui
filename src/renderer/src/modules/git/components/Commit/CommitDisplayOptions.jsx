import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SlidersHorizontal, Check } from 'lucide-react'
import { TEXT_SIZE, ICON_SIZE } from './constants'
import styles from './CommitDisplayOptions.module.css'

const STORAGE_KEY = 'branchList:commitDisplay'
const DEFAULT_OPTIONS = {
  hash: true,
  author: true,
  date: true,
  tags: true,
  branches: true,
  message: true
}

const FIELDS = [
  { key: 'hash', label: 'Hash' },
  { key: 'author', label: 'Author' },
  { key: 'date', label: 'Date' },
  { key: 'tags', label: 'Tags' },
  { key: 'branches', label: 'Branch tips' },
  { key: 'message', label: 'Message' }
]

export const useCommitDisplayOptions = () => {
  const [options, setOptions] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT_OPTIONS, ...JSON.parse(raw) }
    } catch {
      /* ignore */
    }
    return DEFAULT_OPTIONS
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(options))
    } catch {
      /* ignore */
    }
  }, [options])

  const toggle = (key) => setOptions((prev) => ({ ...prev, [key]: !prev[key] }))
  return { options, toggle }
}

/**
 * Popover with per-field visibility toggles for the commit row.
 * Renders an icon button + dropdown panel; click-outside closes.
 */
export const CommitDisplayOptionsMenu = ({ options, toggle }) => {
  const [open, setOpen] = useState(false)
  // Panel uses `position: fixed` so an ancestor's `overflow: hidden` can't clip
  // it. We snapshot the button's viewport coords when opening.
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const panelRef = useRef(null)

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const panelWidth = TEXT_SIZE * 16.6
      // Open rightward by default (panel's left edge = button's left edge);
      // if it would overflow viewport, fall back to right-aligned.
      let left = rect.left
      if (left + panelWidth > window.innerWidth - 4) {
        left = Math.max(4, rect.right - panelWidth)
      }
      setPos({ top: rect.bottom + 4, left })
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!buttonRef.current?.contains(e.target) && !panelRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Render the panel via portal so it isn't trapped inside an ancestor's
  // containing block (BranchList has `backdrop-filter`, which makes any
  // `position: fixed` descendant resolve against the BranchList box instead
  // of the viewport — causing misalignment with viewport-coord rects).
  const panel = open
    ? createPortal(
        <div
          ref={panelRef}
          className={styles.displayOptionsPanel}
          style={{
            top: pos.top,
            left: pos.left,
            width: `${TEXT_SIZE * 16.6}px`
          }}
        >
          <div className={styles.displayOptionsHeader} style={{ fontSize: `${TEXT_SIZE - 2}px` }}>
            Show in commit row
          </div>
          {FIELDS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={styles.displayOptionsItem}
              style={{ fontSize: `${TEXT_SIZE}px` }}
              onClick={() => toggle(key)}
            >
              <span
                className={styles.displayOptionsCheck}
                style={{
                  width: `${ICON_SIZE + 2}px`,
                  height: `${ICON_SIZE + 2}px`
                }}
              >
                {options[key] && <Check size={ICON_SIZE} />}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>,
        document.body
      )
    : null

  return (
    <div className={styles.displayOptionsWrap}>
      <button
        ref={buttonRef}
        type="button"
        className={`${styles.displayOptionsBtn} ${open ? styles.displayOptionsBtnOpen : ''}`}
        style={{
          width: `${ICON_SIZE + 8}px`,
          height: `${ICON_SIZE + 6}px`
        }}
        onClick={handleToggle}
        title="Commit display options"
      >
        <SlidersHorizontal size={ICON_SIZE + 1} />
      </button>
      {panel}
    </div>
  )
}

export default CommitDisplayOptionsMenu
