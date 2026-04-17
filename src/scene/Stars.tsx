import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  Group,
  MathUtils,
  type ColorRepresentation,
} from 'three'
import { scrollState } from './scrollState'

type StarLayerConfig = {
  colorA: ColorRepresentation
  colorB: ColorRepresentation
  count: number
  radius: number
  size: number
  spread: number
}

function buildStars({
  colorA,
  colorB,
  count,
  radius,
  spread,
}: Omit<StarLayerConfig, 'size'>) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const start = new Color(colorA)
  const end = new Color(colorB)
  const color = new Color()

  for (let index = 0; index < count; index += 1) {
    const distance = radius + (Math.random() - 0.5) * spread
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const sinPhi = Math.sin(phi)
    const brightness = 0.45 + Math.random() * 0.55

    positions[index * 3] = distance * sinPhi * Math.cos(theta)
    positions[index * 3 + 1] = distance * Math.cos(phi)
    positions[index * 3 + 2] = distance * sinPhi * Math.sin(theta)

    color.lerpColors(start, end, Math.random()).multiplyScalar(brightness)
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }

  return { colors, positions }
}

function StarLayer({
  colorA,
  colorB,
  count,
  radius,
  size,
  spread,
}: StarLayerConfig) {
  const { colors, positions } = useMemo(
    () => buildStars({ colorA, colorB, count, radius, spread }),
    [colorA, colorB, count, radius, spread],
  )

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
        />
      </bufferGeometry>
      <pointsMaterial
        blending={AdditiveBlending}
        depthWrite={false}
        opacity={0.9}
        size={size}
        sizeAttenuation
        toneMapped={false}
        transparent
        vertexColors
      />
    </points>
  )
}

export function Stars() {
  const groupRef = useRef<Group>(null)
  const { size } = useThree()

  const layers = useMemo<StarLayerConfig[]>(() => {
    if (size.width < 768) {
      return [
        {
          colorA: '#9bb8ff',
          colorB: '#ffffff',
          count: 320,
          radius: 28,
          size: 0.05,
          spread: 10,
        },
        {
          colorA: '#8cb2ff',
          colorB: '#f6d1a3',
          count: 180,
          radius: 42,
          size: 0.08,
          spread: 16,
        },
        {
          colorA: '#7ca1ff',
          colorB: '#ffd7b2',
          count: 120,
          radius: 60,
          size: 0.12,
          spread: 24,
        },
      ]
    }

    return [
      {
        colorA: '#9bb8ff',
        colorB: '#ffffff',
        count: 640,
        radius: 30,
        size: 0.045,
        spread: 12,
      },
      {
        colorA: '#8cb2ff',
        colorB: '#f6d1a3',
        count: 320,
        radius: 46,
        size: 0.075,
        spread: 18,
      },
      {
        colorA: '#7ca1ff',
        colorB: '#ffd7b2',
        count: 180,
        radius: 66,
        size: 0.11,
        spread: 26,
      },
    ]
  }, [size.width])

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return
    }

    groupRef.current.rotation.y +=
      delta * (0.005 + Math.abs(scrollState.velocity) * 0.004)
    groupRef.current.rotation.x = MathUtils.damp(
      groupRef.current.rotation.x,
      scrollState.velocity * 0.06,
      2.5,
      delta,
    )
  })

  return (
    <group ref={groupRef}>
      {layers.map((layer, index) => (
        <group
          key={`${layer.radius}-${layer.count}`}
          rotation={[index * 0.22, index * 0.34, index * 0.12]}
        >
          <StarLayer {...layer} />
        </group>
      ))}
    </group>
  )
}
