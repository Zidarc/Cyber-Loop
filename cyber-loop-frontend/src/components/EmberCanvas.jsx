import { useRef, useEffect } from 'react'

const EP = [[255,90,0],[235,55,0],[210,35,0],[255,130,20],[185,30,0],[140,10,0]]

/**
 * Shared ember-particle canvas used across all pages.
 *
 * Props (all optional — defaults match the original Landing values):
 *   count        {number}  Number of ember particles          default 30
 *   vxSpread     {number}  Multiplier for horizontal drift    default 0.28
 *   vyMin        {number}  Minimum upward speed               default 0.16
 *   vyRange      {number}  Random addition to upward speed    default 0.28
 *   sizeMin      {number}  Minimum ember size                 default 0.6
 *   sizeRange    {number}  Random addition to size            default 1.8
 *   travelMin    {number}  Min travel as fraction of height   default 0.32
 *   travelRange  {number}  Random addition to travel fraction default 0.18
 *   alphaScale   {number}  Peak opacity multiplier (0–1)      default 0.5
 *   zIndex       {number}  CSS z-index of the canvas          default 0
 */
export default function EmberCanvas({
  count       = 30,
  vxSpread    = 0.28,
  vyMin       = 0.16,
  vyRange     = 0.28,
  sizeMin     = 0.6,
  sizeRange   = 1.8,
  travelMin   = 0.32,
  travelRange = 0.18,
  alphaScale  = 0.5,
  zIndex      = 0,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')

    const rsz = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    rsz()
    window.addEventListener('resize', rsz)

    const se = () => {
      const rgb = EP[Math.floor(Math.random() * EP.length)]
      return {
        x:      Math.random() * c.width,
        y:      c.height + 10,
        vx:     (Math.random() - 0.5) * vxSpread,
        vy:     -(vyMin + Math.random() * vyRange),
        size:   sizeMin + Math.random() * sizeRange,
        travel: c.height * (travelMin + Math.random() * travelRange),
        dist:   0,
        rgb,
        wobble: Math.random() * Math.PI * 2,
        wSpd:   0.006 + Math.random() * 0.01,
      }
    }

    const em = Array.from({ length: count }, () => {
      const e = se()
      e.y = Math.random() * c.height  // pre-scatter vertically on first frame
      return e
    })

    let raf
    let paused = false

    // ── FIX #4: store handler reference so it can be removed on cleanup ──
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    function draw() {
      raf = requestAnimationFrame(draw)
      if (paused) return
      ctx.clearRect(0, 0, c.width, c.height)

      for (const e of em) {
        if (e.dist >= e.travel) { Object.assign(e, se()); continue }

        e.wobble += e.wSpd
        e.x      += e.vx + Math.sin(e.wobble) * 0.07
        e.y      += e.vy
        e.dist   -= e.vy

        const p  = e.dist / e.travel
        const al = p < 0.12 ? p / 0.12
                 : p > 0.55 ? Math.pow(1 - (p - 0.55) / 0.45, 1.8)
                 : 1
        if (al < 0.02) continue

        const [r, g] = e.rgb
        const sz = e.size * (1 - p * 0.25)

        ctx.save()
        ctx.globalAlpha = al * alphaScale
        ctx.translate(e.x, e.y)
        ctx.rotate(e.wobble * 0.4)

        // Ember silhouette
        ctx.beginPath()
        ctx.moveTo(0,      -sz * 1.1)
        ctx.lineTo( sz * 0.7, -sz * 0.5)
        ctx.lineTo( sz * 0.9,  sz * 0.2)
        ctx.lineTo( sz * 0.4,  sz * 0.9)
        ctx.lineTo(-sz * 0.3,  sz * 0.9)
        ctx.lineTo(-sz * 0.9,  sz * 0.2)
        ctx.lineTo(-sz * 0.7, -sz * 0.5)
        ctx.closePath()
        ctx.fillStyle = `rgba(${r * 0.25 | 0},0,0,1)`
        ctx.fill()

        // Inner glow
        ctx.save()
        ctx.clip()
        const ig = ctx.createRadialGradient(0, -sz * 0.1, 0, 0, -sz * 0.1, sz * 0.8)
        ig.addColorStop(0,    'rgba(255,200,120,1)')
        ig.addColorStop(0.3,  `rgba(${r},${Math.max(g, 8)},0,1)`)
        ig.addColorStop(0.75, `rgba(${r * 0.45 | 0},0,0,1)`)
        ig.addColorStop(1,    'rgba(0,0,0,0)')
        ctx.fillStyle = ig
        ctx.fill()
        ctx.restore()

        ctx.restore()
      }
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', rsz)
      document.removeEventListener('visibilitychange', onVis)  // ← leak fixed
    }
  }, []) // values are read at mount; safe to omit deps for a canvas animation loop

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
    />
  )
}