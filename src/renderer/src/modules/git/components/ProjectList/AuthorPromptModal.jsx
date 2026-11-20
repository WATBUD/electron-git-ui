/* eslint-disable react/prop-types */
import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { User, X } from 'lucide-react'
import { ModalPortal } from '../../../../shared/components/ModalPortal'
import { useOverlayDismiss } from '../../../../shared/hooks/useOverlayDismiss'
import { fetchUserConfig } from '../../store/git'
import { AuthorPicker } from '../Author/AuthorPicker'
import { rememberAuthor } from '../../../../shared/utils/authorHistory'
import styles from './ProjectList.module.css'

const SCOPE_LABEL = {
  local: '此專案已設定',
  global: '沿用全域設定',
  none: '尚未設定'
}

/**
 * Shown whenever a new project is opened / cloned: displays the author git will
 * use for commits in that repo and lets the user either keep it or change it
 * (saved to the repo's local config).
 */
export const AuthorPromptModal = ({ repoPath, onClose }) => {
  const dispatch = useDispatch()
  const currentRepoPath = useSelector((state) => state.git.repoPath)
  const overlayProps = useOverlayDismiss(onClose)

  const [loading, setLoading] = React.useState(true)
  const [config, setConfig] = React.useState({ name: '', email: '', scope: 'none' })
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState({ name: '', email: '' })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState('')

  const projectName = repoPath.split(/[/\\]/).pop() || repoPath

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await window.git.getUserConfig(repoPath)
      if (cancelled) return
      if (result?.success) {
        setConfig(result.data)
        setDraft({ name: result.data.name, email: result.data.email })
        // Nothing configured yet → go straight to the edit form.
        if (result.data.scope === 'none') setEditing(true)
      } else {
        setError(result?.message || '無法讀取 Author')
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [repoPath])

  const canSave = draft.name.trim() && draft.email.trim() && !saving

  const handleSave = async (e) => {
    e?.preventDefault?.()
    if (!canSave) return
    setSaving(true)
    setError('')
    try {
      const result = await window.git.setUserConfig(
        { name: draft.name, email: draft.email },
        repoPath
      )
      if (!result?.success) {
        setError(result?.message || '儲存失敗')
        return
      }
      rememberAuthor(draft.name, draft.email)
      // Keep the toolbar's author badge in sync when this is the open repo.
      if (repoPath === currentRepoPath) dispatch(fetchUserConfig())
      onClose()
    } catch (err) {
      setError(err.message || '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const hasAuthor = Boolean(config.name || config.email)

  return (
    <ModalPortal>
      <div className={styles.modalBackdrop} {...overlayProps}>
        <form className={styles.cloneModal} onSubmit={handleSave}>
          <div className={styles.modalHeader}>
            <div>
              <h3>確認 Author</h3>
              <p>「{projectName}」的 commit 會使用以下身分</p>
            </div>
            <button type="button" onClick={onClose} title="保留目前 Author 並關閉">
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className={styles.authorLoading}>讀取中…</div>
          ) : (
            <>
              <div className={styles.authorCard}>
                <User size={16} className={styles.authorCardIcon} />
                <div className={styles.authorCardText}>
                  <div className={styles.authorCardName}>{config.name || '（未設定名稱）'}</div>
                  <div className={styles.authorCardEmail}>{config.email || '（未設定 Email）'}</div>
                </div>
                <span className={`${styles.authorScope} ${styles[`scope_${config.scope}`] || ''}`}>
                  {SCOPE_LABEL[config.scope] || SCOPE_LABEL.none}
                </span>
              </div>

              {config.scope === 'global' && !editing && (
                <p className={styles.authorHint}>
                  這個專案沒有自己的設定，使用的是全域 Author。若這是不同帳號（例如公司 /
                  個人）的專案，建議改成專屬身分。
                </p>
              )}

              {editing && (
                <>
                  <AuthorPicker
                    current={{ name: draft.name.trim(), email: draft.email.trim() }}
                    onPick={(a) => setDraft({ name: a.name, email: a.email })}
                  />
                  <label>
                    Name
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                      placeholder="user.name"
                      autoFocus
                      spellCheck={false}
                    />
                  </label>
                  <label>
                    Email
                    <input
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                      placeholder="user.email"
                      spellCheck={false}
                    />
                  </label>
                  <p className={styles.authorHint}>
                    儲存後只會套用到這個專案（寫入該專案的 local config）。
                  </p>
                </>
              )}
            </>
          )}

          {error && <div className={styles.cloneError}>{error}</div>}

          <div className={styles.modalActions}>
            {editing ? (
              <>
                {hasAuthor && (
                  <button type="button" onClick={() => setEditing(false)} disabled={saving}>
                    返回
                  </button>
                )}
                <button type="submit" disabled={!canSave}>
                  {saving ? '儲存中…' : '儲存為此專案的 Author'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setEditing(true)} disabled={loading}>
                  修改 Author
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={onClose}
                  disabled={loading}
                >
                  使用目前 Author
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </ModalPortal>
  )
}

export default AuthorPromptModal
