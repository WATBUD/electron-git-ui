import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
      thunk: true, // Ensure thunk middleware is enabled
    }),
});

export default store;
