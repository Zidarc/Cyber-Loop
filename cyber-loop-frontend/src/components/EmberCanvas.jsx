import { useRef, useEffect } from 'react'

const EP = [[255,90,0],[235,55,0],[210,35,0],[255,130,20],[185,30,0],[140,10,0]]

/**
 * Shared ember-particle canvas.
 *
 * NEW: intensityMultiplier {number}  0 = calm baseline, 3 = inferno. Changes
 *      are applied on the fly — no remount needed. Maingamepage drives this
 *      from the countdown timer so embers rage as time expires.
 *
 * All other props are the same as before (and serve as the *baseline* values).
 */
export default function EmberCanvas({
  count              = 30,
  vxSpread           = 0.28,
  vyMin              = 0.16,
  vyRange            = 0.28,
  sizeMin            = 0.6,
  sizeRange          = 1.8,
  travelMin          = 0.32,
  travelRange        = 0.18,
  alphaScale         = 0.5,
  zIndex             = 0,
  intensityMultiplier = 0,   // 0 = no boost
}) {
  const ref          = useRef(null)
  const intensityRef = useRef(intensityMultiplier)

  // Keep the ref in sync so the draw loop can read it without restart
  useEffect(() => {
    intensityRef.current = intensityMultiplier
  }, [intensityMultiplier])

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')

    const rsz = () => { c.width = window.innerWidth; c.height = window.innerHeight }
    rsz()
    window.addEventListener('resize', rsz)

    const makeEmber = () => {
      const im  = intensityRef.current
      const rgb = EP[Math.floor(Math.random() * EP.length)]
      return {
        x:      Math.random() * c.width,
        y:      c.height + 10,
        vx:     (Math.random() - 0.5) * vxSpread,
        vy:     -(vyMin + Math.random() * vyRange) * (1 + im * 0.6),
        size:   (sizeMin + Math.random() * sizeRange) * (1 + im * 0.35),
        travel: c.height * (travelMin + Math.random() * travelRange) * (1 + im * 0.25),
        dist:   0,
        rgb,
        wobble: Math.random() * Math.PI * 2,
        wSpd:   0.006 + Math.random() * 0.01,
      }
    }

    // Pre-allocate 4× count so we have particles ready when intensity spikes
    const pool = Array.from({ length: count * 4 }, () => {
      const e = makeEmber()
      e.y     = Math.random() * c.height   // pre-scatter on first frame
      e.dist  = Math.random() * e.travel   // mid-flight
      return e
    })

    let raf, paused = false
    const onVis = () => { paused = document.hidden }
    document.addEventListener('visibilitychange', onVis)

    function draw() {
      raf = requestAnimationFrame(draw)
      if (paused) return

      const im          = intensityRef.current
      // How many embers are "alive" depends on intensity (1× → 4×)
      const activeCount = Math.min(Math.round(count * (1 + im * 1.5)), pool.length)

      ctx.clearRect(0, 0, c.width, c.height)

      for (let idx = 0; idx < activeCount; idx++) {
        const e = pool[idx]

        if (e.dist >= e.travel) {
          // Recycle — re-spawn with current intensity baked in
          Object.assign(e, makeEmber())
          continue
        }

        const speedBoost = 1 + im * 0.55
        e.wobble += e.wSpd * speedBoost
        e.x      += e.vx + Math.sin(e.wobble) * 0.07
        e.y      += e.vy * speedBoost
        e.dist   -= e.vy * speedBoost

        const p  = e.dist / e.travel
        const al = p < 0.12 ? p / 0.12
                 : p > 0.55 ? Math.pow(1 - (p - 0.55) / 0.45, 1.8)
                 : 1
        if (al < 0.02) continue

        const [r, g] = e.rgb
        const sz     = e.size * (1 - p * 0.25) * (1 + im * 0.3)

        ctx.save()
        ctx.globalAlpha = Math.min(al * (alphaScale + im * 0.25), 0.95)
        ctx.translate(e.x, e.y)
        ctx.rotate(e.wobble * 0.4)

        // Ember silhouette
        ctx.beginPath()
        ctx.moveTo(0,         -sz * 1.1)
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
      document.removeEventListener('visibilitychange', onVis)
    }
  }, []) // statics read at mount; intensity via ref

  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, zIndex, pointerEvents: 'none' }}
    />
  )
}