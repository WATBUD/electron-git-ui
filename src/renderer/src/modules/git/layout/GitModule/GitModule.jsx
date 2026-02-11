import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppToolbar } from '../AppToolbar'
import { LeftSideBar } from '../LeftSideBar'
import { FooterArea } from '../FooterArea'
import './GitModule.css'

export const GitModule = () => {
  return (
    <div className="git-module">
      <AppToolbar />
      <div className="main-layout">
        <LeftSideBar />
        <main className="content-area">
          <Outlet />
        </main>
      </div>
      <FooterArea />
    </div>
  )
}

export default GitModule
