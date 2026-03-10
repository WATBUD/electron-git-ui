import React from 'react'
import styles from './LeftSideBar.module.css'
import { GIT_TABS } from '../../constants/tabs'
import { Folder, GitBranch, FileText, Package } from 'lucide-react'

const LeftSideBar = ({ activeTab, onTabChange, isRepoSelected }) => {
  const menuItems = [
    { id: GIT_TABS.PROJECTS, label: 'Projects', icon: <Folder size={16} />, alwaysEnabled: true },
    { id: GIT_TABS.BRANCH_VIEW, label: 'Branches', icon: <GitBranch size={16} /> },
    { id: GIT_TABS.FILES, label: 'File Status', icon: <FileText size={16} /> },
    { id: GIT_TABS.STASHES, label: 'Stashes', icon: <Package size={16} /> }
  ]

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarScroll}>
        <div className={styles.sidebarHeader}>
          <span>GIT UI</span>
        </div>
        <nav className={styles.menu}>
          {menuItems.map((item) => {
            const isDisabled = !item.alwaysEnabled && !isRepoSelected
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                onClick={() => !isDisabled && onTabChange(item.id)}
                disabled={isDisabled}
              >
                <span className={styles.iconWrapper}>{item.icon}</span>
                <span className={styles.label}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default LeftSideBar
