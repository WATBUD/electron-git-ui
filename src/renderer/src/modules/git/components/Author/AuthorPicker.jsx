/* eslint-disable react/prop-types */
import React from 'react'
import { useSelector } from 'react-redux'
import { Check, ChevronDown, Users } from 'lucide-react'
import { loadAuthorHistory } from '../../../../shared/utils/authorHistory'
import styles from './AuthorPicker.module.css'

const keyOf = (a) => `${a.name}\u0000${(a.email || '').toLowerCase()}`

/**
 * Dropdown of every author identity used on this machine: ones saved through the
 * UI (most recent first) plus those found in the global config and each local
 * project's config. Picking one calls `onPick({ name, email })`.
 */
export const AuthorPicker = ({ current, onPick }) => {
  const projects = useSelector((state) => state.git.projects)
  const [open, setOpen] = React.useState(false)
  const [authors, setAuthors] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    const history = loadAuthorHistory()
    let scanned = []
    try {
      const result = await window.git.listKnownAuthors(projects || [])
      if (result?.success) scanned = result.data.authors
    } catch {
      // fall back to history only
    }
    const merged = new Map()
    history.forEach((a) => merged.set(keyOf(a), { ...a, sources: [], recent: true }))
    scanned.forEach((a) => {
      const existing = merged.get(keyOf(a))
      if (existing) existing.sources = a.sources
      else merged.set(keyOf(a), { ...a, recent: false })
    })
    setAuthors([...merged.values()])
    setLoading(false)
  }, [projects])

  const toggle = () => {
    if (!open) load()
    setOpen((v) => !v)
  }

  const currentKey = current ? keyOf(current) : ''

  return (
    <div className={styles.picker}>
      <button type="button" className={styles.trigger} onClick={toggle} aria-expanded={open}>
        <Users size={12} />
        <span>選擇用過的 Author</span>
        <ChevronDown size={12} className={open ? styles.chevronOpen : ''} />
      </button>
      {open && (
        <div className={styles.list} role="listbox">
          {loading && <div className={styles.empty}>讀取中…</div>}
          {!loading && authors.length === 0 && <div className={styles.empty}>還沒有紀錄</div>}
          {!loading &&
            authors.map((a) => {
              const active = keyOf(a) === currentKey
              return (
                <button
                  type="button"
                  key={keyOf(a)}
                  role="option"
                  aria-selected={active}
                  className={`${styles.item} ${active ? styles.itemActive : ''}`}
                  onClick={() => {
                    onPick({ name: a.name, email: a.email })
                    setOpen(false)
                  }}
                >
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{a.name || '（未設定名稱）'}</span>
                    <span className={styles.itemEmail}>{a.email || '（未設定 Email）'}</span>
                    {a.sources?.length > 0 && (
                      <span className={styles.itemSources}>
                        {a.sources.length > 2
                          ? `${a.sources.slice(0, 2).join('、')} 等 ${a.sources.length} 處`
                          : a.sources.join('、')}
                      </span>
                    )}
                  </span>
                  {active && <Check size={13} className={styles.itemCheck} />}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

export default AuthorPicker
