import { app, shell, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupGitHandlers } from './gitIpcHandlers'

let mainWindow = null
let historyWindow = null

// Tell the docked (non-popout) windows whether the history popout is open, so
// the main window can hide its bottom history panel while it's undocked.
function notifyPopoutState(open) {
  BrowserWindow.getAllWindows().forEach((w) => {
    if (!w.isHistoryPopout && !w.isDestroyed() && !w.webContents.isDestroyed()) {
      w.webContents.send('history:popoutState', open)
    }
  })
}

// Separate, always-on-top-optional window that renders ONLY the command history
// view (renderer detects `?view=history`). Mirrors DevTools' "open in separate
// window". Reuses the existing window if already open.
function createHistoryWindow() {
  if (historyWindow && !historyWindow.isDestroyed()) {
    historyWindow.show()
    historyWindow.focus()
    notifyPopoutState(true)
    return
  }
  historyWindow = new BrowserWindow({
    width: 640,
    height: 760,
    minWidth: 360,
    minHeight: 300,
    show: true,
    autoHideMenuBar: true,
    backgroundColor: '#14141c',
    title: 'Command History',
    icon: appIcon,
    // Fully frameless — no native title bar, no traffic lights, no spacer.
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })
  // Flag used by the command-history broadcast to target only popout windows.
  historyWindow.isHistoryPopout = true

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    historyWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=history`)
  } else {
    historyWindow.loadFile(join(__dirname, '../renderer/index.html'), { search: 'view=history' })
  }

  historyWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  historyWindow.webContents.on('did-finish-load', () => notifyPopoutState(true))
  historyWindow.on('closed', () => {
    historyWindow = null
    notifyPopoutState(false)
  })
}

// 單一實例鎖定
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }

      mainWindow.show()
      mainWindow.focus()
    }
  })
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const iconPath = isDev
  ? join(__dirname, '../../assets/appIcon.png')
  : join(__dirname, '../../assets/appIcon.icns')

const appIcon = nativeImage.createFromPath(iconPath)

// Disable Autofill features to prevent DevTools errors
app.commandLine.appendSwitch('disable-features', 'Autofill')

// macOS Dock Icon
if (process.platform === 'darwin') {
  app.dock.setIcon(appIcon)
}

function createWindow() {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,

    // 直接顯示，避免 ready-to-show 卡住
    show: true,

    autoHideMenuBar: true,
    backgroundColor: '#14141c',
    title: 'Tide Git',

    icon:
      process.platform === 'win32'
        ? nativeImage.createFromPath(join(__dirname, '../../assets/appIcon.ico'))
        : appIcon,

    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          trafficLightPosition: { x: 14, y: 10 },
          vibrancy: 'under-window',
          visualEffectState: 'active'
        }
      : isWin
        ? {
            titleBarStyle: 'hidden',
            titleBarOverlay: {
              color: '#1e1e2e',
              symbolColor: '#cccccc',
              height: 32
            }
          }
        : {}),

    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  console.log('BrowserWindow created')

  // Renderer 開始載入
  mainWindow.webContents.on('did-start-loading', () => {
    console.log('did-start-loading')
  })

  // Renderer 載入完成
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('did-finish-load')

    if (is.dev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Renderer Crash
  mainWindow.webContents.on('render-process-gone', (_, details) => {
    console.error('render-process-gone', details)
  })

  // 載入失敗
  mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('did-fail-load', code, desc)
  })

  // Focus Event
  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send('app:window-focus')
    }
  })

  // 關閉時清理 reference
  mainWindow.on('closed', () => {
    console.log('window closed')
    mainWindow = null
  })

  // 過濾 DevTools Autofill 垃圾訊息
  mainWindow.webContents.on('console-message', (event) => {
    const { message, sourceId } = event

    if (
      message.includes('Autofill.enable') ||
      message.includes('Autofill.setAddresses') ||
      (sourceId.includes('devtools_compatibility.js') && message.includes('length'))
    ) {
      event.preventDefault()
    }
  })

  // 外部連結
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Development
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    console.log('Loading development URL:', process.env.ELECTRON_RENDERER_URL)

    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    const htmlPath = join(__dirname, '../renderer/index.html')

    console.log('Loading production HTML:', htmlPath)

    mainWindow.loadFile(htmlPath)
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => {
    console.log('pong')
  })

  ipcMain.handle('window:openHistory', () => {
    createHistoryWindow()
    return { success: true }
  })

  // Lets a (re)loaded main window learn the current popout state, so its footer
  // stays hidden if the popout is already open.
  ipcMain.handle('window:isHistoryPopoutOpen', () => {
    return { open: !!(historyWindow && !historyWindow.isDestroyed()) }
  })

  // Custom ✕ button inside the frameless popout closes it (which docks the
  // history back into the main window via the 'closed' handler).
  ipcMain.handle('window:closeHistory', () => {
    if (historyWindow && !historyWindow.isDestroyed()) historyWindow.close()
    return { success: true }
  })

  setupGitHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  mainWindow = null

  if (process.platform !== 'darwin') {
    app.quit()
  }
})
