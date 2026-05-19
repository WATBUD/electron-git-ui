/* eslint-disable no-unused-vars */
import { createAsyncThunk } from '@reduxjs/toolkit'
import { updatePreviousHistoryIndex, setLoading } from './gitSlice'
// Generic async function to handle Git API calls with error handling
async function callGit(fn, rejectWithValue, fallbackError, fnName) {
  try {
    const result = await fn()
    console.log(`%c callGit ${fnName} result:`, 'color: blue;', result)
    if (!result.success) {
      return rejectWithValue(result.message ?? fallbackError)
    }

    return result
  } catch (err) {
    console.error(`Error in ${fnName}:`, err)
    return rejectWithValue(err?.message ?? fallbackError)
  }
}
// Utility function to check Git API initialization and handle errors
const checkGitApiInitialization = (rejectWithValue) => {
  if (!window.git) {
    return rejectWithValue('Git API not initialized')
  }
}

// Utility function to mark the start of a new operation
const markOperationStart = (dispatch, getState) => {
  const { commandHistory } = getState().git
  const startIndex = commandHistory.length
  dispatch(updatePreviousHistoryIndex(startIndex))
}

export const loadCommitHistory = createAsyncThunk(
  'git/loadCommitHistory',
  async (_, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.loadCommitHistory(),
      rejectWithValue,
      'Failed to load commit history',
      'loadCommitHistory'
    )
    return result
  }
)

export const loadTags = createAsyncThunk('git/loadTags', async (_, { rejectWithValue }) => {
  const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
  if (rejectIfNotInitialized) return rejectIfNotInitialized

  const result = await callGit(
    () => window.git.loadTags(),
    rejectWithValue,
    'Failed to load tags',
    'loadTags'
  )
  return result
})

// Background-only — does the slow ls-remote tag query and updates
// remoteOnlyTags / divergentTags. Does NOT touch loadingMessage so the
// UI stays responsive while it runs.
export const loadRemoteTagInfo = createAsyncThunk(
  'git/loadRemoteTagInfo',
  async (_, { rejectWithValue }) => {
    if (!window.git || !window.git.loadRemoteTagInfo) {
      return rejectWithValue('Git API not initialized')
    }
    try {
      const result = await window.git.loadRemoteTagInfo()
      if (!result?.success) {
        return rejectWithValue(result?.message || 'Failed to load remote tag info')
      }
      return result
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load remote tag info')
    }
  }
)

export const deleteTag = createAsyncThunk(
  'git/deleteTag',
  async ({ tagName, mode, isRemote }, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Back-compat: callers passing isRemote (boolean) → translate to mode
    const resolvedMode =
      mode || (typeof isRemote === 'boolean' ? (isRemote ? 'remote' : 'both') : 'both')

    const result = await callGit(
      () => window.git.deleteTag(tagName, resolvedMode),
      rejectWithValue,
      'Failed to delete tag',
      'deleteTag'
    )
    return result
  }
)

export const createTag = createAsyncThunk(
  'git/createTag',
  async ({ tagName, branchName, message }, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.createTag(tagName, branchName, message),
      rejectWithValue,
      'Failed to create tag',
      'createTag'
    )
    return result
  }
)

export const abortMerge = createAsyncThunk('git/abortMerge', async (_, { rejectWithValue }) => {
  const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
  if (rejectIfNotInitialized) return rejectIfNotInitialized

  const result = await callGit(
    () => window.git.mergeAbort(),
    rejectWithValue,
    'Failed to abort merge',
    'abortMerge'
  )
  return result
})

export const checkMergeInProgress = createAsyncThunk(
  'git/checkMergeInProgress',
  async (_, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.checkMergeInProgress(),
      rejectWithValue,
      'Failed to check merge status',
      'checkMergeInProgress'
    )
    return result
  }
)

export const deleteBranch = createAsyncThunk(
  'git/deleteBranch',
  async (payload, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Back-compat: callers can still pass the branch name as a plain string.
    const branchName = typeof payload === 'string' ? payload : payload?.branchName
    const force = typeof payload === 'string' ? false : !!payload?.force

    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.deleteBranch(branchName, force),
      rejectWithValue,
      'Failed to delete branch',
      'deleteBranch'
    )
    await dispatch(fetchCommandHistory())
    // Only reload on success — loadBranches.pending would otherwise wipe
    // state.error and the failure (e.g. "branch is not fully merged") would
    // never reach the ErrorModal.
    if (result?.success) {
      await dispatch(loadBranches())
    }
    return result
  }
)

export const renameBranch = createAsyncThunk(
  'git/renameBranch',
  async ({ oldName, newName }, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.renameBranch(oldName, newName),
      rejectWithValue,
      'Failed to rename branch',
      'renameBranch'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const loadBranches = createAsyncThunk(
  'git/loadBranches',
  async (_, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.loadBranches(),
      rejectWithValue,
      'Failed to load branches',
      'loadBranches'
    )
    await dispatch(fetchCommandHistory())
    return result
  }
)

export const createBranch = createAsyncThunk(
  'git/createBranch',
  async (branchName, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.createBranch(branchName),
      rejectWithValue,
      'Failed to create branch',
      'createBranch'
    )

    await dispatch(fetchCommandHistory())

    return result
  }
)

// Reads the repo's `user.name` / `user.email` (falling back to global config).
export const fetchUserConfig = createAsyncThunk(
  'git/fetchUserConfig',
  async (_, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    return callGit(
      () => window.git.getUserConfig(),
      rejectWithValue,
      'Failed to load user config',
      'getUserConfig'
    )
  }
)

// Writes `user.name` / `user.email` to the repo's local config.
export const setUserConfig = createAsyncThunk(
  'git/setUserConfig',
  async ({ name, email }, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.setUserConfig({ name, email }),
      rejectWithValue,
      'Failed to update user config',
      'setUserConfig'
    )

    await dispatch(fetchCommandHistory())
    return result
  }
)

export const mergeBranch = createAsyncThunk(
  'git/mergeBranch',
  async (sourceBranch, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.mergeBranch(sourceBranch),
      rejectWithValue,
      'Failed to merge branch',
      'mergeBranch'
    )

    // Reload branches, status and commit history after merge.
    // Also refresh hasMergeInProgress so the UI can react to a conflict
    // (e.g. auto-switch to the files tab to resolve conflicts).
    await Promise.all([
      dispatch(loadBranches()),
      dispatch(loadFileStatus()),
      dispatch(loadCommitHistory()),
      dispatch(checkMergeInProgress())
    ])
    return result
  }
)

// Fetches commit log for a single branch. Used by BranchList when expanding
// a branch or refreshing its commit list. Marks operation start + refreshes
// command history so GitHistory highlights the new entries.
export const getBranchCommits = createAsyncThunk(
  'git/getBranchCommits',
  async ({ branchName, limit }, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.getBranchCommits(branchName, limit),
      rejectWithValue,
      'Failed to load branch commits',
      'getBranchCommits'
    )

    await dispatch(fetchCommandHistory())
    return result
  }
)

// Loads commit diff for the "view commit" modal in BranchList.
export const getCommitDiff = createAsyncThunk(
  'git/getCommitDiff',
  async (commitHash, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.getCommitDiff(commitHash),
      rejectWithValue,
      'Failed to load commit diff',
      'getCommitDiff'
    )

    await dispatch(fetchCommandHistory())
    return result
  }
)

export const checkoutCommit = createAsyncThunk(
  'git/checkoutCommit',
  async (commitHash, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.checkoutCommit(commitHash),
      rejectWithValue,
      'Failed to checkout commit',
      'checkoutCommit'
    )

    await Promise.all([
      dispatch(loadCommitHistory()),
      dispatch(loadBranches()),
      dispatch(loadFileStatus())
    ])
    return result
  }
)

// Hard/soft/mixed reset of HEAD to a target commit. Reloads branches + file
// status + history afterwards so all panels reflect the new HEAD.
export const resetToCommit = createAsyncThunk(
  'git/resetToCommit',
  async ({ commitHash, mode }, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }
    const result = await callGit(
      () => window.git.resetToCommit({ commitHash, mode }),
      rejectWithValue,
      `Failed to reset (${mode})`,
      'resetToCommit'
    )
    await Promise.all([
      dispatch(loadBranches()),
      dispatch(loadFileStatus()),
      dispatch(loadCommitHistory())
    ])
    return result
  }
)

export const checkoutBranch = createAsyncThunk(
  'git/checkoutBranch',
  async (branchName, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.checkoutBranch(branchName),
      rejectWithValue,
      'Failed to checkout branch',
      'checkoutBranch'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const deleteRemoteBranch = createAsyncThunk(
  'git/deleteRemoteBranch',
  async (branchName, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.deleteRemoteBranch(branchName),
      rejectWithValue,
      'Failed to delete remote branch',
      'deleteRemoteBranch'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const fetchFromRemote = createAsyncThunk(
  'git/fetchFromRemote',
  async (pruneBranches = false, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.fetch(pruneBranches),
      rejectWithValue,
      'Failed to fetch from remote',
      'fetchFromRemote'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const pullFromRemote = createAsyncThunk(
  'git/pullFromRemote',
  async (_, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.branchPull(),
      rejectWithValue,
      'Failed to pull from remote',
      'pullFromRemote'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const pushToRemote = createAsyncThunk(
  'git/pushToRemote',
  async (forcePush = false, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.branchPush(forcePush),
      rejectWithValue,
      'Failed to push to remote',
      'pushToRemote'
    )
    await dispatch(loadBranches())
    return result
  }
)

export const commitChanges = createAsyncThunk(
  'git/commitChanges',
  async (commitMessage, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.commit(commitMessage),
      rejectWithValue,
      'Failed to commit changes',
      'commitChanges'
    )
    await Promise.all([
      dispatch(loadFileStatus()),
      dispatch(fetchCommandHistory()),
      dispatch(loadCommitHistory())
    ])
    return result
  }
)

export const discardFileChanges = createAsyncThunk(
  'git/discardFileChanges',
  async (files, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.discardFileChanges(Array.isArray(files) ? files : [files]),
      rejectWithValue,
      'Failed to discard file changes',
      'discardFileChanges'
    )

    // Update the status after successful discard
    await Promise.all([dispatch(loadFileStatus()), dispatch(fetchCommandHistory())])
    return result
  }
)

export const stageFile = createAsyncThunk(
  'git/stageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.stageFile(file),
      rejectWithValue,
      'Failed to stage file',
      'stageFile'
    )

    await dispatch(loadFileStatus())
    return result
  }
)

export const unstageFile = createAsyncThunk(
  'git/unstageFile',
  async (file, { getState, rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.unstageFile(file),
      rejectWithValue,
      'Failed to unstage file',
      'unstageFile'
    )

    // Refresh the file status after unstaging
    await dispatch(loadFileStatus())
    return result
  }
)

export const loadFileStatus = createAsyncThunk(
  'git/loadFileStatus',
  async (_, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }
    // Mark the start of this operation
    markOperationStart(dispatch, getState)
    const result = await callGit(
      () => window.git.getStatus(),
      rejectWithValue,
      'Failed to load file status',
      'getStatus'
    )

    await dispatch(fetchCommandHistory())
    return result
  }
)

export const fetchCommandHistory = createAsyncThunk(
  'git/fetchCommandHistory',
  async (_, { rejectWithValue, getState, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.getCommandHistory(),
      rejectWithValue,
      'Error updating command history',
      'getCommandHistory'
    )

    // Don't automatically update previousHistoryIndex here
    // It should be manually updated at the start of operations

    return result
  }
)

export const clearCommandHistory = createAsyncThunk(
  'git/clearCommandHistory',
  async (_, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.clearCommandHistory(),
      rejectWithValue,
      'Error clearing command history',
      'clearCommandHistory'
    )

    // Reset the previous history index when clearing history
    dispatch(updatePreviousHistoryIndex(-1))
    return result
  }
)

export const selectRepository = createAsyncThunk(
  'git/selectRepository',
  async (_, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.selectRepository(),
      rejectWithValue,
      'Error selecting repository',
      'selectRepository'
    )
    await dispatch(loadCommitHistory())
    await dispatch(fetchCommandHistory())
    return result
  }
)

export const openRepository = createAsyncThunk(
  'git/openRepository',
  async (path, { rejectWithValue, dispatch }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.openRepository(path),
      rejectWithValue,
      'Error opening repository',
      'openRepository'
    )
    await dispatch(loadCommitHistory())
    await dispatch(fetchCommandHistory())
    return result
  }
)

export const getCachedDiff = createAsyncThunk(
  'git/getCachedDiff',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    const result = await callGit(
      () => window.git.getCachedDiff(),
      rejectWithValue,
      'Failed to get cached diff',
      'getCachedDiff'
    )

    return result
  }
)

export const getFileDiff = createAsyncThunk(
  'git/getFileDiff',
  async ({ file, isStaged }, { rejectWithValue, dispatch, getState }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.getFileDiff(file, isStaged),
      rejectWithValue,
      'Failed to get file diff',
      'getFileDiff'
    )

    await dispatch(fetchCommandHistory())
    return result
  }
)

// ── Stash thunks ────────────────────────────────────────────────────────────────────

export const loadStashes = createAsyncThunk(
  'git/loadStashes',
  async (_, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashList(),
      rejectWithValue,
      'Failed to load stashes',
      'stashList'
    )
    await dispatch(fetchCommandHistory())
    return result
  }
)

export const pushStash = createAsyncThunk(
  'git/pushStash',
  async (args, { rejectWithValue, dispatch }) => {
    // If args is a string, it's the message (legacy)
    // If args is an object, it can have { message, files, keepIndex }
    const message = typeof args === 'string' ? args : args?.message
    const files = typeof args === 'object' ? args?.files : undefined
    const keepIndex = typeof args === 'object' ? args?.keepIndex : undefined

    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashPush(message, files, keepIndex),
      rejectWithValue,
      'Failed to push stash',
      'stashPush'
    )
    await Promise.all([dispatch(loadStashes()), dispatch(loadFileStatus())])
    return result
  }
)

export const applyStash = createAsyncThunk(
  'git/applyStash',
  async (stashIndex, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashApply(stashIndex),
      rejectWithValue,
      'Failed to apply stash',
      'stashApply'
    )
    await Promise.all([dispatch(loadStashes()), dispatch(loadFileStatus())])
    return result
  }
)

export const popStash = createAsyncThunk(
  'git/popStash',
  async (stashIndex, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashPop(stashIndex),
      rejectWithValue,
      'Failed to pop stash',
      'stashPop'
    )
    await Promise.all([dispatch(loadStashes()), dispatch(loadFileStatus())])
    return result
  }
)

export const dropStash = createAsyncThunk(
  'git/dropStash',
  async (stashIndex, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashDrop(stashIndex),
      rejectWithValue,
      'Failed to drop stash',
      'stashDrop'
    )
    await dispatch(loadStashes())
    return result
  }
)

export const getStashDiff = createAsyncThunk(
  'git/getStashDiff',
  async (stashIndex, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.getStashDiff(stashIndex),
      rejectWithValue,
      'Failed to get stash diff',
      'getStashDiff'
    )
    return result
  }
)

export const renameStash = createAsyncThunk(
  'git/renameStash',
  async ({ stashIndex, newMessage }, { rejectWithValue, dispatch }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.renameStash(stashIndex, newMessage),
      rejectWithValue,
      'Failed to rename stash',
      'renameStash'
    )
    // Only proceed with updates if successful
    await Promise.all([dispatch(loadStashes()), dispatch(fetchCommandHistory())])
    return result
  }
)

export const fastForwardAllBranches = createAsyncThunk(
  'git/fastForwardAllBranches',
  async (_, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Mark the start of this operation
    markOperationStart(dispatch, getState)
    dispatch(setLoading('Running Fast-Forward All...'))

    try {
      // Step 1: fetch all --prune
      dispatch(setLoading('Fetching from remote...'))
      const fetchRes = await window.git.exec('git fetch --all --prune')
      if (!fetchRes.success) {
        throw new Error(fetchRes.message || 'Fetch failed')
      }

      // Step 2: Get current branch name
      const currentBranchRes = await window.git.exec('git branch --show-current')
      if (!currentBranchRes.success) {
        throw new Error(currentBranchRes.message || 'Failed to identify current branch')
      }
      const originalBranch = currentBranchRes.data.trim()

      // Step 3: Get all local branches and their upstreams
      const forEachRefRes = await window.git.exec(
        "git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads"
      )
      if (!forEachRefRes.success) {
        throw new Error(forEachRefRes.message || 'Failed to list tracking branches')
      }

      const branchLines = forEachRefRes.data
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)

      const trackingBranches = []
      for (const line of branchLines) {
        const [branchName, upstreamName] = line.split(/\s+/)
        if (branchName && upstreamName) {
          trackingBranches.push({ branchName, upstreamName })
        }
      }

      if (trackingBranches.length === 0) {
        alert('ℹ️ No tracking branches found to update.')
        await dispatch(loadBranches())
        return { success: true, message: 'No tracking branches found to update.' }
      }

      const results = []
      let successCount = 0
      let failCount = 0

      // Step 4: Iterate and update tracking branches
      for (const { branchName, upstreamName } of trackingBranches) {
        dispatch(setLoading(`Updating ${branchName}...`))

        // Checkout the target branch
        const checkoutRes = await window.git.exec(`git checkout ${branchName}`)
        if (!checkoutRes.success) {
          results.push({ branchName, success: false, error: checkoutRes.message })
          failCount++
          continue
        }

        // Run merge --ff-only
        const mergeRes = await window.git.exec(`git merge --ff-only ${upstreamName}`)
        if (mergeRes.success) {
          results.push({ branchName, success: true })
          successCount++
        } else {
          results.push({ branchName, success: false, error: mergeRes.message })
          failCount++
        }
      }

      // Step 5: Restore original branch
      if (originalBranch) {
        dispatch(setLoading(`Restoring current branch (${originalBranch})...`))
        await window.git.exec(`git checkout ${originalBranch}`)
      }

      // Reload state after everything completes
      await Promise.all([
        dispatch(loadBranches()),
        dispatch(loadCommitHistory()),
        dispatch(fetchCommandHistory())
      ])

      // Build summary result
      const summaryMsg = `Fast-Forward completed: ${successCount} updated successfully, ${failCount} skipped/failed.`

      if (failCount > 0) {
        const failedDetails = results
          .filter((r) => !r.success)
          .map((r) => `  - ${r.branchName}: ${r.error}`)
          .join('\n')

        alert(
          `⚠️ Fast-Forward Partial Success\n\n${summaryMsg}\n\nFailed branches:\n${failedDetails}`
        )
      } else {
        alert(
          `✅ Fast-Forward Success\n\nAll ${successCount} tracking branches successfully updated!`
        )
      }

      return { success: true, results }
    } catch (err) {
      // In case of unhandled error, make sure we at least reload states
      await Promise.all([
        dispatch(loadBranches()),
        dispatch(loadCommitHistory()),
        dispatch(fetchCommandHistory())
      ])
      return rejectWithValue(err.message || 'Fast-Forward All failed')
    } finally {
      dispatch(setLoading(''))
    }
  }
)
