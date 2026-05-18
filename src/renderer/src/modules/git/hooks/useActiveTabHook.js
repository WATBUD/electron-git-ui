import { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import {
  loadFileStatus,
  loadBranches,
  loadTags,
  checkMergeInProgress,
  loadCommitHistory,
  loadStashes
} from '../store/git'
import { GIT_TABS } from '../constants/tabs'

/**
 * Centralizes "given a tab, refresh its data" dispatch orchestration.
 *
 * Redux holds state + thunks; this hook holds the *view-layer* policy of
 * which thunks to fire for which tab. Used by:
 *   - tab change   (user clicks a sidebar item)
 *   - window focus (return from another app)
 *   - repo switch  (Cmd/Ctrl + 1..5)
 *
 * Returns a stable callback you can pass anywhere; it always dispatches the
 * latest mapping without re-creating on every render.
 */
export const useActiveTabHook = () => {
  const dispatch = useDispatch()
  return useCallback(
    (tab) => {
      switch (tab) {
        case GIT_TABS.FILES:
          dispatch(loadFileStatus())
          break
        case GIT_TABS.BRANCH_VIEW:
          dispatch(checkMergeInProgress())
          dispatch(loadBranches())
          dispatch(loadTags())
          break
        case GIT_TABS.GRAPH:
          dispatch(loadCommitHistory())
          break
        case GIT_TABS.STASHES:
          dispatch(loadStashes())
          break
        default:
          break
      }
    },
    [dispatch]
  )
}

export default useActiveTabHook
