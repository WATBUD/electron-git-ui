import { useState } from 'react'

export const useConfirmDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    type: '', // 'tag', 'branch', or custom type
    name: '',
    isRemote: false,
    message: '',
    onConfirm: null,
    refreshCallback: null
  })

  const requestConfirm = ({
    type,
    name,
    isRemote = false,
    message,
    onConfirm,
    refreshCallback
  }) => {
    setConfirmDialog({
      show: true,
      type,
      name,
      isRemote,
      message: message || getDefaultMessage(type, name, isRemote),
      onConfirm,
      refreshCallback
    })
  }

  const handleConfirm = async () => {
    if (confirmDialog.onConfirm) {
      try {
        await confirmDialog.onConfirm()
        if (confirmDialog.refreshCallback) {
          confirmDialog.refreshCallback()
        }
      } catch (error) {
        console.error('Error in confirm action:', error)
        throw error
      }
    }
    setConfirmDialog({
      show: false,
      type: '',
      name: '',
      isRemote: false,
      message: '',
      onConfirm: null,
      refreshCallback: null
    })
  }

  const handleCancel = () => {
    setConfirmDialog({
      show: false,
      type: '',
      name: '',
      isRemote: false,
      message: '',
      onConfirm: null,
      refreshCallback: null
    })
  }

  const getDefaultMessage = (type, name, isRemote) => {
    switch (type) {
      case 'tag':
        return `Are you sure you want to delete the tag "${name}"? This will remove the tag from both local and remote repositories.`
      case 'branch':
        if (isRemote) {
          return `Are you sure you want to delete the remote branch "${name}"? This action cannot be undone.`
        }
        return `Are you sure you want to delete the local branch "${name}"? This action cannot be undone.`
      default:
        return `Are you sure you want to proceed?`
    }
  }

  const getTitle = (type) => {
    switch (type) {
      case 'tag':
        return 'Delete Tag'
      case 'branch':
        return 'Delete Branch'
      default:
        return 'Confirm'
    }
  }

  return {
    confirmDialog,
    requestConfirm,
    handleConfirm,
    handleCancel,
    getTitle
  }
}
