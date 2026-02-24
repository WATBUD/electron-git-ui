import React from 'react'
import styles from './LeftSideBar.module.css'

const LeftSideBar = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: 'main', label: 'Branch View' },
    // { id: 'graph', label: 'Graph View' },
    { id: 'files', label: 'File Status' }
  ]

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarScroll}>
        <nav className={styles.menu}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${activeTab === item.id ? styles.active : ''}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default LeftSideBar
