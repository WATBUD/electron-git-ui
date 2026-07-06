import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { openRepository, selectRepository, removeProject, reorderProjects } from '../../store/git'
import { Folder, Plus, Trash2, GripVertical, Folders } from 'lucide-react'
import styles from './ProjectList.module.css'

const ProjectList = ({ onProjectSelect }) => {
  const projects = useSelector((state) => state.git.projects || [])
  const currentRepoPath = useSelector((state) => state.git.repoPath)
  const loading = useSelector((state) => state.git.loading)
  const dispatch = useDispatch()
  const [draggedItemIndex, setDraggedItemIndex] = React.useState(null)

  const handleProjectDoubleClick = (path) => {
    if (path === currentRepoPath) {
      onProjectSelect?.()
      return
    }
    dispatch(openRepository(path)).then(() => {
      onProjectSelect?.()
    })
  }

  const handleRemoveProject = (e, path) => {
    e.stopPropagation()
    dispatch(removeProject(path))
  }

  const handleAddProject = () => {
    dispatch(selectRepository())
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
        <div className={styles.projectListHeader}>
          <div className={styles.headerTitle}>
            <Folders size={18} className={styles.headerIcon} />
            <h3>All Projects</h3>
            <span className={styles.projectCount}>{projects.length}</span>
          </div>
          <button className={styles.addProjectBtn} onClick={handleAddProject} disabled={loading}>
            <Plus size={16} />
            <span>Add Project</span>
          </button>
        </div>

        <div className={styles.projectListContainer}>
          {projects.length === 0 ? (
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
                        <span className={styles.shortcutHint}>CTRL+{index === 9 ? 0 : index + 1}</span>
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
