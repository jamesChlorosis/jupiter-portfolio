import { useFrame } from '@react-three/fiber'
import { EffectComposer, SelectiveBloom, Vignette } from '@react-three/postprocessing'
import { useRef, type RefObject } from 'react'
import type { SelectiveBloomEffect } from 'postprocessing'
import { MathUtils, type Object3D } from 'three'
import { interactionState } from './interactionState'
import { scrollState } from './scrollState'

type SceneEffectsProps = {
  lights: RefObject<Object3D>[]
}

export default function SceneEffects({ lights }: SceneEffectsProps) {
  const bloomRef = useRef<SelectiveBloomEffect>(null)

  useFrame((_, delta) => {
    if (!bloomRef.current) {
      return
    }

    const focused = interactionState.focusedProjectId !== null
    const progress = scrollState.progress
    const targetIntensity =
      0.24 +
      MathUtils.smoothstep(progress, 0.16, 0.42) * 0.12 +
      (focused ? 0.18 : 0)

    bloomRef.current.intensity = MathUtils.damp(
      bloomRef.current.intensity,
      targetIntensity,
      4.6,
      delta,
    )
  })

  return (
    <EffectComposer enableNormalPass={false} multisampling={0}>
      <SelectiveBloom
        ref={bloomRef}
        intensity={0.34}
        ignoreBackground
        luminanceSmoothing={0.9}
        luminanceThreshold={0.62}
        lights={lights}
        mipmapBlur
        selectionLayer={10}
      />
      <Vignette darkness={0.84} eskil={false} offset={0.18} />
    </EffectComposer>
  )
}
