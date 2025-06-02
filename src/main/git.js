import { ipcMain, dialog } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

let currentRepoPath = null;
let commandHistory = [];

export function setupGitHandlers() {
  ipcMain.handle('git:selectRepository', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Git Repository'
      });

      if (!result.canceled && result.filePaths.length > 0) {
        currentRepoPath = result.filePaths[0];
        // Verify if it's a git repository
        try {
          const command = 'git rev-parse --is-inside-work-tree';
          commandHistory.push(command);
          await execAsync(command, { cwd: currentRepoPath });
          return { success: true, path: currentRepoPath, command };
        } catch (error) {
          currentRepoPath = null;
          throw new Error('Selected folder is not a Git repository');
        }
      }
      return null;
    } catch (error) {
      console.error('Error selecting repository:', error);
      throw error;
    }
  });

  ipcMain.handle('git:listBranches', async () => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = 'git branch';
      commandHistory.push(command);
      const { stdout } = await execAsync(command, { cwd: currentRepoPath });
      return {
        success: true,
        branches: stdout.split('\n')
          .map(branch => branch.trim())
          .filter(branch => branch.length > 0)
          .map(branch => branch.replace('* ', '')),
        command
      };
    } catch (error) {
      console.error('Error listing branches:', error);
      throw error;
    }
  });

  ipcMain.handle('git:createBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git branch ${branchName}`;
      commandHistory.push(command);
      await execAsync(command, { cwd: currentRepoPath });
      return { success: true, command };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  });

  ipcMain.handle('git:checkoutBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git checkout ${branchName}`;
      commandHistory.push(command);
      await execAsync(command, { cwd: currentRepoPath });
      return { success: true, command };
    } catch (error) {
      console.error('Error checking out branch:', error);
      throw error;
    }
  });

  ipcMain.handle('git:deleteBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git branch -d ${branchName}`;
      commandHistory.push(command);
      await execAsync(command, { cwd: currentRepoPath });
      return { success: true, command };
    } catch (error) {
      console.error('Error deleting branch:', error);
      throw error;
    }
  });

  ipcMain.handle('git:getCommandHistory', () => {
    return commandHistory;
  });

  ipcMain.handle('git:clearCommandHistory', () => {
    commandHistory = [];
    return true;
  });
} 