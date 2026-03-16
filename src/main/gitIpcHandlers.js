import { ipcMain, dialog, shell } from 'electron'
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

  ipcMain.handle('git:getCachedDiff', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }

    try {
      const command = 'git diff --cached'
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success(stdout || stderr || '')
    } catch (err) {
      return fail(err.message)
    }
  })

  ipcMain.handle('git:getFileDiff', async (_, file, isStaged) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }

    try {
      // 如果文件名已经有引号，先移除它们，然后重新添加
      let cleanFile = file
      if (file.startsWith('"') && file.endsWith('"')) {
        cleanFile = file.slice(1, -1)
      }
      const escapedFile = cleanFile.replace(/"/g, '\\"')
      const command = isStaged ? `git diff --cached "${escapedFile}"` : `git diff "${escapedFile}"`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success(stdout || stderr || '')
    } catch (err) {
      // If it's a new file (not yet in index/staged), it might fail or return nothing.
      // For untracked files, git diff returns nothing.
      return fail(err.message)
    }
  })

  ipcMain.handle('git:openRepository', async (_, path) => {
    try {
      currentRepoPath = path
      // Verify if it's a git repository
      const command = 'git rev-parse --is-inside-work-tree'
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success({
        repoPath: currentRepoPath,
        command: command
      })
    } catch (error) {
      currentRepoPath = null
      return fail('Not a valid git repository: ' + error.message)
    }
  })

  ipcMain.handle('git:openInExplorer', async (_, path) => {
    const pathToOpen = path || currentRepoPath
    if (!pathToOpen) return fail('No path provided')
    try {
      await shell.openPath(pathToOpen)
      return success()
    } catch (error) {
      return fail(error.message)
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
        if (currentRepoPath) {
          return success({
            repoPath: currentRepoPath,
            message: 'No change'
          })
        }
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
      const command = 'git branch -vv'
      const remoteCommand = 'git branch -r'
      commandHistory.push(command)
      commandHistory.push(remoteCommand)

      const [{ stdout: localOutput }, { stdout: remoteOutput }] = await Promise.all([
        execAsync(command, { cwd: currentRepoPath }),
        execAsync(remoteCommand, { cwd: currentRepoPath })
      ])

      const localBranches = localOutput
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const isCurrent = line.startsWith('*')
          const cleanLine = line.substring(2)
          const nameMatch = cleanLine.match(/^([^\s]+)/)
          const name = nameMatch ? nameMatch[1] : ''

          const bracketsMatch = line.match(/\[([^\]]+)\]/)
          let upstream = null
          let ahead = 0
          let behind = 0

          if (bracketsMatch) {
            const content = bracketsMatch[1]
            const [uName, ...statsParts] = content.split(':')
            upstream = uName.trim()

            if (statsParts.length > 0) {
              const stats = statsParts.join(':')
              const aheadMatch = stats.match(/ahead (\d+)/)
              const behindMatch = stats.match(/behind (\d+)/)
              if (aheadMatch) ahead = parseInt(aheadMatch[1], 10)
              if (behindMatch) behind = parseInt(behindMatch[1], 10)
            }
          }

          return {
            name,
            isCurrent,
            upstream,
            ahead,
            behind
          }
        })

      const remoteBranches = remoteOutput
        .split('\n')
        .map((branch) => branch.trim())
        .filter((branch) => branch.length > 0)
        .map((branch) => {
          if (branch.includes('HEAD ->')) {
            return 'origin/HEAD'
          }
          return branch.replace('origin/', '')
        })

      const currentBranchResult = await execAsync('git branch --show-current', {
        cwd: currentRepoPath
      })
      const currentBranch = currentBranchResult.stdout.trim()

      return success({
        currentBranch,
        branches: localBranches,
        remoteBranches,
        command: { output: localOutput }
      })
    } catch (error) {
      return fail('Error listing branches:' + error.message)
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
      return fail('Error checking out branch:' + error.message)
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

  ipcMain.handle('git:renameBranch', async (_, oldName, newName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = oldName
        ? `git branch -m "${oldName}" "${newName}"`
        : `git branch -m "${newName}"`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success({ command })
    } catch (error) {
      console.error('Error renaming branch:', error)
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

  ipcMain.handle('git:branchPull', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = 'git pull'
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error pulling:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:branchPush', async (event, force) => {
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
          isModified: true,
          statusType: {
            staged: '?',
            working: '?'
          }
        }))

      return success({ files: [...files, ...untrackedFiles] })
    } catch (error) {
      console.error('Error getting status:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:stageFile', async (_, files) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const fileList = Array.isArray(files) ? files : [files]
      if (fileList.length === 0) return success()

      // 为每个文件单独构建命令，避免空格问题
      for (const file of fileList) {
        // 如果文件名已经有引号，先移除它们，然后重新添加
        let cleanFile = file
        if (file.startsWith('"') && file.endsWith('"')) {
          cleanFile = file.slice(1, -1)
        }
        const escapedFile = cleanFile.replace(/"/g, '\\"')
        const command = `git add -- "${escapedFile}"`
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
      }
      return success()
    } catch (error) {
      console.error('Error staging file:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:unstageFile', async (_, files) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const fileList = Array.isArray(files) ? files : [files]
      if (fileList.length === 0) return success()

      // 为每个文件单独构建命令，避免空格问题
      for (const file of fileList) {
        // 如果文件名已经有引号，先移除它们，然后重新添加
        let cleanFile = file
        if (file.startsWith('"') && file.endsWith('"')) {
          cleanFile = file.slice(1, -1)
        }
        const escapedFile = cleanFile.replace(/"/g, '\\"')
        const command = `git reset HEAD -- "${escapedFile}"`
        commandHistory.push(command)
        await execAsync(command, { cwd: currentRepoPath })
      }
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
        // 如果文件名已经有引号，先移除它们，然后重新添加
        let cleanFile = file
        if (file.startsWith('"') && file.endsWith('"')) {
          cleanFile = file.slice(1, -1)
        }
        const escapedFile = cleanFile.replace(/"/g, '\\"')
        const unstageCmd = `git reset HEAD -- "${escapedFile}"`
        const discardCmd = `git checkout -- "${escapedFile}"`

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
      // Use a temporary file or properly escape for shell
      // Given the current architecture, escaping is the quickest fix.
      // But a better way is to use execFile/spawn to avoid shell parsing.
      const escapedMessage = message.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$')
      const command = `git commit -m "${escapedMessage}"`
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
      // 1️⃣ 取得當前 HEAD
      const { stdout: headHash } = await execAsync('git rev-parse HEAD', { cwd: currentRepoPath })
      const head = headHash.trim()

      // 2️⃣ 取得當前分支名稱
      const { stdout: currentBranchRaw } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: currentRepoPath
      })
      const currentBranch = currentBranchRaw.trim()
      const isDetached = currentBranch === 'HEAD'

      // 3️⃣ 取得未 push commit 的 hash
      let unpushedHashes = []
      try {
        const { stdout: unpushedOutput } = await execAsync('git rev-list @{push}..HEAD', {
          cwd: currentRepoPath
        })
        unpushedHashes = unpushedOutput.split('\n').filter(Boolean)
      } catch (e) {
        // 尚未設定 upstream
        unpushedHashes = []
      }

      // 4️⃣ 取得所有 commit
      const { stdout } = await execAsync(
        'git log --pretty=format:"%H|%an|%ad|%s|%d" --date=iso --all',
        { cwd: currentRepoPath }
      )

      const commits = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split('|')
          if (parts.length < 4) return null

          const hash = parts[0].trim()
          const author = parts[1].trim()
          const date = parts[2].trim()
          const message = parts
            .slice(3, parts.length - 1)
            .join('|')
            .trim() // 避免 message 裡有 '|'
          const refsRaw = parts[parts.length - 1].trim()
          const branches = refsRaw
            ? refsRaw
                .replace(/[()]/g, '')
                .split(',')
                .map((r) => r.trim())
                .filter(Boolean)
            : []

          const isCurrent = hash === head
          const isUnpushed = unpushedHashes.includes(hash)

          return {
            hash,
            author,
            date,
            message,
            branches,
            isCurrent,
            currentBranch: isDetached ? `HEAD -> ${hash.substring(0, 7)}` : currentBranch,
            isUnpushed
          }
        })
        .filter(Boolean)

      return success({
        commits,
        currentHead: head,
        currentBranch,
        unpushedCount: unpushedHashes.length
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

  ipcMain.handle('git:mergeBranch', async (_, sourceBranch) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git merge "${sourceBranch}"`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      console.error('Error merging branch:', error)
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

  // ── Stash handlers ──────────────────────────────────────────────────────────

  ipcMain.handle('git:stashList', async () => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const command = 'git stash list --pretty=format:"%gd|%s|%cr|%H"'
      commandHistory.push(command)
      const { stdout } = await execAsync(command, { cwd: currentRepoPath })
      const stashes = stdout
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split('|')
          return {
            index: parts[0]?.trim() || '',
            message: parts[1]?.trim() || '',
            date: parts[2]?.trim() || '',
            hash: parts[3]?.trim() || ''
          }
        })
      return success(stashes)
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:stashPush', async (_, message, files) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const args = ['stash', 'push']
      if (message) {
        args.push('-m', message)
      }
      if (files && files.length > 0) {
        args.push('--')
        const fileList = Array.isArray(files) ? files : [files]
        args.push(...fileList)
      }

      // Build the command string for history
      const command = `git ${args.map((a) => (a.includes(' ') || a === '' ? `"${a}"` : a)).join(' ')}`
      commandHistory.push(command)

      return new Promise((resolve) => {
        const { spawn } = require('child_process')
        const git = spawn('git', args, { cwd: currentRepoPath })
        let stdout = ''
        let stderr = ''

        git.stdout.on('data', (data) => (stdout += data))
        git.stderr.on('data', (data) => (stderr += data))

        git.on('close', (code) => {
          if (code === 0) {
            resolve(success({ output: stdout || stderr }))
          } else {
            resolve(fail(stderr || stdout || `Git exit code ${code}`))
          }
        })
      })
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:stashApply', async (_, stashIndex) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const command = `git stash apply ${stashIndex}`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:stashPop', async (_, stashIndex) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const command = `git stash pop ${stashIndex}`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:stashDrop', async (_, stashIndex) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const command = `git stash drop ${stashIndex}`
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath })
      return success({ output: stdout || stderr })
    } catch (error) {
      return fail(error.message)
    }
  })

  ipcMain.handle('git:getStashDiff', async (_, stashIndex) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      // 使用 -p 參數來獲取完整 patch (diff)
      const command = `git stash show -p ${stashIndex}`
      commandHistory.push(command)
      const { stdout } = await execAsync(command, { cwd: currentRepoPath })
      return success(stdout)
    } catch (error) {
      return fail(error.message)
    }
  })
}
