import { forwardRef, useState, useCallback, useImperativeHandle } from 'react'
import { BranchActionMenu } from './BranchActionMenu'
import { CommitActionMenu } from '../Commit/CommitActionMenu'
import { TagActionMenu } from '../Tag/TagActionMenu'
import { ModalPortal } from '../../../../shared/components/ModalPortal'

const INITIAL_STATE = {
  show: false,
  x: 0,
  y: 0,
  type: null,
  target: null,
  tags: []
}

/**
 * Dispatches the right context menu component based on the `type` parameter
 * passed to `open()`. Each menu component is fully self-contained (state,
 * submenus, click-outside) — this controller only owns the open/close flag
 * and the imperative API.
 */
export const BranchContextMenuController = forwardRef(
  function BranchContextMenuController(props, ref) {
    const [state, setState] = useState(INITIAL_STATE)

    const close = useCallback(() => {
      setState((prev) => (prev.show ? INITIAL_STATE : prev))
    }, [])

    const open = useCallback((payload) => {
      setState({ show: true, ...payload })
    }, [])

    useImperativeHandle(ref, () => ({ open, close }), [open, close])

    const sharedProps = {
      ...props,
      show: state.show,
      x: state.x,
      y: state.y,
      target: state.target,
      branchTags: state.tags,
      onClose: close
    }

    if (!state.show) return null

    return (
      <ModalPortal>
        {state.type === 'branch' && <BranchActionMenu {...sharedProps} />}
        {state.type === 'commit' && <CommitActionMenu {...sharedProps} />}
        {state.type === 'tag' && <TagActionMenu {...sharedProps} />}
      </ModalPortal>
    )
  }
)

export default BranchContextMenuController
