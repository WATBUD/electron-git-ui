import { useState, useCallback, useRef, useEffect } from 'react'

export const useFileSelection = () => {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [lastSelectedFile, setLastSelectedFile] = useState(null)
  const allFilesRef = useRef([])
  const selectedFilesRef = useRef(new Set())
  const lastSelectedFileRef = useRef(null)

  // Keep refs in sync with state
  useEffect(() => {
    selectedFilesRef.current = selectedFiles
  }, [selectedFiles])

  useEffect(() => {
    lastSelectedFileRef.current = lastSelectedFile
  }, [lastSelectedFile])

  const handleFileClick = useCallback((file, isStaged, e, allFiles) => {
    // Always update the ref with current files list
    if (allFiles && allFiles.length > 0) {
      allFilesRef.current = allFiles
    }
    
    const fileKey = `${file}-${isStaged}`
    
    // Handle multi-selection with SHIFT + click
    if (e && e.shiftKey && lastSelectedFileRef.current) {
      e.preventDefault() // Prevent text selection
      e.stopPropagation() // Prevent event bubbling
      
      // Only allow range selection within the same section (staged or unstaged)
      if (lastSelectedFileRef.current.isStaged !== isStaged) {
        // Different section, just select current file
        setSelectedFiles(new Set([fileKey]))
        setLastSelectedFile({ file, isStaged })
        return
      }
      
      // Same section, perform range selection
      // Use the most recent allFiles if available, otherwise use ref
      const filesList = (allFiles && allFiles.length > 0) ? allFiles : allFilesRef.current
      
      if (!filesList || filesList.length === 0) {
        setSelectedFiles(new Set([fileKey]))
        setLastSelectedFile({ file, isStaged })
        return
      }
      
      // Filter to get only files from the current section
      const sectionFiles = filesList.filter(f => f.isStaged === isStaged)
      
      if (sectionFiles.length === 0) {
        setSelectedFiles(new Set([fileKey]))
        setLastSelectedFile({ file, isStaged })
        return
      }
      
      const currentIndex = sectionFiles.findIndex(f => f.file === file)
      const lastIndex = sectionFiles.findIndex(f => f.file === lastSelectedFileRef.current.file)
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const startIndex = Math.min(currentIndex, lastIndex)
        const endIndex = Math.max(currentIndex, lastIndex)
        const newSelection = new Set()
        
        // Select all files in the range within the same section
        for (let i = startIndex; i <= endIndex; i++) {
          const targetFile = sectionFiles[i]
          if (targetFile) {
            newSelection.add(`${targetFile.file}-${isStaged}`)
          }
        }
        
        setSelectedFiles(newSelection)
        // Update lastSelectedFile to current file for next shift-click
        setLastSelectedFile({ file, isStaged })
      } else {
        // Fallback: just select current file
        setSelectedFiles(new Set([fileKey]))
        setLastSelectedFile({ file, isStaged })
      }
    } else if (e && (e.metaKey || e.ctrlKey)) {
      e.preventDefault() // Prevent default behavior
      
      // Toggle selection with Cmd/Ctrl + click
      const newSelection = new Set(selectedFilesRef.current)
      if (newSelection.has(fileKey)) {
        newSelection.delete(fileKey)
      } else {
        newSelection.add(fileKey)
      }
      setSelectedFiles(newSelection)
      setLastSelectedFile({ file, isStaged })
    } else {
      // Normal click - clear selection and select current file
      setSelectedFiles(new Set([fileKey]))
      setLastSelectedFile({ file, isStaged })
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set())
    setLastSelectedFile(null)
  }, [])

  const isFileSelected = useCallback((file, isStaged) => {
    return selectedFiles.has(`${file}-${isStaged}`)
  }, [selectedFiles])

  const getSelectedFiles = useCallback(() => {
    return Array.from(selectedFiles).map(fileKey => {
      // Find the last occurrence of '-true' or '-false' to separate file path from staging status
      const stagedIndex = fileKey.lastIndexOf('-true')
      const unstagedIndex = fileKey.lastIndexOf('-false')
      const statusIndex = Math.max(stagedIndex, unstagedIndex)
      
      if (statusIndex !== -1) {
        return fileKey.substring(0, statusIndex)
      }
      return fileKey
    })
  }, [selectedFiles])

  const isMultipleSelection = useCallback(() => {
    return selectedFiles.size > 1
  }, [selectedFiles])

  const cleanupInvalidSelections = useCallback((validFileKeys) => {
    // Remove selections for files that no longer exist
    const newSelection = new Set()
    let hasChanges = false
    
    selectedFilesRef.current.forEach(fileKey => {
      if (validFileKeys.has(fileKey)) {
        newSelection.add(fileKey)
      } else {
        hasChanges = true
      }
    })
    
    if (hasChanges) {
      setSelectedFiles(newSelection)
    }
    
    // Clear lastSelectedFile if it no longer exists
    if (lastSelectedFileRef.current) {
      const lastFileKey = `${lastSelectedFileRef.current.file}-${lastSelectedFileRef.current.isStaged}`
      if (!validFileKeys.has(lastFileKey)) {
        setLastSelectedFile(null)
      }
    }
  }, [])

  return {
    selectedFiles,
    lastSelectedFile,
    handleFileClick,
    clearSelection,
    isFileSelected,
    getSelectedFiles,
    isMultipleSelection,
    setSelectedFiles,
    setLastSelectedFile,
    cleanupInvalidSelections
  }
}
