import { createAsyncThunk } from '@reduxjs/toolkit'
import { updatePreviousHistoryIndex } from '../../store/git'
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
    const { commits = [], currentHead, currentBranch, unpushedCount = 0 } = result.data ?? {}
    return {
      commits,
      currentHead,
      currentBranch,
      unpushedCount
    }
  }
)

export const refreshTags = createAsyncThunk(
  'git/refreshTags',
  async (_, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.refreshTags(),
      rejectWithValue,
      'Failed to refresh tags',
      'refreshTags'
    )
    return result
  }
)

export const abortMerge = createAsyncThunk(
  'git/abortMerge',
  async (_, { rejectWithValue }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    const result = await callGit(
      () => window.git.mergeAbort(),
      rejectWithValue,
      'Failed to abort merge',
      'abortMerge'
    )
    return result
  }
)

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
  async (branchName, { rejectWithValue, dispatch, getState }) => {
    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized

    // Mark the start of this operation
    markOperationStart(dispatch, getState)

    const result = await callGit(
      () => window.git.deleteBranch(branchName),
      rejectWithValue,
      'Failed to delete branch',
      'deleteBranch'
    )
    await dispatch(updateCommandHistory())
    await dispatch(loadBranches())
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
    await dispatch(updateCommandHistory())
    return {
      branches: result.data?.branches,
      remoteBranches: result.data?.remoteBranches,
      currentBranch: result.data?.currentBranch
    }
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

    await dispatch(updateCommandHistory())

    return { success: true, branchName }
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

    // Reload branches, status and commit history after merge
    await Promise.all([
      dispatch(loadBranches()),
      dispatch(loadFileStatus()),
      dispatch(loadCommitHistory())
    ])
    return { success: true }
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
      dispatch(loadCommitHistory())
      //dispatch(loadBranches()),
      //dispatch(loadFileStatus())
    ])
    return { success: true }
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
      dispatch(updateCommandHistory()),
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
    await Promise.all([dispatch(loadFileStatus()), dispatch(updateCommandHistory())])
    return {
      success: true,
      files: Array.isArray(files) ? files : [files],
      count: result.data?.count || (Array.isArray(files) ? files.length : 1)
    }
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

    await dispatch(updateCommandHistory())
    return result
  }
)

export const updateCommandHistory = createAsyncThunk(
  'git/updateCommandHistory',
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
    return { success: true }
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
    await dispatch(updateCommandHistory())
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
    await dispatch(updateCommandHistory())
    return result
  }
)

export const getCachedDiff = createAsyncThunk(
  'git/getCachedDiff',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized')
    }

    try {
      const result = await window.git.getCachedDiff()
      if (result.success) {
        return result.data
      }
      return rejectWithValue(result.message || 'Failed to get cached diff')
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to get cached diff')
    }
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

    await dispatch(updateCommandHistory())
    return result.data
  }
)

// ── Stash thunks ────────────────────────────────────────────────────────────────────

export const loadStashes = createAsyncThunk('git/loadStashes', async (_, { rejectWithValue }) => {
  const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
  if (rejectIfNotInitialized) return rejectIfNotInitialized
  const result = await callGit(
    () => window.git.stashList(),
    rejectWithValue,
    'Failed to load stashes',
    'stashList'
  )
  return result.data
})

export const pushStash = createAsyncThunk(
  'git/pushStash',
  async (args, { rejectWithValue, dispatch }) => {
    // If args is a string, it's the message (legacy)
    // If args is an object, it can have { message, files }
    const message = typeof args === 'string' ? args : args?.message
    const files = typeof args === 'object' ? args?.files : undefined

    const rejectIfNotInitialized = checkGitApiInitialization(rejectWithValue)
    if (rejectIfNotInitialized) return rejectIfNotInitialized
    const result = await callGit(
      () => window.git.stashPush(message, files),
      rejectWithValue,
      'Failed to push stash',
      'stashPush'
    )
    await Promise.all([dispatch(loadStashes()), dispatch(loadFileStatus())])
    return result.data
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
    return result.data
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
    return result.data
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
    return result.data
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
      'Failed to load stash diff',
      'getStashDiff'
    )
    return result.data
  }
)
