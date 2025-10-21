import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const refreshTags = createAsyncThunk(
  'git/refreshTags',
  async (_, { getState, rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available');
    }

    try {
      const result = await window.git.refreshTags();  
      
      if (result.success) {
        return { success: true };
      } else {
        return rejectWithValue('Failed to refresh tags');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error refreshing tags');
    }
  }
);

export const abortMerge = createAsyncThunk(
  'git/abortMerge',
  async (_, { getState, rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available');
    }

    try {
      const result = await window.git.abortMerge();
      
      if (result.success) {
        return { success: true };
      } else {
        return rejectWithValue(result.error || 'Failed to abort merge');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error aborting merge');
    }
  }
);

export const checkMergeInProgress = createAsyncThunk(
  'git/checkMergeInProgress',
  async (_, { getState, rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git integration not available');
    }

    try {
      const result = await window.git.checkMergeInProgress();
      
      if (result.success) {
        return { hasMergeInProgress: result.isMergeInProgress };
      } else {
        return rejectWithValue(result.error || 'Failed to check merge status');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error checking merge status');
    }
  }
);

export const deleteBranch = createAsyncThunk(
  'git/deleteBranch',
  async (branchName, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.deleteBranch(branchName);
      
      if (result.success) {
        return { success: true, branchName };
      } else {
        return rejectWithValue(result.error || 'Failed to delete branch');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error deleting branch');
    }
  }
);

export const loadBranches = createAsyncThunk(
  'git/loadBranches',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.listBranches();
      
      if (result.success) {
        const rawOutput = result.command.output || '';
        const current = rawOutput.split('\n')
          .find(line => line.trim().startsWith('* '));
        const currentBranch = current ? current.trim().replace('* ', '') : '';
        
        return {
          branches: result.branches,
          remoteBranches: result.remoteBranches,
          currentBranch
        };
      } else {
        return rejectWithValue(result.error || 'Failed to load branches');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error loading branches');
    }
  }
);

export const createBranch = createAsyncThunk(
  'git/createBranch',
  async (branchName, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.createBranch(branchName);
      
      if (result.success) {
        return { success: true, branchName };
      } else {
        return rejectWithValue(result.error || 'Failed to create branch');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error creating branch');
    }
  }
);

export const checkoutBranch = createAsyncThunk(
  'git/checkoutBranch',
  async (branchName, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.checkoutBranch(branchName);
      
      if (result.success) {
        return { success: true, branchName };
      } else {
        return rejectWithValue(result.error || 'Failed to checkout branch');
      }
    } catch (err) {
      // 捕獲完整的錯誤訊息，包括 stderr
      const errorMessage = err.message || err.toString() || 'Error checking out branch';
      return rejectWithValue(errorMessage);
    }
  }
);

export const deleteRemoteBranch = createAsyncThunk(
  'git/deleteRemoteBranch',
  async (branchName, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.deleteRemoteBranch(branchName);
      
      if (result.success) {
        return { success: true, branchName };
      } else {
        return rejectWithValue(result.error || 'Failed to delete remote branch');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error deleting remote branch');
    }
  }
);

export const fetchFromRemote = createAsyncThunk(
  'git/fetchFromRemote',
  async (pruneBranches = false, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.fetch(pruneBranches);
      
      if (result.success) {
        return { success: true };
      } else {
        return rejectWithValue(result.error || 'Failed to fetch from remote');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error fetching from remote');
    }
  }
);

export const pushToRemote = createAsyncThunk(
  'git/pushToRemote',
  async (forcePush = false, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.push(forcePush);
      
      if (result.success) {
        return { success: true };
      } else {
        return rejectWithValue(result.error || 'Failed to push to remote');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error pushing to remote');
    }
  }
);

export const commitChanges = createAsyncThunk(
  'git/commitChanges',
  async (commitMessage, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.commit(commitMessage);
      
      if (result.success) {
        return { success: true };
      } else {
        return rejectWithValue(result.error || 'Failed to commit changes');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error committing changes');
    }
  }
);

export const loadFileStatus = createAsyncThunk(
  'git/loadFileStatus',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.getStatus();
      
      if (result.success) {
        return { files: result.files };
      } else {
        return rejectWithValue(result.error || 'Failed to load file status');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error loading file status');
    }
  }
);

export const stageFile = createAsyncThunk(
  'git/stageFile',
  async (file, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.stageFile(file);
      
      if (result.success) {
        return { success: true, file };
      } else {
        return rejectWithValue(result.error || 'Failed to stage file');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error staging file');
    }
  }
);

export const unstageFile = createAsyncThunk(
  'git/unstageFile',
  async (file, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.unstageFile(file);
      
      if (result.success) {
        return { success: true, file };
      } else {
        return rejectWithValue(result.error || 'Failed to unstage file');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error unstaging file');
    }
  }
);

export const updateCommandHistory = createAsyncThunk(
  'git/updateCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const history = await window.git.getCommandHistory();
      return { history };
    } catch (err) {
      return rejectWithValue(err.message || 'Error updating command history');
    }
  }
);

export const clearCommandHistory = createAsyncThunk(
  'git/clearCommandHistory',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      await window.git.clearCommandHistory();
      return { success: true };
    } catch (err) {
      return rejectWithValue(err.message || 'Error clearing command history');
    }
  }
);

export const selectRepository = createAsyncThunk(
  'git/selectRepository',
  async (_, { rejectWithValue }) => {
    if (!window.git) {
      return rejectWithValue('Git API not initialized');
    }

    try {
      const result = await window.git.selectRepository();
      if (result && result.success) {
        return { path: result.path };
      } else {
        return rejectWithValue('Failed to select repository');
      }
    } catch (err) {
      return rejectWithValue(err.message || 'Error selecting repository');
    }
  }
);

const initialState = {
  showFooter: false,
  isRefreshingTags: false,
  hasMergeInProgress: false,
  error: null,
  branches: [],
  remoteBranches: [],
  currentBranch: '',
  fileStatus: [],
  loading: false,
  loadingMessage: '',
  commandHistory: [],
  repoPath: null,
  mergeStatus: { isInProgress: false, message: '' },
};

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    toggleFooter: (state) => {
      state.showFooter = !state.showFooter;
    },
    setMergeInProgress: (state, action) => {
      state.hasMergeInProgress = action.payload;
    },
    setMergeStatus: (state, action) => {
      state.mergeStatus = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action) => {
      state.loading = true;
      state.loadingMessage = action.payload || '';
    },
    stopLoading: (state) => {
      state.loading = false;
      state.loadingMessage = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshTags.pending, (state) => {
        state.isRefreshingTags = true;
        state.error = null;
      })
      .addCase(refreshTags.fulfilled, (state) => {
        state.isRefreshingTags = false;
      })
      .addCase(refreshTags.rejected, (state, action) => {
        state.isRefreshingTags = false;
        state.error = action.payload;
      })
      .addCase(abortMerge.fulfilled, (state) => {
        state.hasMergeInProgress = false;
      })
      .addCase(abortMerge.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(checkMergeInProgress.fulfilled, (state, action) => {
        state.hasMergeInProgress = action.payload.hasMergeInProgress;
      })
      .addCase(checkMergeInProgress.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteBranch.rejected, (state, action) => {
        state.error = action.payload;
      })
      // loadBranches
      .addCase(loadBranches.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Loading branches...';
        state.error = null;
      })
      .addCase(loadBranches.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.branches = action.payload.branches;
        state.remoteBranches = action.payload.remoteBranches;
        state.currentBranch = action.payload.currentBranch;
      })
      .addCase(loadBranches.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // createBranch
      .addCase(createBranch.pending, (state, action) => {
        state.loading = true;
        state.loadingMessage = `Creating branch...`;
        state.error = null;
      })
      .addCase(createBranch.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.branches.push(action.payload.branchName);
      })
      .addCase(createBranch.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // checkoutBranch
      .addCase(checkoutBranch.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Checking out branch...';
        state.error = null;
      })
      .addCase(checkoutBranch.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(checkoutBranch.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // deleteRemoteBranch
      .addCase(deleteRemoteBranch.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Deleting remote branch...';
        state.error = null;
      })
      .addCase(deleteRemoteBranch.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(deleteRemoteBranch.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // fetchFromRemote
      .addCase(fetchFromRemote.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Fetching from remote...';
        state.error = null;
      })
      .addCase(fetchFromRemote.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(fetchFromRemote.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // pushToRemote
      .addCase(pushToRemote.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Pushing to remote...';
        state.error = null;
      })
      .addCase(pushToRemote.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(pushToRemote.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // commitChanges
      .addCase(commitChanges.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Committing changes...';
        state.error = null;
      })
      .addCase(commitChanges.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(commitChanges.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // loadFileStatus
      .addCase(loadFileStatus.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Loading file status...';
        state.error = null;
      })
      .addCase(loadFileStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.fileStatus = action.payload.files;
      })
      .addCase(loadFileStatus.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // stageFile
      .addCase(stageFile.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Staging file...';
        state.error = null;
      })
      .addCase(stageFile.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(stageFile.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // unstageFile
      .addCase(unstageFile.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Unstaging file...';
        state.error = null;
      })
      .addCase(unstageFile.fulfilled, (state) => {
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(unstageFile.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      })
      // updateCommandHistory
      .addCase(updateCommandHistory.fulfilled, (state, action) => {
        state.commandHistory = action.payload.history;
      })
      .addCase(updateCommandHistory.rejected, (state, action) => {
        state.error = action.payload;
      })
      // clearCommandHistory
      .addCase(clearCommandHistory.fulfilled, (state) => {
        state.commandHistory = [];
      })
      .addCase(clearCommandHistory.rejected, (state, action) => {
        state.error = action.payload;
      })
      // selectRepository
      .addCase(selectRepository.pending, (state) => {
        state.loading = true;
        state.loadingMessage = 'Selecting repository...';
        state.error = null;
      })
      .addCase(selectRepository.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.repoPath = action.payload.path;
      })
      .addCase(selectRepository.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = '';
        state.error = action.payload;
      });
  },
});

export const { 
  toggleFooter, 
  setMergeInProgress,
  setMergeStatus,
  setError,
  clearError,
  setLoading,
  stopLoading,
} = gitSlice.actions;

export default gitSlice.reducer;
