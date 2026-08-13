import { useEffect, useState } from 'react'

/**
 * iOS Safari keeps `position: fixed` pinned to the *layout* viewport, not the
 * visual one. When the keyboard opens it doesn't shrink the layout viewport —
 * instead it pans the page to keep the focused input visible, which drags a
 * `fixed inset-0` panel along with it and can push its content fully
 * off-screen (a blank/black screen with only the keyboard visible).
 *
 * Binding a panel's height to `window.visualViewport.height` keeps it sized
 * to exactly the area still visible above the keyboard, so its header and
 * input bar stay put and only the scrollable middle shrinks.
 */
export function useVisualViewport() {
  const [state, setState] = useState<{ height: number; keyboardOpen: boolean }>(() => ({
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    keyboardOpen: false,
  }))

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const fullHeight = window.innerHeight
    function update() {
      const h = vv!.height
      setState({ height: h, keyboardOpen: h < fullHeight - 120 })
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
