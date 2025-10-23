import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Import other preload modules
import './gitIpcHandlersPreload'

// Macro API
const macroAPI = {
  // Recording control
  startRecording: () => ipcRenderer.send('start-recording'),
  stopRecording: () => ipcRenderer.send('stop-recording'),
  
  // Playback control
  playMacro: (config) => ipcRenderer.send('play-macro', config),
  stopMacro: () => ipcRenderer.send('stop-macro'),
  
  // Event listeners
  onRecordedAction: (callback) => {
    ipcRenderer.on('recorded-action', (event, action) => callback(action))
  },
  
  onMacroFinished: (callback) => {
    ipcRenderer.on('macro-finished', () => callback())
  },
  
  onMacroStopped: (callback) => {
    ipcRenderer.on('macro-stopped', () => callback())
  },
  
  onPlaybackProgress: (callback) => {
    ipcRenderer.on('playback-progress', (event, progress) => callback(progress))
  },
  
  // Cleanup
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('recorded-action')
    ipcRenderer.removeAllListeners('macro-finished')
    ipcRenderer.removeAllListeners('macro-stopped')
    ipcRenderer.removeAllListeners('playback-progress')
  }
}

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('macroAPI', macroAPI)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.macroAPI = macroAPI
}
