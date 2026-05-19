import { useState } from 'react'

const initialConfirmState = {
  show: false,
  type: '',
  name: '',
  isRemote: false,
  mode: '',
  message: '',
  onConfirm: null,
  refreshCallback: null,
  toggle: null,
  toggleValue: false
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
    refreshCallback,
    toggle = null
  }) => {
    setConfirmDialog({
      show: true,
      type,
      name,
      isRemote,
      mode,
      message: message || getDefaultMessage(type, name, isRemote, mode),
      onConfirm,
      refreshCallback,
      toggle,
      toggleValue: toggle?.defaultValue ?? false
    })
  }

  const setToggleValue = (value) => {
    setConfirmDialog((prev) => ({ ...prev, toggleValue: value }))
  }

  const handleConfirm = async () => {
    // Snapshot callbacks then close immediately so the user can't double-click.
    const onConfirm = confirmDialog.onConfirm
    const refreshCallback = confirmDialog.refreshCallback
    const toggleValue = confirmDialog.toggleValue
    setConfirmDialog(initialConfirmState)
    if (!onConfirm) return
    try {
      await onConfirm({ toggleValue })
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
      case 'reset':
        return `Reset HEAD to ${name}? This will move the current branch tip.`
      case 'stash':
        return `Permanently delete this stash?\n"${name}"`
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
      case 'reset':
        return 'Reset HEAD'
      case 'stash':
        return 'Drop Stash'
      default:
        return 'Confirm'
    }
  }

  return {
    confirmDialog,
    requestConfirm,
    handleConfirm,
    handleCancel,
    setToggleValue,
    getTitle
  }
}
