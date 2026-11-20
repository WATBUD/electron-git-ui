// Authors the user saved through the UI, most recent first. Combined with the
// identities found in each project's git config by <AuthorPicker>.
const KEY = 'git_author_history'
const MAX = 20

const sameAuthor = (a, b) =>
  a.name === b.name && (a.email || '').toLowerCase() === (b.email || '').toLowerCase()

export const loadAuthorHistory = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((a) => a && (a.name || a.email)) : []
  } catch {
    return []
  }
}

export const rememberAuthor = (name, email) => {
  const author = { name: (name || '').trim(), email: (email || '').trim() }
  if (!author.name && !author.email) return
  try {
    const next = [author, ...loadAuthorHistory().filter((a) => !sameAuthor(a, author))].slice(
      0,
      MAX
    )
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — history is a convenience only
  }
}
