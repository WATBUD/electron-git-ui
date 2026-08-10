// Binary file extensions where a text diff is unreadable / garbled.
// Matches how other Git UIs (GitHub, GitLab, SourceTree) handle these.
export const BINARY_EXTENSIONS = new Set([
  // Compiled / object code
  'dex',
  'class',
  'o',
  'obj',
  'a',
  'lib',
  'so',
  'dylib',
  'dll',
  'exe',
  'pyc',
  'pyo',
  // Archives / packages
  'zip',
  'tar',
  'gz',
  'tgz',
  'bz2',
  '7z',
  'rar',
  'jar',
  'war',
  'ear',
  'apk',
  'aab',
  'ipa',
  'aar',
  // Images
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'ico',
  'webp',
  'tif',
  'tiff',
  'psd',
  'ai',
  'heic',
  'avif',
  // Audio / video
  'mp3',
  'mp4',
  'avi',
  'mov',
  'mkv',
  'wav',
  'flac',
  'ogg',
  'webm',
  'm4a',
  'm4v',
  'aac',
  // Documents
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  // Misc
  'bin',
  'dat',
  'db',
  'sqlite',
  'sqlite3',
  'keystore',
  'jks',
  'p12',
  'pfx',
  'crt',
  'cer'
])

// git diff markers that indicate a binary blob (no readable text diff).
const BINARY_DIFF_MARKERS = [/^Binary files .+ differ\s*$/m, /^GIT binary patch\s*$/m]

// Image extensions the diff panel can render as an inline preview instead of
// the generic "no preview" placeholder. Maps to an <img>-renderable format
// (SVG is handled as a text diff, not here).
export const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'ico', 'webp', 'avif'])

export const isImageFile = (fileName) => {
  if (!fileName) return false
  const ext = fileName.split('.').pop()?.toLowerCase()
  return !!ext && IMAGE_EXTENSIONS.has(ext)
}

export const isBinaryFile = (fileName, diffText) => {
  if (diffText && BINARY_DIFF_MARKERS.some((re) => re.test(diffText))) return true
  if (!fileName) return false
  const ext = fileName.split('.').pop()?.toLowerCase()
  return !!ext && BINARY_EXTENSIONS.has(ext)
}
