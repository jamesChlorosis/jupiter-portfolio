import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { setFocusedProject, setHoveredProject } from './interactionState'
import { SceneContents } from './SceneContents'

export function SceneCanvas() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0.25, 7.4], fov: 34, near: 0.1, far: 180 }}
      onPointerMissed={() => {
        setFocusedProject(null)
        setHoveredProject(null)
        document.body.style.cursor = ''
      }}
      performance={{ min: 0.6 }}
    >
      <color attach="background" args={['#02030b']} />
      <fog attach="fog" args={['#02030b', 18, 92]} />
      <Suspense fallback={null}>
        <SceneContents />
      </Suspense>
    </Canvas>
  )
}
