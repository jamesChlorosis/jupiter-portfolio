import { useFrame } from '@react-three/fiber'
import { Selection } from '@react-three/postprocessing'
import { lazy, Suspense, useState } from 'react'
import { useMemo, useRef, type RefObject } from 'react'
import type { Object3D } from 'three'
import { CameraRig } from './CameraRig'
import { Jupiter } from './Jupiter'
import { ProjectsOrbit } from './ProjectsOrbit'
import { scrollState } from './scrollState'
import { Stars } from './Stars'

const LazySceneEffects = lazy(() => import('./SceneEffects'))

function EffectsGate({ lights }: { lights: RefObject<Object3D>[] }) {
  const [effectsEnabled, setEffectsEnabled] = useState(false)

  useFrame(() => {
    if (!effectsEnabled && scrollState.targetProgress > 0.15) {
      setEffectsEnabled(true)
    }
  })

  if (!effectsEnabled) {
    return null
  }

  return (
    <Suspense fallback={null}>
      <LazySceneEffects lights={lights} />
    </Suspense>
  )
}

export function SceneContents() {
  const ambientLightRef = useRef<Object3D>(null!)
  const keyLightRef = useRef<Object3D>(null!)
  const fillLightRef = useRef<Object3D>(null!)
  const bloomLights = useMemo(
    () => [ambientLightRef, keyLightRef, fillLightRef],
    [],
  )

  return (
    <Selection enabled>
      <ambientLight ref={ambientLightRef} intensity={0.45} />
      <directionalLight
        ref={keyLightRef}
        color="#f9c090"
        intensity={1.65}
        position={[8, 4, 7]}
      />
      <pointLight
        ref={fillLightRef}
        color="#6b89ff"
        intensity={14}
        position={[-8, 1.5, -10]}
        distance={28}
      />
      <Stars />
      <Jupiter />
      <ProjectsOrbit />
      <EffectsGate lights={bloomLights} />
      <CameraRig />
    </Selection>
  )
}
