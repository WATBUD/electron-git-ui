// Path display mode for file rows in FileStatus.
// Single source of truth so FileList (state + buttons) and FileItem
// (formatter) can't drift on the string values.
export const PathMode = Object.freeze({
  NAME: 'name', // filename only — e.g. "FileItem.jsx"
  SHORT: 'short', // parent + filename (everything after the 2nd-to-last slash) — e.g. "FileStatus/FileItem.jsx"
  FULL: 'full' // untouched path
})
