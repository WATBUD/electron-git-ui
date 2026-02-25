const { contextBridge, ipcRenderer } = require('electron')

// Debug log to verify preload script is running
console.log('Preload script is running')

// Ensure the git object is properly exposed to the renderer process
contextBridge.exposeInMainWorld('git', {
  selectRepository: () => ipcRenderer.invoke('git:selectRepository'),
  openRepository: (path) => ipcRenderer.invoke('git:openRepository', path),
  loadBranches: () => ipcRenderer.invoke('git:loadBranches'),
  createBranch: (branchName) => ipcRenderer.invoke('git:createBranch', branchName),
  checkoutBranch: (branchName) => ipcRenderer.invoke('git:checkoutBranch', branchName),
  deleteBranch: (branchName) => ipcRenderer.invoke('git:deleteBranch', branchName),
  renameBranch: (oldName, newName) => ipcRenderer.invoke('git:renameBranch', oldName, newName),
  deleteRemoteBranch: (branchName) => ipcRenderer.invoke('git:deleteRemoteBranch', branchName),
  getCommandHistory: () => ipcRenderer.invoke('git:getCommandHistory'),
  clearCommandHistory: () => ipcRenderer.invoke('git:clearCommandHistory'),
  fetch: (prune) => ipcRenderer.invoke('git:fetch', prune),
  branchPull: () => ipcRenderer.invoke('git:branchPull'),
  branchPush: (force) => ipcRenderer.invoke('git:branchPush', force),
  getStatus: () => ipcRenderer.invoke('git:getStatus'),
  stageFile: (file) => ipcRenderer.invoke('git:stageFile', file),
  unstageFile: (file) => ipcRenderer.invoke('git:unstageFile', file),
  discardFileChanges: (file) => ipcRenderer.invoke('git:discardFileChanges', file),
  commit: (message) => ipcRenderer.invoke('git:commit', message),
  loadCommitHistory: () => ipcRenderer.invoke('git:loadCommitHistory'),
  checkoutCommit: (commitHash) => ipcRenderer.invoke('git:checkoutCommit', commitHash),
  checkMergeInProgress: () => ipcRenderer.invoke('git:checkMergeInProgress'),
  mergeBranch: (sourceBranch) => ipcRenderer.invoke('git:mergeBranch', sourceBranch),
  mergeAbort: () => ipcRenderer.invoke('git:mergeAbort'),
  refreshTags: () => ipcRenderer.invoke('git:refreshTags'),
  getCachedDiff: () => ipcRenderer.invoke('git:getCachedDiff'),
  exec: (rawCommand) => ipcRenderer.invoke('git:exec', rawCommand)
})

// Debug log to verify git object is exposed
console.log('Git API exposed to renderer')
