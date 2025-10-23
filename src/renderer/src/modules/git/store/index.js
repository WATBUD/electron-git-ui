import { configureStore } from '@reduxjs/toolkit';
import gitReducer from './gitSlice';

export const store = configureStore({
  reducer: {
    git: gitReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      thunk: true, // Ensure thunk middleware is enabled
    }),
});

export default store;
