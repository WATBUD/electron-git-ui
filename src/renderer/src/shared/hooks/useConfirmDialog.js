import { useState } from 'react'

const initialConfirmState = {
  show: false,
  type: '',
  name: '',
  isRemote: false,
  mode: '',
  message: '',
  onConfirm: null,
  refreshCallback: null
}

export const useConfirmDialog = () => {
  const [confirmDialog, setConfirmDialog] = useState(initialConfirmState)

  const requestConfirm = ({
    type,
    name,
    isRemote = false,
    mode = '',
    message,
    onConfirm,
    refreshCallback
  }) => {
    setConfirmDialog({
      show: true,
      type,
      name,
      isRemote,
      mode,
      message: message || getDefaultMessage(type, name, isRemote, mode),
      onConfirm,
      refreshCallback
    })
  }

  const handleConfirm = async () => {
    // Snapshot callbacks then close immediately so the user can't double-click.
    const onConfirm = confirmDialog.onConfirm
    const refreshCallback = confirmDialog.refreshCallback
    setConfirmDialog(initialConfirmState)
    if (!onConfirm) return
    try {
      await onConfirm()
      if (refreshCallback) refreshCallback()
    } catch (error) {
      console.error('Error in confirm action:', error)
    }
  }

  const handleCancel = () => {
    setConfirmDialog(initialConfirmState)
  }

  const getDefaultMessage = (type, name, isRemote, mode) => {
    switch (type) {
      case 'tag': {
        if (mode === 'local') {
          return `Delete the local copy of tag "${name}"? Remote tag will be kept.`
        }
        if (mode === 'remote') {
          return `Delete the remote tag "${name}" on origin? Local tag will be kept.`
        }
        return `Delete the tag "${name}" from both local and remote repositories?`
      }
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
