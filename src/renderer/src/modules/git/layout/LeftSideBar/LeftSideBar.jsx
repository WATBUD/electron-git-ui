import React from 'react'
import styles from './LeftSideBar.module.css'
import { GIT_TABS } from '../../constants/tabs'

const LeftSideBar = ({ activeTab, onTabChange, isRepoSelected }) => {
  const menuItems = [
    { id: GIT_TABS.PROJECTS, label: '📁 Projects', alwaysEnabled: true },
    { id: GIT_TABS.BRANCH_VIEW, label: '🌿 Branches' },
    // { id: GIT_TABS.GRAPH, label: '🔀 Graph' },
    { id: GIT_TABS.FILES, label: '📝 File Status' },
    { id: GIT_TABS.STASHES, label: '📦 Stashes' }
  ]

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarScroll}>
        <nav className={styles.menu}>
          {menuItems.map((item) => {
            const isDisabled = !item.alwaysEnabled && !isRepoSelected
            return (
              <button
                key={item.id}
                className={`${styles.menuItem} ${activeTab === item.id ? styles.active : ''}`}
                onClick={() => !isDisabled && onTabChange(item.id)}
                disabled={isDisabled}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default LeftSideBar
