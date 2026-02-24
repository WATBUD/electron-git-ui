import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppToolbar } from '../AppToolbar'
import { LeftSideBar } from '../LeftSideBar'
import { FooterArea } from '../FooterArea'
import styles from './GitModule.module.css'

export const GitModule = () => {
  return (
    <div className={styles.gitModule}>
      <AppToolbar />
      <div className={styles.mainLayout}>
        <LeftSideBar />
        <main className={styles.contentArea}>
          <Outlet />
        </main>
      </div>
      <FooterArea />
    </div>
  )
}

export default GitModule
