import { useEffect, useState } from 'react'

/**
 * iOS Safari keeps `position: fixed` pinned to the *layout* viewport, not the
 * visual one. When the keyboard opens it doesn't shrink the layout viewport —
 * instead it pans the visual viewport down to keep the focused input visible
 * (`visualViewport.offsetTop` grows), which is a real scroll `overflow:
 * hidden` on body cannot prevent. A fixed panel still anchored at `top: 0` of
 * the layout viewport then sits above the now-panned visible area — it
 * looks like the whole thing scrolled off-screen.
 *
 * Binding both the panel's `top` to `visualViewport.offsetTop` and its
 * `height` to `visualViewport.height` keeps it pinned exactly to the
 * currently-visible rectangle, however iOS decides to pan things around.
 */
export function useVisualViewport() {
  const [state, setState] = useState<{ height: number; top: number; keyboardOpen: boolean }>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    top: 0,
    keyboardOpen: false,
  }))

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const fullHeight = window.innerHeight
    function update() {
      setState({ height: vv!.height, top: vv!.offsetTop, keyboardOpen: vv!.height < fullHeight - 120 })
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return state
}
