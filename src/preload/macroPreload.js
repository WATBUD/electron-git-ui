const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('macroAPI', {
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
})
