import { ipcMain, dialog, shell } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

// Increase maxBuffer to handle large git outputs (50MB)
const execOptions = { maxBuffer: 50 * 1024 * 1024 }

// Helper function to execute git commands with proper options
const execGit = async (command, cwd = currentRepoPath) => {
  return execAsync(command, { cwd, ...execOptions })
}

// Helper function to escape file names for git commands
const escapeFileName = (fileName) => {
  // Remove existing quotes if present
  let cleanFile = fileName
  if (fileName.startsWith('"') && fileName.endsWith('"')) {
    cleanFile = fileName.slice(1, -1)
  }
  
  // Escape special characters that could be interpreted by shell or git
  return cleanFile
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')     // Escape double quotes
    .replace(/\$/g, '\\$')    // Escape dollar signs
    .replace(/`/g, '\\`')     // Escape backticks
    .replace(/!/g, '\\!')     // Escape exclamation marks
}

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
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath, ...execOptions })
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
      const escapedFile = escapeFileName(file)
      const cleanFile = file.startsWith('"') && file.endsWith('"') ? file.slice(1, -1) : file
      
      // Use -- to separate options from file paths
      const command = isStaged 
        ? `git diff --cached -- "${escapedFile}"` 
        : `git diff -- "${escapedFile}"`
      
      commandHistory.push(command)
      const { stdout, stderr } = await execAsync(command, { cwd: currentRepoPath, ...execOptions })

      // If git diff returns content, use it
      if (stdout || stderr) {
        return success(stdout || stderr)
      }

      // For new files or files with no diff, try to read the full content
      if (!isStaged) {
        try {
          const fs = require('fs').promises
          const filePath = join(currentRepoPath, cleanFile)
          const fileContent = await fs.readFile(filePath, 'utf8')

          // Format as a new file diff
          const formattedDiff = `--- /dev/null
+++ a/${cleanFile}
@@ -0,0 +1,${fileContent.split('\n').length} @@
${fileContent
  .split('\n')
  .map((line) => '+' + line)
  .join('\n')}`

          return success(formattedDiff)
        } catch (readErr) {
          // If we can't read the file, return the original empty result
          return success('')
        }
      }

      return success(stdout || stderr || '')
    } catch (err) {
      // If git diff fails, try to read the file content for new files
      if (!isStaged && err.message.includes('did not match any file')) {
        try {
          const fs = require('fs').promises
          const filePath = join(currentRepoPath, file.replace(/"/g, ''))
          const fileContent = await fs.readFile(filePath, 'utf8')

          // Format as a new file diff
          const formattedDiff = `--- /dev/null
+++ a/${file.replace(/"/g, '')}
@@ -0,0 +1,${fileContent.split('\n').length} @@
${fileContent
  .split('\n')
  .map((line) => '+' + line)
  .join('\n')}`

          return success(formattedDiff)
        } catch (readErr) {
          return fail(err.message)
        }
      }

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

      // Build a map of commitHash → tag names from LOCAL refs only. Remote
      // tag info (remoteOnly / divergent detection) is fetched separately via
      // `git:loadRemoteTagInfo` to keep this handler fast (ls-remote does a
      // network round-trip).
      const tagsByCommit = {}

      const addTagToMap = (commitHash, tagName) => {
        if (!commitHash || !tagName) return
        const shortHash = commitHash.substring(0, 7)
        for (const key of [commitHash, shortHash]) {
          if (!tagsByCommit[key]) tagsByCommit[key] = []
          if (!tagsByCommit[key].includes(tagName)) tagsByCommit[key].push(tagName)
        }
      }

      const localTagsCommand = 'git show-ref --tags -d'
      commandHistory.push(localTagsCommand)
      try {
        const { stdout } = await execAsync(localTagsCommand, { cwd: currentRepoPath })
        stdout.split('\n').forEach((line) => {
          if (!line.trim()) return
          const [fullCommitHash, ref] = line.split(' ')
          if (!ref) return
          let tagName = ref.replace('refs/tags/', '')
          if (tagName.endsWith('^{}')) tagName = tagName.slice(0, -3)
          addTagToMap(fullCommitHash, tagName)
        })
      } catch (err) {
        // No local tags or error, continue
      }

      const localBranches = localOutput
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const isCurrent = line.startsWith('*')
          const cleanLine = line.substring(2).trim()

          // Handle detached HEAD: "(HEAD detached at <hash>)" / "(HEAD detached from <hash>)"
          const detachedMatch = cleanLine.match(/^\(HEAD detached (?:at|from) ([^)]+)\)/)
          if (detachedMatch) {
            const ref = detachedMatch[1].trim()
            const commitMatch = cleanLine.match(/\)\s+([a-f0-9]{7,40})/)
            const commitHash = commitMatch ? commitMatch[1] : null
            const tags = commitHash && tagsByCommit[commitHash] ? tagsByCommit[commitHash] : []
            return {
              name: ref,
              isCurrent,
              isDetached: true,
              upstream: null,
              ahead: 0,
              behind: 0,
              tags
            }
          }

          const nameMatch = cleanLine.match(/^([^\s]+)/)
          const name = nameMatch ? nameMatch[1] : ''

          // Extract commit hash (7-40 characters hex)
          const commitMatch = cleanLine.match(/^[^\s]+\s+([a-f0-9]{7,40})/)
          const commitHash = commitMatch ? commitMatch[1] : null

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

          // Get tags for this branch's commit
          const tags = commitHash && tagsByCommit[commitHash] ? tagsByCommit[commitHash] : []

          return {
            name,
            isCurrent,
            upstream,
            ahead,
            behind,
            tags
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

  // Background-only handler used to enrich the UI with remote tag info
  // (remote-only tags and divergent tags) without blocking the initial
  // branch list render. Performs one network round-trip (`ls-remote`).
  ipcMain.handle('git:loadRemoteTagInfo', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // Compare raw REF values (matches `git fetch`'s clobber check).
      const localTagRef = {}
      const remoteTagRef = {}
      const localTagNames = new Set()
      const remoteOnlyTagNames = new Set()
      const divergentTagNames = new Set()

      try {
        const { stdout } = await execAsync('git show-ref --tags', {
          cwd: currentRepoPath
        })
        stdout.split('\n').forEach((line) => {
          if (!line.trim()) return
          const [refValue, ref] = line.split(' ')
          if (!ref) return
          const tagName = ref.replace('refs/tags/', '')
          localTagNames.add(tagName)
          localTagRef[tagName] = refValue
        })
      } catch (err) {
        // No local tags
      }

      const remoteCmd = 'git ls-remote --tags origin'
      commandHistory.push(remoteCmd)
      try {
        const { stdout } = await execAsync(remoteCmd, { cwd: currentRepoPath })
        stdout.split('\n').forEach((line) => {
          if (!line.trim()) return
          const parts = line.split(/\s+/)
          const refValue = parts[0]
          const ref = parts[1]
          if (!ref) return
          const tagName = ref.replace('refs/tags/', '')
          if (tagName.endsWith('^{}')) return
          remoteTagRef[tagName] = refValue
          if (!localTagNames.has(tagName)) remoteOnlyTagNames.add(tagName)
        })
      } catch (err) {
        return fail(err.message)
      }

      Object.keys(localTagRef).forEach((tagName) => {
        if (
          remoteTagRef[tagName] &&
          localTagRef[tagName] !== remoteTagRef[tagName]
        ) {
          divergentTagNames.add(tagName)
        }
      })

      return success({
        remoteOnlyTags: Array.from(remoteOnlyTagNames),
        divergentTags: Array.from(divergentTagNames)
      })
    } catch (error) {
      return fail(error.message)
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

  ipcMain.handle('git:loadTags', async () => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // For divergence detection we compare the actual REF VALUE (what the
      // tag points to directly) — that's what `git fetch` checks when it
      // says "would clobber existing tag". The peeled commit is NOT enough:
      // a lightweight tag (ref = commit) and an annotated tag (ref = tag
      // object, peeled = commit) can both point to the same commit yet have
      // different ref values, which fetch still considers a clobber.
      const localTagRef = {} // tagName → ref value (tag-object hash for annotated, commit for lightweight)
      const localTagNames = new Set()
      try {
        // for-each-ref gives `<ref-value> <refname>` — more reliable than show-ref
        // for tags stored in packed-refs.
        const { stdout } = await execAsync(
          "git for-each-ref --format='%(objectname) %(refname)' refs/tags/",
          { cwd: currentRepoPath }
        )
        stdout.split('\n').forEach((line) => {
          if (!line.trim()) return
          const parts = line.split(/\s+/)
          const refValue = parts[0]
          const ref = parts[1]
          if (!refValue || !ref) return
          const tagName = ref.replace('refs/tags/', '')
          localTagNames.add(tagName)
          localTagRef[tagName] = refValue
        })
      } catch (err) {
        // No local tags
      }

      const remoteTagRef = {}
      const remoteTagNames = new Set()
      const remoteTagsCommand = 'git ls-remote --tags origin'
      commandHistory.push(remoteTagsCommand)
      try {
        const { stdout } = await execAsync(remoteTagsCommand, {
          cwd: currentRepoPath
        })
        stdout.split('\n').forEach((line) => {
          if (!line.trim()) return
          const parts = line.split(/\s+/)
          const refValue = parts[0]
          const ref = parts[1]
          if (!refValue || !ref) return
          const tagName = ref.replace('refs/tags/', '')
          // Skip peeled "^{}" entries — we only want the primary ref value.
          if (tagName.endsWith('^{}')) return
          remoteTagNames.add(tagName)
          remoteTagRef[tagName] = refValue
        })
      } catch (err) {
        // Offline / no remote — treat all local tags as local-only
      }

      const localOnlyTags = []
      const remoteOnlyTags = []
      const divergentTags = []
      const commonTags = []

      localTagNames.forEach((tagName) => {
        if (!remoteTagNames.has(tagName)) {
          localOnlyTags.push(tagName)
        } else if (localTagRef[tagName] !== remoteTagRef[tagName]) {
          divergentTags.push(tagName)
        } else {
          commonTags.push(tagName)
        }
      })
      remoteTagNames.forEach((tagName) => {
        if (!localTagNames.has(tagName)) remoteOnlyTags.push(tagName)
      })

      return success({
        localTags: [...commonTags, ...divergentTags, ...localOnlyTags],
        remoteTags: remoteOnlyTags,
        localOnlyTags,
        remoteOnlyTags,
        divergentTags,
        commonTags
      })
    } catch (error) {
      console.error('Error loading tags:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:deleteTag', async (_, tagName, mode) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    // Backward compat: old callers passed boolean isRemote → translate to mode
    let resolvedMode = mode
    if (typeof mode === 'boolean') {
      resolvedMode = mode ? 'remote' : 'both'
    }
    if (!['local', 'remote', 'both'].includes(resolvedMode)) {
      resolvedMode = 'both'
    }

    try {
      const commands = []

      if (resolvedMode === 'local' || resolvedMode === 'both') {
        const localCommand = `git tag -d ${tagName}`
        commands.push(localCommand)
        commandHistory.push(localCommand)
        await execAsync(localCommand, { cwd: currentRepoPath })
      }

      if (resolvedMode === 'remote' || resolvedMode === 'both') {
        const remoteCommand = `git push origin --delete refs/tags/${tagName}`
        commands.push(remoteCommand)
        commandHistory.push(remoteCommand)
        await execAsync(remoteCommand, { cwd: currentRepoPath })
      }

      return success({ commands })
    } catch (error) {
      console.error('Error deleting tag:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:createTag', async (_, { tagName, branchName, message }) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      // Create tag on the specified branch
      let command
      if (message) {
        // Annotated tag with message
        command = `git tag -a "${tagName}" -m "${message}" ${branchName}`
      } else {
        // Lightweight tag
        command = `git tag "${tagName}" ${branchName}`
      }
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success({ tagName, branchName, command })
    } catch (error) {
      console.error('Error creating tag:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:pushTag', async (_, tagName) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git push origin ${tagName}`
      commandHistory.push(command)
      await execAsync(command, { cwd: currentRepoPath })
      return success({ tagName, command })
    } catch (error) {
      console.error('Error pushing tag:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:getBranchCommits', async (_, branchName, limit = 10) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    try {
      const command = `git log ${branchName} --pretty=format:"%H|%h|%an|%ae|%ad|%s|%D" --date=iso -n ${limit}`
      commandHistory.push(command)
      const { stdout } = await execAsync(command, { cwd: currentRepoPath })
      
      const commits = stdout
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [hash, shortHash, author, email, date, message, refs] = line.split('|')
          const tags = refs ? refs.split(',').map(r => r.trim()).filter(r => r.startsWith('tag:')) : []
          return {
            hash,
            shortHash,
            author,
            email,
            date,
            message,
            tags: tags.map(t => t.replace('tag: ', '').trim())
          }
        })
      
      return success(commits)
    } catch (error) {
      console.error('Error getting branch commits:', error)
      return fail(error.message)
    }
  })

  ipcMain.handle('git:getCommitDiff', async (_, commitHash) => {
    if (!currentRepoPath) {
      return fail('No repository selected')
    }
    if (!commitHash) {
      return fail('Commit hash required')
    }
    try {
      // Files changed in this commit (M/A/D/R/C status + path)
      const nameStatusCmd = `git show --name-status --pretty=format: ${commitHash}`
      commandHistory.push(nameStatusCmd)
      const { stdout: nameStatusOut } = await execAsync(nameStatusCmd, {
        cwd: currentRepoPath,
        ...execOptions
      })
      const files = nameStatusOut
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split('\t')
          const status = parts[0]
          // Renames/copies: "R100\told\tnew" — show new path
          const file = parts[parts.length - 1]
          const oldFile = (status?.startsWith('R') || status?.startsWith('C')) ? parts[1] : null
          return { status, file, oldFile }
        })

      // Full diff output for display
      const diffCmd = `git show --format=fuller ${commitHash}`
      commandHistory.push(diffCmd)
      const { stdout: diffOut } = await execAsync(diffCmd, {
        cwd: currentRepoPath,
        ...execOptions
      })

      return success({ files, diff: diffOut })
    } catch (error) {
      console.error('Error getting commit diff:', error)
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
      const { stdout } = await execAsync(command, { cwd: currentRepoPath, ...execOptions })

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
        cwd: currentRepoPath,
        ...execOptions
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
        const escapedFile = escapeFileName(file)
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
        const escapedFile = escapeFileName(file)
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
        const escapedFile = escapeFileName(file)
        const cleanFile = file.startsWith('"') && file.endsWith('"') ? file.slice(1, -1) : file
        const unstageCmd = `git reset HEAD -- "${escapedFile}"`
        const discardCmd = `git checkout -- "${escapedFile}"`

        commandHistory.push(unstageCmd)
        commandHistory.push(discardCmd)

        try {
          // Check if file is untracked (new file)
          const statusCmd = `git status --porcelain -- "${escapedFile}"`
          const statusResult = await execAsync(statusCmd, { cwd: currentRepoPath })
          const isUntracked = statusResult.stdout.startsWith('??')

          if (isUntracked) {
            // For untracked files, just delete them from file system
            const fs = require('fs')
            const path = require('path')
            const fullPath = path.join(currentRepoPath, cleanFile)

            try {
              await fs.promises.unlink(fullPath)
              console.log(`Removed untracked file: ${fullPath}`)
            } catch (unlinkError) {
              console.error(`Error deleting file ${fullPath}:`, unlinkError)
            }
          } else {
            // For tracked files, use git commands
            await execAsync(unstageCmd, { cwd: currentRepoPath })
            await execAsync(discardCmd, { cwd: currentRepoPath })
          }
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
        { cwd: currentRepoPath, ...execOptions }
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

  ipcMain.handle('git:stashPush', async (_, message, files, keepIndex) => {
    if (!currentRepoPath) return fail('No repository selected')
    try {
      const args = ['stash', 'push']
      if (message) {
        args.push('-m', message)
      }
      if (keepIndex) {
        args.push('--keep-index')
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

  ipcMain.handle('git:renameStash', async (_, stashRef, newMessage) => {
    if (!currentRepoPath) return fail('No repository selected')

    try {
      // 1️⃣ normalize stash index
      let stashIndex = stashRef
      if (typeof stashRef === 'string' && stashRef.includes('stash@{')) {
        const match = stashRef.match(/stash@\{(\d+)\}/)
        if (match) stashIndex = parseInt(match[1])
      }

      // 2️⃣ get stash commit hash
      const { stdout: hashOutput } = await execAsync(`git rev-parse stash@{${stashIndex}}`, {
        cwd: currentRepoPath
      })

      const stashHash = hashOutput.trim()

      // 3️⃣ create NEW stash commit (NO working tree change)
      const { stdout: newCommit } = await execAsync(
        `git commit-tree ${stashHash}^{tree} -p ${stashHash}^1 -p ${stashHash}^2 -m "${newMessage.replace(/"/g, '\\"')}"`,
        { cwd: currentRepoPath }
      )

      const newHash = newCommit.trim()

      // 4️⃣ replace stash ref (safe rewrite, no reorder explosion)5
      await execAsync(`git update-ref refs/stash ${newHash}`, { cwd: currentRepoPath })

      commandHistory.push('git update-ref refs/stash ' + newHash)

      // 5️⃣ delete old stash
      await execAsync(`git stash drop ${stashIndex + 1}`, { cwd: currentRepoPath })
      commandHistory.push('git stash drop ' + (stashIndex + 1))

      return success({
        output: `Stash renamed to: ${newMessage}`,
        stash: newHash
      })
    } catch (error) {
      return fail(error.message)
    }
  })
}
