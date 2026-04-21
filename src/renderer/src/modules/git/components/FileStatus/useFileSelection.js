import { useState, useCallback } from 'react'

export const useFileSelection = () => {
  const [selectedFiles, setSelectedFiles] = useState(new Set())
  const [lastSelectedFile, setLastSelectedFile] = useState(null)

  const handleFileClick = useCallback((file, isStaged, e, allFiles) => {
    const fileKey = `${file}-${isStaged}`
    
    // Handle multi-selection with SHIFT + click
    if (e && e.shiftKey && lastSelectedFile) {
      // Only allow range selection within the same section (staged or unstaged)
      if (lastSelectedFile.isStaged !== isStaged) {
        // Different section, just select current file
        setSelectedFiles(new Set([fileKey]))
        setLastSelectedFile({ file, isStaged })
      } else {
        // Same section, perform range selection
        const sectionFiles = allFiles.filter(f => f.isStaged === isStaged)
        const currentIndex = sectionFiles.findIndex(f => f.file === file)
        const lastIndex = sectionFiles.findIndex(f => f.file === lastSelectedFile.file)
        
        if (currentIndex !== -1 && lastIndex !== -1) {
          const startIndex = Math.min(currentIndex, lastIndex)
          const endIndex = Math.max(currentIndex, lastIndex)
          const newSelection = new Set(selectedFiles)
          
          // Select all files in the range within the same section
          for (let i = startIndex; i <= endIndex; i++) {
            const targetFile = sectionFiles[i]
            if (targetFile) {
              newSelection.add(`${targetFile.file}-${targetFile.isStaged}`)
            }
          }
          
          setSelectedFiles(newSelection)
        }
      }
    } else if (e && (e.metaKey || e.ctrlKey)) {
      // Toggle selection with Cmd/Ctrl + click
      const newSelection = new Set(selectedFiles)
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
  }, [selectedFiles, lastSelectedFile])

  const clearSelection = useCallback(() => {
    setSelectedFiles(new Set())
    setLastSelectedFile(null)
  }, [])

  const isFileSelected = useCallback((file, isStaged) => {
    return selectedFiles.has(`${file}-${isStaged}`)
  }, [selectedFiles])

  const getSelectedFiles = useCallback(() => {
    return Array.from(selectedFiles).map(fileKey => {
      const [file] = fileKey.split('-')
      return file
    })
  }, [selectedFiles])

  const isMultipleSelection = useCallback(() => {
    return selectedFiles.size > 1
  }, [selectedFiles])

  return {
    selectedFiles,
    lastSelectedFile,
    handleFileClick,
    clearSelection,
    isFileSelected,
    getSelectedFiles,
    isMultipleSelection,
    setSelectedFiles,
    setLastSelectedFile
  }
}
