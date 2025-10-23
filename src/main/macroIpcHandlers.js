const { ipcMain } = require('electron')

let isRecording = false
let isPlaying = false

function setupMacroHandlers() {
  // Recording control
  ipcMain.on('start-recording', () => {
    if (isRecording) return
    isRecording = true
    console.log('Recording started')
    // TODO: Implement actual recording logic
  })

  ipcMain.on('stop-recording', () => {
    if (!isRecording) return
    isRecording = false
    console.log('Recording stopped')
    // TODO: Implement actual recording stop logic
  })

  // Playback control
  ipcMain.on('play-macro', (event, config) => {
    if (isPlaying) return
    isPlaying = true
    console.log('Playing macro with config:', config)
    // TODO: Implement actual playback logic
    
    // Simulate macro finished after a delay
    setTimeout(() => {
      isPlaying = false
      event.sender.send('macro-finished')
    }, 1000)
  })

  ipcMain.on('stop-macro', () => {
    if (!isPlaying) return
    isPlaying = false
    console.log('Macro stopped')
    // TODO: Implement actual stop logic
  })

  // Cleanup on window close
  ipcMain.on('cleanup-macro', () => {
    isRecording = false
    isPlaying = false
  })
}

export { setupMacroHandlers }
