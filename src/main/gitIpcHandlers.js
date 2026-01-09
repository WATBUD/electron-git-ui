import { ipcMain, dialog } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

let currentRepoPath = null
let commandHistory = []
const success = (data, message = 'ok') => ({ success: true, data, message })
const fail = (message) => ({ success: false, data: null, message })
export function setupGitHandlers() {
  ipcMain.handle('git:exec', async (_, rawCommand) => {
    if (!currentRepoPath) {
      return fail('Repository path not set')
    }

    try {
      const { stdout, stderr } = await exec(rawCommand, {
        cwd: currentRepoPath
      })

      return success(stdout || stderr)
    } catch (err) {
      return fail(err.message)
    }
  })
  ipcMain.handle('git:selectRepository', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Git Repository'
      })
      if (!result.canceled && result.filePaths.length > 0) {
        currentRepoPath = result.filePaths[0]
        // Verify if it's a git repository
        const command = 'git rev-parse --is-inside-work-tree'
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
        return success({
          repoPath: currentRepoPath,
          command: command
        })
      } else {
        return fail('No repository selected')
      }
    } catch (error) {
      currentRepoPath = null
      return fail(error.message)
    }
  })

  ipcMain.handle('git:loadBranches', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = 'git branch'
      const remoteCommand = 'git branch -r'
      commandHistory.push(command)
      commandHistory.push(remoteCommand)

      const [{ stdout: localOutput }, { stdout: remoteOutput }] = await Promise.all([
        execAsync(command, { cwd: currentRepoPath }),
        execAsync(remoteCommand, { cwd: currentRepoPath })
      ])

      const localBranches = localOutput
        .split('\n')
        .map((branch) => branch.trim())
        .filter((branch) => branch.length > 0)
        .map((branch) => branch.replace('* ', ''))

      const remoteBranches = remoteOutput
        .split('\n')
        .map((branch) => branch.trim())
        .filter((branch) => branch.length > 0)
        .map((branch) => {
          // 如果是 HEAD 引用，只返回 origin/HEAD
          if (branch.includes('HEAD ->')) {
            return 'origin/HEAD'
          }
          // 否則移除 "origin/" 前綴
          return branch.replace('origin/', '')
        })
      const currentBranch = (
        await execAsync('git branch --show-current', { cwd: currentRepoPath })
      ).stdout.trim()

      return success({
        currentBranch,
        branches: localBranches,
        remoteBranches,
        command: { output: localOutput }
      })
    } catch (error) {
      return fail('Error listing branches:'+error.message)
    }
  })

  ipcMain.handle('git:createBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git branch ${branchName}`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success({ command })
    } catch (error) {
      console.error('Error creating branch:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:checkoutBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // 如果是 origin/HEAD，直接檢出它指向的提交
      if (branchName === 'origin/HEAD') {
        const command = 'git checkout origin/HEAD'
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
      }
      // 如果是其他遠程分支，使用 git checkout -b 創建本地分支
      else if (branchName.includes('origin/')) {
        const localBranchName = branchName.replace('origin/', '')
        const command = `git checkout -b ${localBranchName} ${branchName}`
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
      } else {
        const command = `git checkout ${branchName}`
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
      }
      return success()
    } catch (error) {
      return fail('Error checking out branch:'+error.message)
    }
  })

  ipcMain.handle('git:deleteBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git branch -d ${branchName}`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success()
    } catch (error) {
      console.error('Error deleting branch:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:deleteRemoteBranch', async (_, branchName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // 不允許刪除 origin/HEAD
      if (branchName === 'origin/HEAD') {
        throw new Error('Cannot delete origin/HEAD reference')
      }
      // 移除可能的 "origin/" 前綴
      const cleanBranchName = branchName.replace('origin/', '')
      const command = `git push origin --delete ${cleanBranchName}`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error deleting remote branch:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:getCommandHistory', () => {
    return success(commandHistory)
  })

  ipcMain.handle('git:clearCommandHistory', () => {
    commandHistory = []
    return success()
  })

  ipcMain.handle('git:fetch', async (event, prune) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = prune ? 'git fetch --prune' : 'git fetch'
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error fetching:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:push', async (event, force) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // 先嘗試獲取當前分支名稱
      const { stdout: currentBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: currentRepoPath
      })

      const branchName = currentBranch.trim()

      // 檢查分支是否有上游分支
      try {
        await execAsync(`git rev-parse --abbrev-ref ${branchName}@{upstream}`, {
          cwd: currentRepoPath
        })
        // 如果有上游分支，使用普通的 push
        const command = force ? 'git push -f' : 'git push'
        commandHistory.push(command)
        const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
        return success({ output: stdout || stderr })
      } catch (upstreamError) {
        // 如果沒有上游分支，設置上游分支並推送
        const command = `git push --set-upstream origin ${branchName}${force ? ' -f' : ''}`
        commandHistory.push(command)
        const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
        return success({ output: stdout || stderr })
      }
    } catch (error) {
      console.error('Error pushing:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:refreshTags', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // Clear local tags
      const clearTagsCommand = 'git tag -l | xargs git tag -d'
      commandHistory.push(clearTagsCommand)
      await execAsync(clearTagsCommand, { cwd: currentRepoPath })

      // Fetch latest tags from remote
      const fetchTagsCommand = 'git fetch --tags'
      commandHistory.push(fetchTagsCommand)
      await execAsync(fetchTagsCommand, { cwd: currentRepoPath })

      return success({ commands: [clearTagsCommand, fetchTagsCommand] })
    } catch (error) {
      console.error('Error refreshing tags:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:getStatus', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = 'git status --porcelain'
      commandHistory.push(command)
      const { stdout } = await execAsync(command, { cwd: currentRepoPath })

      const files = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const status = line.substring(0, 2)
          const file = line.substring(3)

          // 處理重命名和複製的情況
          if (status[0] === 'R' || status[0] === 'C') {
            const [oldFile, newFile] = file.split(' -> ')
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
            }
          }

          // 創建兩個條目：一個用於暫存區，一個用於工作目錄
          const entries = []

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
            })
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
            })
          }

          return entries
        })
        .flat() // 將嵌套數組展平

      // 添加未追蹤的檔案
      const untrackedCommand = 'git ls-files --others --exclude-standard'
      const { stdout: untrackedOutput } = await execAsync(untrackedCommand, {
        cwd: currentRepoPath
      })
      const untrackedFiles = untrackedOutput
        .split('\n')
        .filter((line) => line.trim())
        .map((file) => ({
          status: '??',
          file,
          isStaged: false,
          isModified: false,
          statusType: {
            staged: '?',
            working: '?'
          }
        }))

      return success({ files: [...files, ...untrackedFiles] })
    } catch (error) {
      console.error('Error getting status:', error)
  return fail(error.message)    }
  })

  ipcMain.handle('git:stageFile', async (_, file) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git add "${file}"`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success()
    } catch (error) {
      console.error('Error staging file:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:unstageFile', async (_, file) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git reset HEAD "${file}"`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success()
    } catch (error) {
      console.error('Error unstaging file:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:discardFileChanges', async (_, files) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }

    if (!Array.isArray(files)) {
      files = [files] // Support both single file and array of files
    }

    try {
      // Process each file individually to avoid path parsing issues
      for (const file of files) {
        const unstageCmd = `git reset HEAD -- "${file}"`
        const discardCmd = `git checkout -- "${file}"`

        commandHistory.push(unstageCmd)
        commandHistory.push(discardCmd)

        try {
          await execAsync(unstageCmd, { cwd: currentRepoPath })
          await execAsync(discardCmd, { cwd: currentRepoPath })
        } catch (error) {
          // If unstage fails, still try to discard changes
          if (!error.message.includes('fatal: ambiguous argument')) {
            console.error(`Error processing file ${file}:`, error)
            // Continue with next file even if one fails
            continue
          }
        }
      }

      return success({ count: files.length })
    } catch (error) {
      console.error('Error discarding file changes:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:commit', async (_, message) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git commit -m "${message}"`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error committing:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:loadCommitHistory', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // 獲取當前 HEAD 信息
      const headCommand = 'git rev-parse HEAD'
      commandHistory.push(headCommand)
      const { stdout: headHash } = await execAsync(headCommand, { cwd: currentRepoPath })

      // 獲取當前分支名稱或 detached HEAD 狀態
      const branchCommand = 'git rev-parse --abbrev-ref HEAD'
      commandHistory.push(branchCommand)
      const { stdout: currentBranch } = await execAsync(branchCommand, { cwd: currentRepoPath })

      // 獲取未推送的提交數量
      const unpushedCommand = 'git rev-list @{push}..HEAD --count'
      commandHistory.push(unpushedCommand)
      let unpushedCount = 0
 try {
  const { stdout: unpushedOutput } = await execAsync(unpushedCommand, {
    cwd: currentRepoPath
  })
  unpushedCount = parseInt(unpushedOutput)
} catch {
  // 若尚未設定 upstream（新分支），視為尚未有未推送提交
  unpushedCount = 0
}

      // 修改 git log 命令以包含分支信息
      const command = 'git log --pretty=format:"%H|%an|%ad|%s|%d" --date=iso --graph --all'
      commandHistory.push(command)
      const { stdout } = await execAsync(command, { cwd: currentRepoPath })

      // 解析提交歷史
      const commits = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          // 分離圖形和提交信息
          const match = line.match(/^([\s\/*\\|]+)(.+)$/)
          if (!match) return null

          const [, graph, info] = match
          const [hash, author, date, message, refs] = info.trim().split('|')

          // 解析分支信息
          const branchNames = refs
            ? refs
                .replace(/[()]/g, '') // 移除括號
                .split(',')
                .map((ref) => ref.trim())
                .filter((ref) => ref) // 移除空字符串
            : []

          // 解析圖形信息
          const graphLines = graph
            .replace(/[^\/*\\|]/g, '')
            .split('')
            .map((char) => {
              switch (char) {
                case '*':
                  return 'current'
                case '/':
                  return 'branch1'
                case '\\':
                  return 'branch2'
                case '|':
                  return 'main'
                default:
                  return null
              }
            })
            .filter(Boolean)

          const isCurrent = hash.trim() === headHash.trim()
          const branchName = currentBranch.trim()
          const isDetached = branchName === 'HEAD'

          return {
            hash: hash.trim(),
            author,
            date,
            message,
            branches: branchNames,
            graphLines,
            isCurrent,
            currentBranch: isDetached ? `HEAD -> ${hash.trim().substring(0, 7)}` : branchName,
            isUnpushed: unpushedCount > 0 && isCurrent
          }
        })
        .filter(Boolean) // 移除可能的 null 值

      return success({
        commits,
        currentHead: headHash.trim(),
        currentBranch: currentBranch.trim(),
        unpushedCount
      })
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:checkoutCommit', async (_, commitHash) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git checkout ${commitHash}`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error checking out commit:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:mergeAbort', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = 'git merge --abort'
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error aborting merge:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:checkMergeInProgress', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // Check for .git/MERGE_HEAD file
      const { stdout = '', stderr } = await execAsync('git rev-parse -q --verify MERGE_HEAD', {
        cwd: currentRepoPath
      }).catch(() => ({ stdout: '', stderr: '' })) // Ignore error if MERGE_HEAD doesn't exist

      const mergeHeadHash = stdout.trim()
      const hasMergeInProgress = mergeHeadHash.length > 0
      return success({
        hasMergeInProgress,
        output: hasMergeInProgress
          ? `Merge in progress (${mergeHeadHash})`
          : 'No merge in progress',
        mergeHeadHash: hasMergeInProgress ? mergeHeadHash : null
      })
    } catch (error) {
      console.error('Error checking merge status:', error)
      return fail(error.message)
    }
  })
}
