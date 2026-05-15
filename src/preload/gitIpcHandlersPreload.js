const { contextBridge, ipcRenderer } = require('electron')

// Debug log to verify preload script is running
console.log('Preload script is running')

// Ensure the git object is properly exposed to the renderer process
contextBridge.exposeInMainWorld('git', {
  selectRepository: () => ipcRenderer.invoke('git:selectRepository'),
  openRepository: (path) => ipcRenderer.invoke('git:openRepository', path),
  openInExplorer: (path) => ipcRenderer.invoke('git:openInExplorer', path),
  loadBranches: () => ipcRenderer.invoke('git:loadBranches'),
  getUserConfig: () => ipcRenderer.invoke('git:getUserConfig'),
  setUserConfig: (config) => ipcRenderer.invoke('git:setUserConfig', config),
  createBranch: (branchName) => ipcRenderer.invoke('git:createBranch', branchName),
  checkoutBranch: (branchName) => ipcRenderer.invoke('git:checkoutBranch', branchName),
  deleteBranch: (branchName, force) => ipcRenderer.invoke('git:deleteBranch', branchName, force),
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
  loadTags: () => ipcRenderer.invoke('git:loadTags'),
  loadRemoteTagInfo: () => ipcRenderer.invoke('git:loadRemoteTagInfo'),
  deleteTag: (tagName, mode) => ipcRenderer.invoke('git:deleteTag', tagName, mode),
  createTag: (tagName, branchName, message) => ipcRenderer.invoke('git:createTag', { tagName, branchName, message }),
  pushTag: (tagName) => ipcRenderer.invoke('git:pushTag', tagName),
  getBranchCommits: (branchName, limit) => ipcRenderer.invoke('git:getBranchCommits', branchName, limit),
  getCommitDiff: (commitHash) => ipcRenderer.invoke('git:getCommitDiff', commitHash),
  getCachedDiff: () => ipcRenderer.invoke('git:getCachedDiff'),
  getFileDiff: (file, isStaged) => ipcRenderer.invoke('git:getFileDiff', file, isStaged),
  exec: (rawCommand) => ipcRenderer.invoke('git:exec', rawCommand),
  stashList: () => ipcRenderer.invoke('git:stashList'),
  stashPush: (message, files, keepIndex) =>
    ipcRenderer.invoke('git:stashPush', message, files, keepIndex),
  stashApply: (stashIndex) => ipcRenderer.invoke('git:stashApply', stashIndex),
  stashPop: (stashIndex) => ipcRenderer.invoke('git:stashPop', stashIndex),
  stashDrop: (stashIndex) => ipcRenderer.invoke('git:stashDrop', stashIndex),
  renameStash: (stashIndex, newMessage) => ipcRenderer.invoke('git:renameStash', stashIndex, newMessage),
  getStashDiff: (stashIndex) => ipcRenderer.invoke('git:getStashDiff', stashIndex)
})

// Debug log to verify git object is exposed
console.log('Git API exposed to renderer')
