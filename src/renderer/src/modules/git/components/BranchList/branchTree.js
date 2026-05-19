// Pure tree-building helpers used by BranchList. No hooks, no state — easy to test.

export const INDENT_PX = 14
export const BASE_PADDING_PX = 10
export const ROW_H = 26
export const OVERSCAN_ROWS = 8
export const BRANCH_COMMITS_LIMIT = 1000

// Compute horizontal indent for a tree entry's `branchMain` left padding.
export const indentStyle = (depth) => ({
  paddingLeft: BASE_PADDING_PX + depth * INDENT_PX
})

// Inline style for the commit row under an expanded branch so its dot lines up
// directly under the branch's GitBranch icon center. Sets `--commit-indent`
// consumed by `.commitItem` / `.commitItem::before` in BranchList.module.css.
//   = BASE_PADDING_PX (10) + depth*INDENT_PX
//   + folderChevronPlaceholder (14)  // space reserved by branch row
//   + branchMain gap (6)             // gap before the icon
//   + half of GitBranch icon (~6.5)  // align to icon center
//   + dot half-width adjustment (~4.5) so dot center == icon center
export const commitIndentStyle = (depth) => ({
  '--commit-indent': `${BASE_PADDING_PX + depth * INDENT_PX + 14 + 6 + 6.5 + 4.5}px`
})

// Build a tree from a flat branch list using `/` as path separator.
// Leaf nodes carry the original branchObj; folder nodes hold children.
export const buildBranchTree = (branchList) => {
  const root = { type: 'folder', name: '', children: new Map(), path: '' }
  for (const branchObj of branchList) {
    const name = typeof branchObj === 'string' ? branchObj : branchObj.name
    const parts = name.split('/')
    let node = root
    for (let i = 0; i < parts.length - 1; i++) {
      const seg = parts[i]
      const path = parts.slice(0, i + 1).join('/')
      let next = node.children.get(seg)
      if (!next) {
        next = { type: 'folder', name: seg, children: new Map(), path }
        node.children.set(seg, next)
      }
      node = next
    }
    const leafSeg = parts[parts.length - 1]
    node.children.set(leafSeg, { type: 'leaf', name: leafSeg, fullName: name, branchObj })
  }
  return root
}

// Count leaves under a folder (for the count badge).
export const countLeaves = (node) => {
  if (node.type === 'leaf') return 1
  let n = 0
  for (const child of node.children.values()) n += countLeaves(child)
  return n
}

// Flatten the tree into a sorted array of render entries.
// Folders sort before their siblings, current branch always first within its level.
// `pathPrefix` lets a caller namespace `collapsedFolders` keys (e.g. "remote:")
// so local/remote folder collapse state don't collide.
export const flattenTree = (
  node,
  depth,
  collapsedFolders,
  currentBranch,
  out,
  pathPrefix = ''
) => {
  const entries = Array.from(node.children.values()).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    if (a.type === 'leaf' && a.fullName === currentBranch) return -1
    if (b.type === 'leaf' && b.fullName === currentBranch) return 1
    return a.name.localeCompare(b.name)
  })
  for (const child of entries) {
    if (child.type === 'folder') {
      const key = pathPrefix + child.path
      const collapsed = collapsedFolders.has(key)
      out.push({ kind: 'folder', node: child, depth, collapsed })
      if (!collapsed)
        flattenTree(child, depth + 1, collapsedFolders, currentBranch, out, pathPrefix)
    } else {
      out.push({ kind: 'leaf', node: child, depth })
    }
  }
  return out
}
