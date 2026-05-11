import { forwardRef, useState, useCallback, useImperativeHandle } from 'react'
import { BranchContextMenu } from './BranchContextMenu'

const INITIAL_STATE = {
  show: false,
  x: 0,
  y: 0,
  type: null,
  target: null,
  tags: []
}

export const BranchContextMenuController = forwardRef(function BranchContextMenuController(
  props,
  ref
) {
  const [state, setState] = useState(INITIAL_STATE)

  const close = useCallback(() => {
    setState((prev) => (prev.show ? INITIAL_STATE : prev))
  }, [])

  const open = useCallback((payload) => {
    setState({ show: true, ...payload })
  }, [])

  useImperativeHandle(ref, () => ({ open, close }), [open, close])

  return (
    <BranchContextMenu
      {...props}
      show={state.show}
      x={state.x}
      y={state.y}
      type={state.type}
      target={state.target}
      branchTags={state.tags}
      onClose={close}
    />
  )
})

export default BranchContextMenuController
