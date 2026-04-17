import { useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BackSide,
  Group,
  MathUtils,
  ShaderMaterial,
} from 'three'
import { scrollState } from './scrollState'
import {
  atmosphereFragmentShader,
  atmosphereVertexShader,
  planetFragmentShader,
  planetVertexShader,
} from './shaders'

export function Jupiter() {
  const systemRef = useRef<Group>(null)
  const planetMaterialRef = useRef<ShaderMaterial>(null)
  const atmosphereMaterialRef = useRef<ShaderMaterial>(null)
  const planetUniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )
  const atmosphereUniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime()
    if (planetMaterialRef.current) {
      planetMaterialRef.current.uniforms.uProgress.value = scrollState.progress
      planetMaterialRef.current.uniforms.uTime.value = elapsed
    }
    if (atmosphereMaterialRef.current) {
      atmosphereMaterialRef.current.uniforms.uProgress.value = scrollState.progress
      atmosphereMaterialRef.current.uniforms.uTime.value = elapsed
    }

    if (!systemRef.current) {
      return
    }

    systemRef.current.rotation.y +=
      delta * (0.08 + Math.abs(scrollState.velocity) * 0.014)
    systemRef.current.rotation.z = MathUtils.damp(
      systemRef.current.rotation.z,
      scrollState.velocity * 0.025,
      3,
      delta,
    )
  })

  return (
    <group ref={systemRef} rotation={[0.08, 0, 0]}>
      <mesh>
        <sphereGeometry args={[2.55, 160, 160]} />
        <shaderMaterial
          ref={planetMaterialRef}
          fragmentShader={planetFragmentShader}
          uniforms={planetUniforms}
          vertexShader={planetVertexShader}
        />
      </mesh>
      <Select enabled>
        <mesh renderOrder={2} scale={1.075}>
          <sphereGeometry args={[2.55, 128, 128]} />
          <shaderMaterial
            ref={atmosphereMaterialRef}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={atmosphereFragmentShader}
            side={BackSide}
            toneMapped={false}
            transparent
            uniforms={atmosphereUniforms}
            vertexShader={atmosphereVertexShader}
          />
        </mesh>
      </Select>
    </group>
  )
}
