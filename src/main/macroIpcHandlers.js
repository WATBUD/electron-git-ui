const { ipcMain, BrowserWindow } = require('electron')
const { execSync } = require('child_process')
const robot = require('robotjs')
const { uIOhook, UiohookKey } = require('uiohook-napi')

let isRecording = false
let isPlaying = false
let recordedActions = []
let recordingStartTime = 0
let currentWindow = null

function setupMacroHandlers() {
  // Get list of available windows
  ipcMain.handle('get-window-list', async () => {
    try {
      const windows = []
      
      // Get all Electron windows
      const allWindows = BrowserWindow.getAllWindows()
      allWindows.forEach((win, index) => {
        const title = win.getTitle()
        if (title) {
          windows.push({
            id: `electron-${win.id}`,
            title: title,
            type: 'electron',
            bounds: win.getBounds()
          })
        }
      })
      
      // Get running applications on macOS using AppleScript
      if (process.platform === 'darwin') {
        try {
          const appleScript = `
            tell application "System Events"
              set appList to name of every application process whose background only is false
            end tell
            return appList
          `
          
          const result = execSync(`osascript -e '${appleScript}'`, { 
            encoding: 'utf8',
            timeout: 5000 
          })
          
          // Parse the result (comma-separated list)
          const appNames = result.trim().split(', ').filter(name => name.length > 0)
          
          // Add each running application to the windows list
          appNames.forEach((appName, index) => {
            // Skip this app itself to avoid confusion
            if (!appName.includes('Electron') && !appName.includes('git-ui')) {
              windows.push({
                id: `macos-${index}`,
                title: appName,
                type: 'macos-app'
              })
            }
          })
          
          console.log(`Found ${appNames.length} running macOS applications`)
        } catch (error) {
          console.error('Failed to get macOS applications:', error)
        }
      }
      
      return windows
    } catch (error) {
      console.error('Error getting window list:', error)
      return []
    }
  })
  // Recording control
  ipcMain.on('start-recording', (event) => {
    if (isRecording) return
    isRecording = true
    recordedActions = []
    recordingStartTime = Date.now()
    currentWindow = event.sender
    
    console.log('Recording started with uIOhook')
    
    // Start uIOhook to listen for global events
    uIOhook.on('keydown', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'keydown',
        keycode: e.keycode,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    uIOhook.on('keyup', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'keyup',
        keycode: e.keycode,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    uIOhook.on('mousedown', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'mousedown',
        button: e.button,
        x: e.x,
        y: e.y,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    uIOhook.on('mouseup', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'mouseup',
        button: e.button,
        x: e.x,
        y: e.y,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    uIOhook.on('mousemove', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'mousemove',
        x: e.x,
        y: e.y,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    uIOhook.on('wheel', (e) => {
      if (!isRecording) return
      const timestamp = Date.now() - recordingStartTime
      const action = {
        type: 'wheel',
        rotation: e.rotation,
        direction: e.direction,
        x: e.x,
        y: e.y,
        timestamp: timestamp
      }
      recordedActions.push(action)
      if (currentWindow) {
        currentWindow.send('recorded-action', action)
      }
    })
    
    // Start the hook
    uIOhook.start()
  })

  ipcMain.on('stop-recording', () => {
    if (!isRecording) return
    isRecording = false
    
    // Stop uIOhook
    uIOhook.stop()
    
    console.log('Recording stopped. Total actions:', recordedActions.length)
    currentWindow = null
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
