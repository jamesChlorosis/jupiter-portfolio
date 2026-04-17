import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './App.css'
import { SceneCanvas } from './scene/SceneCanvas'
import { scrollState } from './scene/scrollState'

gsap.registerPlugin(ScrollTrigger)

function App() {
  const scrollTrackRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const scrollTrack = scrollTrackRef.current
    if (!scrollTrack) {
      return
    }

    scrollState.progress = 0
    scrollState.targetProgress = 0
    scrollState.velocity = 0

    const context = gsap.context(() => {
      ScrollTrigger.create({
        trigger: scrollTrack,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          scrollState.targetProgress = self.progress
          scrollState.velocity = gsap.utils.clamp(
            -1.4,
            1.4,
            self.getVelocity() / 1800,
          )
        },
      })
    })

    ScrollTrigger.refresh()

    return () => {
      scrollState.targetProgress = 0
      scrollState.velocity = 0
      context.revert()
    }
  }, [])

  return (
    <main className="app-shell">
      <div className="scene-shell">
        <SceneCanvas />
      </div>
      <div ref={scrollTrackRef} className="scroll-track" aria-hidden="true" />
    </main>
  )
}

export default App
