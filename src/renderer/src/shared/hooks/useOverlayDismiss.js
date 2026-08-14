import { useCallback, useRef } from 'react'

/**
 * Props for a modal-overlay element so it only dismisses on a genuine outside
 * click — a press AND release both landing on the overlay itself. Without this,
 * selecting text inside the modal and releasing the mouse over the overlay
 * fires a click on it and closes the dialog mid-selection.
 *
 * Usage:
 *   const overlayProps = useOverlayDismiss(onClose)
 *   <div className={styles.modalOverlay} {...overlayProps}>...
 */
export const useOverlayDismiss = (onDismiss) => {
  const downOnOverlay = useRef(false)

  const onMouseDown = useCallback((e) => {
    downOnOverlay.current = e.target === e.currentTarget
  }, [])

  const onClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget && downOnOverlay.current) onDismiss?.()
      downOnOverlay.current = false
    },
    [onDismiss]
  )

  return { onMouseDown, onClick }
}
