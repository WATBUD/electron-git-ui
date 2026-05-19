// Split `git show` / `git diff` output into per-file sections.
// Returns { header, files }:
//   - header: human-friendly metadata block (Author, CommitDate, Message body)
//   - files:  [{ path, lines: string[] }, ...] — one entry per `diff --git`
//
// Pure function — no React, no DOM. Safe to unit-test.
export const parseDiff = (diffText) => {
  const text = diffText || ''
  if (!text) return { header: '', files: [] }

  const lines = text.split('\n')
  const fileStartIdxs = []
  lines.forEach((line, idx) => {
    if (line.startsWith('diff --git ')) fileStartIdxs.push(idx)
  })

  const headerLines = fileStartIdxs.length > 0 ? lines.slice(0, fileStartIdxs[0]) : lines
  const filteredHeaderLines = headerLines.filter(
    (l) =>
      !/^AuthorDate:/i.test(l) &&
      !/^Commit:/i.test(l) &&
      !/^commit\s+[0-9a-f]{7,}/i.test(l)
  )

  const metaLines = []
  const bodyLines = []
  let inBody = false
  for (const l of filteredHeaderLines) {
    if (!inBody) {
      if (/^[A-Z][A-Za-z]*:/.test(l)) {
        metaLines.push(l.replace(/^([A-Za-z]+:)\s+/, '$1 '))
      } else if (l.trim() === '') {
        inBody = true
      } else {
        inBody = true
        bodyLines.push(l)
      }
    } else {
      bodyLines.push(l)
    }
  }
  const messageBody = bodyLines
    .map((l) => l.replace(/^ {4}/, ''))
    .join('\n')
    .trim()
  const header = [
    metaLines.join('\n'),
    messageBody ? `Message: ${messageBody}` : ''
  ]
    .filter(Boolean)
    .join('\n')
    .trim()

  const files = fileStartIdxs.map((startIdx, i) => {
    const endIdx = i + 1 < fileStartIdxs.length ? fileStartIdxs[i + 1] : lines.length
    const sectionLines = lines.slice(startIdx, endIdx)
    let path = null
    for (const l of sectionLines) {
      if (l.startsWith('+++ b/')) {
        path = l.slice(6)
        break
      }
    }
    if (!path) {
      const m = sectionLines[0].match(/^diff --git a\/(.+?) b\/(.+)$/)
      if (m) path = m[2]
    }
    return { path: path || `file-${i}`, lines: sectionLines }
  })

  return { header, files }
}

// Classify a single diff-output line to a CSS-friendly kind.
export const diffLineKind = (line) => {
  if (line.startsWith('+++') || line.startsWith('---')) return 'meta'
  if (line.startsWith('@@')) return 'hunk'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'del'
  if (
    line.startsWith('diff ') ||
    line.startsWith('index ') ||
    line.startsWith('new file') ||
    line.startsWith('deleted file') ||
    line.startsWith('similarity ') ||
    line.startsWith('rename ')
  ) {
    return 'meta'
  }
  return 'context'
}
