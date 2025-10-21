import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const refreshTags = createAsyncThunk(
  'ui/refreshTags',
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
  'ui/abortMerge',
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
  'ui/checkMergeInProgress',
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

const initialState = {
  showFooter: false,
  isRefreshingTags: false,
  hasMergeInProgress: false,
  error: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleFooter: (state) => {
      state.showFooter = !state.showFooter;
    },
    setMergeInProgress: (state, action) => {
      state.hasMergeInProgress = action.payload;
    },
    clearError: (state) => {
      state.error = null;
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
      });
  },
});

export const { 
  toggleFooter, 
  setMergeInProgress,
  clearError,
} = uiSlice.actions;

export default uiSlice.reducer;
