import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { openRepository, selectRepository, removeProject, reorderProjects } from '../../store/git'
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
    // Set a ghost image or just let the browser handle it
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
            <h3>Known Projects</h3>
            <span className={styles.projectCount}>{projects.length}</span>
          </div>
          <button className={styles.addProjectBtn} onClick={handleAddProject} disabled={loading}>
            <span>+</span> Add Project
          </button>
        </div>

        <div className={styles.projectListContainer}>
          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📁</div>
              <div>No projects added yet. Click "Add Project" to start.</div>
            </div>
          ) : (
            projects.map((path, index) => (
              <div
                key={path}
                className={`${styles.projectItem} ${path === currentRepoPath ? styles.activeProject : ''} ${draggedItemIndex === index ? styles.isDragging : ''}`}
                onDoubleClick={() => handleProjectDoubleClick(path)}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                title="Double click to switch, drag to reorder"
              >
                <div className={styles.dragHandle}>⠿</div>
                <div className={styles.projectInfo}>
                  <div className={styles.projectName}>
                    {getProjectName(path)}
                    {index < 5 && <span className={styles.shortcutHint}>CTRL+{index + 1}</span>}
                    {path === currentRepoPath && (
                      <span className={styles.currentBadge}> (current)</span>
                    )}
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
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectList
