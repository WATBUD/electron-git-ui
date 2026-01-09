import { useDispatch, useSelector } from 'react-redux';
import { loadCommitHistory, checkoutCommit, mergeBranch } from '../../store/git';
import { GitGraph } from '../../components/GitGraph';

export const GitGraphContainer = ({ repoPath }) => {
  const dispatch = useDispatch();
  const { commits, currentBranch, unpushedCount } = useSelector((state) => state.git);

  const handleCheckout = (commitHash) => dispatch(checkoutCommit(commitHash));
  const handleMerge = (branch) => dispatch(mergeBranch(branch));
  const handleRefresh = () => dispatch(loadCommitHistory());

  return (
    <GitGraph
      commits={commits}
      currentBranch={currentBranch}
      unpushedCount={unpushedCount}
      onCheckout={handleCheckout}
      onMerge={handleMerge}
      onRefresh={handleRefresh}
    />
  );
};
