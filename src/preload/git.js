const { contextBridge, ipcRenderer } = require('electron');

// Debug log to verify preload script is running
console.log('Preload script is running');

// Ensure the git object is properly exposed to the renderer process
contextBridge.exposeInMainWorld('git', {
  selectRepository: () => ipcRenderer.invoke('git:selectRepository'),
  listBranches: () => ipcRenderer.invoke('git:listBranches'),
  createBranch: (branchName) => ipcRenderer.invoke('git:createBranch', branchName),
  checkoutBranch: (branchName) => ipcRenderer.invoke('git:checkoutBranch', branchName),
  deleteBranch: (branchName) => ipcRenderer.invoke('git:deleteBranch', branchName),
  getCommandHistory: () => ipcRenderer.invoke('git:getCommandHistory'),
  clearCommandHistory: () => ipcRenderer.invoke('git:clearCommandHistory'),
});

// Debug log to verify git object is exposed
console.log('Git API exposed to renderer'); 