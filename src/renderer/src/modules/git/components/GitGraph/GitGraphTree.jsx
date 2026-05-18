import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import styles from './GitGraphTree.module.css'

const ROW_H = 26
const LANE_W = 14
const DOT_R = 4
const OVERSCAN = 8

const PALETTE = [
  '#2196F3', '#43A047', '#E53935', '#FB8C00', '#8E24AA',
  '#00ACC1', '#FFB300', '#3949AB', '#D81B60', '#7CB342',
  '#5E35B1', '#039BE5', '#F4511E', '#6D4C41', '#00897B'
]

function colorOf(idx) {
  return PALETTE[idx % PALETTE.length]
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { year: '2-digit', month: 'short', day: '2-digit' })
  } catch {
    return iso
  }
}

function RefBadge({ refDec }) {
  if (refDec.kind === 'head') {
    return <span className={`${styles.badge} ${styles.badgeHead}`}>HEAD{refDec.target ? ` → ${refDec.target}` : ''}</span>
  }
  if (refDec.kind === 'local') {
    return <span className={`${styles.badge} ${styles.badgeLocal}`}>{refDec.name}</span>
  }
  if (refDec.kind === 'remote') {
    return <span className={`${styles.badge} ${styles.badgeRemote}`}>{refDec.remote}/{refDec.name}</span>
  }
  if (refDec.kind === 'tag') {
    return <span className={`${styles.badge} ${styles.badgeTag}`}>{refDec.name}</span>
  }
  if (refDec.kind === 'stash') {
    return <span className={`${styles.badge} ${styles.badgeStash}`}>stash</span>
  }
  return null
}

export const GitGraphTree = () => {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(0)
  const [graphW, setGraphW] = useState(LANE_W * 6)
  const [selected, setSelected] = useState(null)

  const scrollerRef = useRef(null)
  const canvasRef = useRef(null)

  const load = useCallback(async () => {
    if (!window.git?.graphLog) {
      setError('graphLog IPC not available — restart the app')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await window.git.graphLog({ limit: 5000 })
      if (!result.success) {
        setError(result.message || 'Failed to load graph')
        setRows([])
      } else {
        const r = result.data?.rows || []
        setRows(r)
        const maxW = r.reduce((m, x) => Math.max(m, x.width, x.column + 1), 1)
        setGraphW(Math.max(maxW * LANE_W + LANE_W, LANE_W * 6))
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const handle = () => setScrollTop(el.scrollTop)
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight))
    el.addEventListener('scroll', handle, { passive: true })
    ro.observe(el)
    setViewportH(el.clientHeight)
    return () => {
      el.removeEventListener('scroll', handle)
      ro.disconnect()
    }
  }, [])

  const total = rows.length
  const firstVisible = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const lastVisible = Math.min(
    total - 1,
    Math.ceil((scrollTop + viewportH) / ROW_H) + OVERSCAN
  )

  // Draw canvas — full height canvas would balloon at 50k rows; instead, draw a viewport-sized canvas
  // pinned to scrollerRef's scroll position. We update on scroll.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const w = graphW
    const h = Math.max(viewportH, ROW_H)
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (rows.length === 0) return

    const drawFirst = Math.max(0, Math.floor(scrollTop / ROW_H) - 1)
    const drawLast = Math.min(rows.length - 1, Math.ceil((scrollTop + viewportH) / ROW_H) + 1)

    // Draw edges first so dots sit on top
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    for (let r = drawFirst; r <= drawLast; r++) {
      const row = rows[r]
      const yTop = r * ROW_H - scrollTop
      const yMid = yTop + ROW_H / 2
      const yBot = yTop + ROW_H
      for (const e of row.edges) {
        const x1 = e.from * LANE_W + LANE_W / 2
        const x2 = e.to * LANE_W + LANE_W / 2
        ctx.strokeStyle = colorOf(e.color)
        ctx.beginPath()
        if (e.kind === 0) {
          // straight: full vertical through this row
          ctx.moveTo(x1, yTop)
          ctx.lineTo(x1, yBot)
        } else if (e.kind === 1) {
          // fork: commit dot → new lane below
          ctx.moveTo(x1, yMid)
          ctx.bezierCurveTo(x1, yMid + ROW_H * 0.35, x2, yMid + ROW_H * 0.15, x2, yBot)
        } else if (e.kind === 2) {
          // merge: lane above → commit dot
          ctx.moveTo(x1, yTop)
          ctx.bezierCurveTo(x1, yMid - ROW_H * 0.15, x2, yMid - ROW_H * 0.35, x2, yMid)
        } else {
          // shift: lane shifted columns across this row
          ctx.moveTo(x1, yTop)
          ctx.bezierCurveTo(x1, yMid, x2, yMid, x2, yBot)
        }
        ctx.stroke()
      }
    }

    // Dots
    for (let r = drawFirst; r <= drawLast; r++) {
      const row = rows[r]
      const x = row.column * LANE_W + LANE_W / 2
      const y = r * ROW_H - scrollTop + ROW_H / 2
      const col = colorOf(row.color)
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.arc(x, y, DOT_R, 0, Math.PI * 2)
      ctx.fill()
      if (row.isMerge) {
        ctx.fillStyle = 'rgba(20, 20, 28, 1)'
        ctx.beginPath()
        ctx.arc(x, y, DOT_R - 1.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, [rows, scrollTop, viewportH, graphW])

  const visible = useMemo(() => {
    const out = []
    for (let i = firstVisible; i <= lastVisible; i++) {
      const r = rows[i]
      if (!r) continue
      out.push({ row: r, idx: i })
    }
    return out
  }, [rows, firstVisible, lastVisible])

  return (
    <div className={styles.tree}>
      <div className={styles.toolbar}>
        <span className={styles.toolbarTitle}>Graph</span>
        <span className={styles.toolbarCount}>{total} commits</span>
        <div className={styles.toolbarSpacer} />
        <button
          type="button"
          className={styles.toolbarBtn}
          onClick={load}
          disabled={loading}
          title="Reload graph"
        >
          <RefreshCw size={12} />
          <span>{loading ? 'Loading…' : 'Refresh'}</span>
        </button>
      </div>

      {error ? (
        <div className={styles.error}>{error}</div>
      ) : loading && rows.length === 0 ? (
        <div className={styles.loading}>Loading commits…</div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>No commits</div>
      ) : (
        <div className={styles.viewport}>
          <div ref={scrollerRef} className={styles.scroller}>
            <div
              className={styles.rowsLayer}
              style={{ height: total * ROW_H, position: 'relative' }}
            >
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                style={{
                  transform: `translateY(${scrollTop}px)`,
                  width: graphW,
                  height: viewportH
                }}
              />
              {visible.map(({ row, idx }) => (
                <div
                  key={row.hash}
                  className={`${styles.row} ${selected === row.hash ? styles.rowActive : ''}`}
                  style={{ top: idx * ROW_H, height: ROW_H }}
                  onClick={() => setSelected(row.hash)}
                  title={row.subject}
                >
                  <div className={styles.rowGraphArea} style={{ width: graphW }} />
                  <div className={styles.rowSubject}>
                    {row.refs.map((r, i) => (
                      <RefBadge key={i} refDec={r} />
                    ))}
                    <span className={styles.rowSubjectText}>{row.subject}</span>
                  </div>
                  <div className={styles.rowMeta}>
                    <span className={styles.rowAuthor}>{row.author}</span>
                    <span className={styles.rowHash}>{row.shortHash}</span>
                    <span className={styles.rowDate}>{formatDate(row.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GitGraphTree
