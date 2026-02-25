import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { openRepository, selectRepository, removeProject } from '../../store/git'
import styles from './ProjectList.module.css'

const ProjectList = () => {
  const projects = useSelector((state) => state.git.projects || [])
  const currentRepoPath = useSelector((state) => state.git.repoPath)
  const loading = useSelector((state) => state.git.loading)
  const dispatch = useDispatch()

  const handleProjectDoubleClick = (path) => {
    if (path === currentRepoPath) return
    dispatch(openRepository(path))
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
            projects.map((path) => (
              <div
                key={path}
                className={`${styles.projectItem} ${path === currentRepoPath ? styles.activeProject : ''}`}
                onDoubleClick={() => handleProjectDoubleClick(path)}
                title="Double click to switch"
              >
                <div className={styles.projectInfo}>
                  <div className={styles.projectName}>
                    {getProjectName(path)}
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
