import { useEffect } from 'react'

// Robust clipboard write with a textarea fallback for restricted contexts.
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      console.error('Failed to copy:', err)
      return false
    }
  }
}

// Click-outside helper that respects an optional secondary "submenu" ref.
// Calls onClose when click lands outside both refs and the menu is visible.
export const useClickOutsideMenu = ({ show, primaryRef, submenuRef, onClose }) => {
  useEffect(() => {
    if (!show) return
    const handle = (e) => {
      const inPrimary = primaryRef.current?.contains(e.target)
      const inSubmenu = submenuRef?.current?.contains(e.target)
      if (!inPrimary && !inSubmenu) onClose?.()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [show, onClose, primaryRef, submenuRef])
}
