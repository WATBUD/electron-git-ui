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
      const remoteCommand = 'git branch -r';
      commandHistory.push(command);
      commandHistory.push(remoteCommand);
      
      const [{ stdout: localOutput }, { stdout: remoteOutput }] = await Promise.all([
        execAsync(command, { cwd: currentRepoPath }),
        execAsync(remoteCommand, { cwd: currentRepoPath })
      ]);

      const localBranches = localOutput.split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch.length > 0)
        .map(branch => branch.replace('* ', ''));

      const remoteBranches = remoteOutput.split('\n')
        .map(branch => branch.trim())
        .filter(branch => branch.length > 0)
        .map(branch => branch.replace('origin/', ''));

      return {
        success: true,
        branches: localBranches,
        remoteBranches,
        command: {
          output: localOutput
        }
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

  ipcMain.handle('git:fetch', async (event, prune) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = prune ? 'git fetch --prune' : 'git fetch';
      commandHistory.push(command);
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      console.error('Error fetching:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:push', async (event, force) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = force ? 'git push -f' : 'git push';
      commandHistory.push(command);
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      console.error('Error pushing:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:getStatus', async () => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = 'git status --porcelain';
      commandHistory.push(command);
      const { stdout } = await execAsync(command, { cwd: currentRepoPath });
      
      const files = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const status = line.substring(0, 2);
          const file = line.substring(3);
          
          // 處理重命名和複製的情況
          if (status[0] === 'R' || status[0] === 'C') {
            const [oldFile, newFile] = file.split(' -> ');
            return {
              status,
              file: newFile,
              oldFile,
              isStaged: true,
              isModified: false,
              statusType: {
                staged: status[0],
                working: ' '
              }
            };
          }

          // 創建兩個條目：一個用於暫存區，一個用於工作目錄
          const entries = [];
          
          // 如果有暫存的更改
          if (status[0] !== ' ' && status[0] !== '?') {
            entries.push({
              status,
              file,
              isStaged: true,
              isModified: false,
              statusType: {
                staged: status[0],
                working: ' '
              }
            });
          }
          
          // 如果有工作目錄的更改
          if (status[1] !== ' ' && status[1] !== '?') {
            entries.push({
              status,
              file,
              isStaged: false,
              isModified: true,
              statusType: {
                staged: ' ',
                working: status[1]
              }
            });
          }

          return entries;
        })
        .flat(); // 將嵌套數組展平

      // 添加未追蹤的檔案
      const untrackedCommand = 'git ls-files --others --exclude-standard';
      const { stdout: untrackedOutput } = await execAsync(untrackedCommand, { cwd: currentRepoPath });
      const untrackedFiles = untrackedOutput.split('\n')
        .filter(line => line.trim())
        .map(file => ({
          status: '??',
          file,
          isStaged: false,
          isModified: false,
          statusType: {
            staged: '?',
            working: '?'
          }
        }));

      return { 
        success: true, 
        files: [...files, ...untrackedFiles]
      };
    } catch (error) {
      console.error('Error getting status:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:stageFile', async (_, file) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git add "${file}"`;
      commandHistory.push(command);
      await execAsync(command, { cwd: currentRepoPath });
      return { success: true };
    } catch (error) {
      console.error('Error staging file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:unstageFile', async (_, file) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git reset HEAD "${file}"`;
      commandHistory.push(command);
      await execAsync(command, { cwd: currentRepoPath });
      return { success: true };
    } catch (error) {
      console.error('Error unstaging file:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:commit', async (_, message) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git commit -m "${message}"`;
      commandHistory.push(command);
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      console.error('Error committing:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:getCommitHistory', async () => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      // 獲取當前 HEAD 信息
      const headCommand = 'git rev-parse HEAD';
      const { stdout: headHash } = await execAsync(headCommand, { cwd: currentRepoPath });
      
      // 獲取當前分支名稱
      const branchCommand = 'git rev-parse --abbrev-ref HEAD';
      const { stdout: currentBranch } = await execAsync(branchCommand, { cwd: currentRepoPath });

      // 獲取未推送的提交數量
      const unpushedCommand = 'git rev-list @{push}..HEAD --count';
      const { stdout: unpushedCount } = await execAsync(unpushedCommand, { cwd: currentRepoPath });

      const command = 'git log --pretty=format:"%H|%an|%ad|%s" --date=iso --graph --all';
      commandHistory.push(command);
      const { stdout } = await execAsync(command, { cwd: currentRepoPath });
      
      // 解析提交歷史
      const commits = stdout.split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [graph, ...rest] = line.split(' ');
          const [hash, author, date, ...messageParts] = rest.join(' ').split('|');
          const message = messageParts.join('|');
          
          // 解析圖形信息
          const branches = graph
            .replace(/[^\/*\\|]/g, '')
            .split('')
            .map(char => {
              switch (char) {
                case '*': return 'current';
                case '/': return 'branch1';
                case '\\': return 'branch2';
                case '|': return 'main';
                default: return null;
              }
            })
            .filter(Boolean);

          return {
            hash: hash.trim(),
            author,
            date,
            message,
            branches,
            isCurrent: hash.trim() === headHash.trim(),
            currentBranch: branches.includes('current') ? currentBranch.trim() : null,
            isUnpushed: parseInt(unpushedCount) > 0 && hash.trim() === headHash.trim()
          };
        });

      return { 
        success: true, 
        commits,
        currentHead: headHash.trim(),
        currentBranch: currentBranch.trim(),
        unpushedCount: parseInt(unpushedCount)
      };
    } catch (error) {
      console.error('Error getting commit history:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('git:checkoutCommit', async (_, commitHash) => {
    if (!currentRepoPath) {
      throw new Error('No repository selected');
    }
    try {
      const command = `git checkout ${commitHash}`;
      commandHistory.push(command);
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath });
      return { success: true, output: stdout || stderr };
    } catch (error) {
      console.error('Error checking out commit:', error);
      return { success: false, error: error.message };
    }
  });
} 