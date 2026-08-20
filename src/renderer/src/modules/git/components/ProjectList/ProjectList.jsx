import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  addProject,
  openRepository,
  selectRepository,
  removeProject,
  reorderProjects
} from '../../store/git'
import {
  Folder,
  Plus,
  Trash2,
  GripVertical,
  Folders,
  GitFork,
  RefreshCw,
  Search,
  FolderOpen,
  ArrowDownUp
} from 'lucide-react'
import styles from './ProjectList.module.css'

// The project still uses plain JavaScript and does not ship the prop-types
// runtime; the callback is optional and guarded at every call site.
// eslint-disable-next-line react/prop-types
const ProjectList = ({ onProjectSelect }) => {
  const projects = useSelector((state) => state.git.projects || [])
  const currentRepoPath = useSelector((state) => state.git.repoPath)
  const loading = useSelector((state) => state.git.loading)
  const dispatch = useDispatch()
  const [draggedItemIndex, setDraggedItemIndex] = React.useState(null)
  const [scope, setScope] = React.useState('local')
  const [githubUser, setGithubUser] = React.useState('')
  const [userCode, setUserCode] = React.useState('')
  const [remoteProjects, setRemoteProjects] = React.useState([])
  const [remoteLoading, setRemoteLoading] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const [cloneBusy, setCloneBusy] = React.useState(false)
  const [cloneError, setCloneError] = React.useState('')
  const [cloneParent, setCloneParent] = React.useState(
    () => localStorage.getItem('git_clone_parent') || ''
  )
  const [remoteSearch, setRemoteSearch] = React.useState('')
  const [visibility, setVisibility] = React.useState('all')
  // Sort by whether the repo is already cloned locally. Cycles on one button:
  // 'none' → 'local' (already-cloned first) → 'remote' (remote-only first).
  const [sortMode, setSortMode] = React.useState('none')

  const visibleRemoteProjects = React.useMemo(() => {
    const query = remoteSearch.trim().toLowerCase()
    // A repo counts as "local" when a local project shares its name.
    const isRepoLocal = (project) =>
      projects.some(
        (path) => (path.split(/[/\\]/).pop() || path).toLowerCase() === project.name.toLowerCase()
      )
    const filtered = remoteProjects.filter((project) => {
      if (visibility === 'private' && !project.isPrivate) return false
      if (visibility === 'public' && project.isPrivate) return false
      if (!query) return true
      return `${project.name} ${project.description || ''}`.toLowerCase().includes(query)
    })
    if (sortMode === 'none') return filtered
    return [...filtered].sort((a, b) => {
      const la = isRepoLocal(a) ? 1 : 0
      const lb = isRepoLocal(b) ? 1 : 0
      return sortMode === 'local' ? lb - la : la - lb
    })
  }, [remoteProjects, remoteSearch, visibility, sortMode, projects])

  const handleProjectDoubleClick = (path) => {
    if (path === currentRepoPath) {
      onProjectSelect?.()
      return
    }
    dispatch(openRepository(path)).then((result) => {
      // Only switch into the Branches tab when the repo actually opened — a
      // missing/invalid folder rejects, and we should stay on the project list.
      if (openRepository.fulfilled.match(result)) {
        onProjectSelect?.()
      }
    })
  }

  const handleRemoveProject = (e, path) => {
    e.stopPropagation()
    dispatch(removeProject(path))
  }

  const handleAddProject = () => {
    dispatch(selectRepository())
  }

  const loadRemoteProjects = React.useCallback(async () => {
    setRemoteLoading(true)
    setCloneError('')
    const result = await window.git.listRemoteRepositories(null, cloneParent)
    if (result?.success) {
      setRemoteProjects(result.data.repositories || [])
      setAuthenticated(Boolean(result.data.authenticated))
    } else {
      setCloneError(result?.message || 'Unable to load repositories')
    }
    setRemoteLoading(false)
  }, [cloneParent])

  const selectCloneDirectory = async () => {
    const result = await window.git.selectCloneDirectory()
    if (!result?.success || result.data.canceled) return ''
    const path = result.data.path
    setCloneParent(path)
    localStorage.setItem('git_clone_parent', path)
    return path
  }

  const refreshAuth = React.useCallback(async () => {
    const result = await window.git.githubAuthStatus()
    const connected = Boolean(result?.data?.connected)
    setAuthenticated(connected)
    setGithubUser(result?.data?.login || '')
    return connected
  }, [])

  const connectGithub = async () => {
    setRemoteLoading(true)
    setCloneError('')
    const started = await window.git.githubAuthStart()
    if (!started?.success) {
      setCloneError(started?.message || '無法啟動 GitHub 授權。')
      setRemoteLoading(false)
      return
    }
    setUserCode(started.data.userCode)
    const interval = Math.max(5, started.data.interval || 5) * 1000
    const poll = async () => {
      const result = await window.git.githubAuthPoll()
      if (result?.success && result.data.connected) {
        setUserCode('')
        await refreshAuth()
        await loadRemoteProjects()
      } else if (result?.success && result.data.pending) {
        window.setTimeout(poll, interval)
      } else {
        setCloneError(result?.message || 'GitHub 授權失敗。')
        setRemoteLoading(false)
      }
    }
    window.setTimeout(poll, interval)
  }

  React.useEffect(() => {
    if (scope !== 'remote') return
    refreshAuth().then((connected) => {
      if (connected && remoteProjects.length === 0) loadRemoteProjects()
    })
  }, [scope, remoteProjects.length, loadRemoteProjects, refreshAuth])

  const handleClone = async (project) => {
    if (cloneBusy) return
    const destination = cloneParent || (await selectCloneDirectory())
    if (!destination) return
    setCloneBusy(true)
    setCloneError('')
    try {
      // Let React paint the loading state before starting the IPC operation.
      // Without this frame boundary a fast main-process transition can leave
      // the Remote list looking unresponsive at the start of a clone.
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
      const result = await window.git.cloneRepository(project.url, destination)
      if (!result?.success) {
        setCloneError(result?.message || 'Clone failed')
        return
      }
      const path = result.data.repoPath
      dispatch(addProject(path))
      setRemoteProjects((items) =>
        items.map((item) => (item.url === project.url ? { ...item, localExists: true } : item))
      )
    } catch (error) {
      setCloneError(error.message || 'Clone failed')
    } finally {
      setCloneBusy(false)
    }
  }

  const getProjectName = (path) => {
    return path.split(/[/\\]/).pop() || path
  }

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.style.opacity = '0.5'
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    setDraggedItemIndex(null)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    if (draggedItemIndex === null || draggedItemIndex === index) return

    const newProjects = [...projects]
    const itemToMove = newProjects.splice(draggedItemIndex, 1)[0]
    newProjects.splice(index, 0, itemToMove)

    setDraggedItemIndex(index)
    dispatch(reorderProjects(newProjects))
  }

  return (
    <div className={styles.projectManagement}>
      <div className={styles.projectList}>
        {cloneBusy && (
          <div className={styles.cloneLoadingOverlay}>
            <RefreshCw size={22} className={styles.cloneSpinner} />
            <span>Cloning repository…</span>
          </div>
        )}
        <div className={styles.projectListHeader}>
          <div className={styles.headerTitle}>
            <Folders size={18} className={styles.headerIcon} />
            <h3>All Projects</h3>
            <div className={styles.scopeTabs}>
              <button
                className={scope === 'local' ? styles.activeTab : ''}
                onClick={() => setScope('local')}
              >
                LOCAL
              </button>
              <button
                className={scope === 'remote' ? styles.activeTab : ''}
                onClick={() => setScope('remote')}
              >
                REMOTE
              </button>
            </div>
            <span className={styles.projectCount}>
              {scope === 'local' ? projects.length : remoteProjects.length}
            </span>
          </div>
          <div className={styles.headerActions}>
            {scope === 'local' ? (
              <button
                className={styles.addProjectBtn}
                onClick={handleAddProject}
                disabled={loading}
              >
                <Plus size={16} />
                <span>Add Project</span>
              </button>
            ) : authenticated ? (
              <>
                <span className={styles.githubUser}>{githubUser}</span>
                <button
                  className={styles.cloneProjectBtn}
                  onClick={loadRemoteProjects}
                  disabled={remoteLoading}
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.addProjectBtn}
                  onClick={connectGithub}
                  disabled={remoteLoading}
                >
                  Connect GitHub
                </button>
              </>
            )}
          </div>
        </div>

        <div className={styles.projectListContainer}>
          {scope === 'remote' ? (
            <div>
              {authenticated && (
                <div className={styles.remoteTools}>
                  <div className={styles.searchBox}>
                    <Search size={14} />
                    <input
                      value={remoteSearch}
                      onChange={(e) => setRemoteSearch(e.target.value)}
                      placeholder="Search repositories…"
                    />
                  </div>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    aria-label="Repository visibility"
                  >
                    <option value="all">ALL</option>
                    <option value="private">PRIVATE</option>
                    <option value="public">PUBLIC</option>
                  </select>
                  <button
                    className={`${styles.sortBtn} ${sortMode !== 'none' ? styles.sortBtnActive : ''}`}
                    onClick={() =>
                      setSortMode((m) =>
                        m === 'none' ? 'local' : m === 'local' ? 'remote' : 'none'
                      )
                    }
                    title="Sort by clone status — click to cycle: off → local first → remote first"
                    aria-label="Sort by local/remote"
                  >
                    <ArrowDownUp size={14} />
                    <span>
                      {sortMode === 'none'
                        ? 'SORT'
                        : sortMode === 'local'
                          ? 'LOCAL FIRST'
                          : 'REMOTE FIRST'}
                    </span>
                  </button>
                  <button
                    className={styles.destinationBtn}
                    onClick={selectCloneDirectory}
                    title={cloneParent || 'Select clone destination'}
                  >
                    <FolderOpen size={14} />
                    <span>{cloneParent ? getProjectName(cloneParent) : 'Choose folder'}</span>
                  </button>
                  <span className={styles.resultCount}>{visibleRemoteProjects.length}</span>
                  {cloneBusy && <span className={styles.cloneProgress}>Cloning…</span>}
                </div>
              )}
              {userCode && (
                <div className={styles.deviceCode}>
                  GitHub 授權碼：<strong>{userCode}</strong>（瀏覽器已開啟）
                </div>
              )}
              {cloneError && <div className={styles.cloneError}>{cloneError}</div>}
              {remoteLoading ? (
                <div className={styles.emptyState}>Loading remote projects…</div>
              ) : (
                visibleRemoteProjects.map((project) => {
                  const isLocal = projects.some(
                    (path) => getProjectName(path).toLowerCase() === project.name.toLowerCase()
                  )
                  return (
                    <div
                      key={project.url}
                      className={`${styles.projectItem} ${isLocal ? styles.remoteProjectDisabled : ''}`}
                      onDoubleClick={isLocal ? undefined : () => handleClone(project)}
                      title={
                        isLocal
                          ? 'Already available locally'
                          : cloneParent
                            ? `Double click to clone into ${cloneParent}`
                            : 'Double click and choose a clone destination'
                      }
                      aria-disabled={isLocal}
                    >
                      <div className={styles.projectIcon}>
                        <GitFork size={18} />
                      </div>
                      <div className={styles.projectInfo}>
                        <div className={styles.projectName}>
                          <span className={styles.nameText}>{project.name}</span>
                          {project.isPrivate && (
                            <span className={styles.currentBadge}>PRIVATE</span>
                          )}
                          {isLocal && <span className={styles.localBadge}>LOCAL</span>}
                        </div>
                        <div className={styles.projectPath}>
                          {project.description || project.url}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : projects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <Folders size={48} strokeWidth={1} />
              </div>
              <p>No projects added yet.</p>
              <button
                className={styles.emptyStateBtn}
                onClick={handleAddProject}
                disabled={loading}
              >
                Select a Repository
              </button>
            </div>
          ) : (
            projects.map((path, index) => {
              const isActive = path === currentRepoPath
              const name = getProjectName(path)

              return (
                <div
                  key={path}
                  className={`${styles.projectItem} ${isActive ? styles.activeProject : ''} ${draggedItemIndex === index ? styles.isDragging : ''}`}
                  onDoubleClick={() => handleProjectDoubleClick(path)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  title="Double click to switch, drag to reorder"
                >
                  <div className={styles.dragHandle}>
                    <GripVertical size={14} />
                  </div>

                  <div className={styles.projectIcon}>
                    <div className={styles.folderIconWrapper}>
                      <Folder size={12} fill="currentColor" strokeWidth={3} />
                    </div>
                  </div>

                  <div className={styles.projectInfo}>
                    <div className={styles.projectName}>
                      <span className={styles.nameText}>{name}</span>
                      {index < 10 && (
                        <span className={styles.shortcutHint}>
                          CTRL+{index === 9 ? 0 : index + 1}
                        </span>
                      )}
                      {isActive && <span className={styles.currentBadge}>Active</span>}
                    </div>
                    <div className={styles.projectPath}>{path}</div>
                  </div>

                  <div className={styles.projectActions}>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => handleRemoveProject(e, path)}
                      disabled={projects.length <= 1}
                      title={
                        projects.length <= 1 ? 'Cannot delete the only project' : 'Remove from list'
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectList
