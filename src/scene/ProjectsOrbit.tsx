import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import {
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import {
  interactionState,
  setFocusedProject,
  setHoveredProject,
} from './interactionState'
import { projects, type ProjectSatellite } from './projectData'
import { scrollState } from './scrollState'
import { getZoneById } from './storyboard'

type SatelliteNodes = {
  coreMaterial: MeshStandardMaterial | null
  glowMaterial: MeshBasicMaterial | null
  group: Group | null
  haloMaterial: MeshBasicMaterial | null
  hitMesh: Mesh | null
  trackMaterial: MeshBasicMaterial | null
}

type SatelliteNodeKey = keyof SatelliteNodes
type RegisterNode = (
  index: number,
  key: SatelliteNodeKey,
) => (value: SatelliteNodes[SatelliteNodeKey]) => void

const orbitAxis = new Vector3(1, 0, 0)
const projectZone = getZoneById('projects')
const staggerWindow = 0.032
const assignmentEpsilon = 0.0005

function getOrbitPosition(
  target: Vector3,
  angle: number,
  radius: number,
  height: number,
  inclination: number,
) {
  target.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)
  target.applyAxisAngle(orbitAxis, inclination)
  target.y += height
  return target
}

function getProjectsReveal(progress: number, delay = 0) {
  if (!projectZone) {
    return 0
  }

  const intro = MathUtils.smoothstep(
    progress,
    projectZone.start + delay,
    projectZone.start + 0.12 + delay,
  )
  const outro =
    1 -
    MathUtils.smoothstep(
      progress,
      projectZone.end - 0.08,
      projectZone.end + 0.08,
    )

  return MathUtils.clamp(intro * outro, 0, 1)
}

function dampNumber(
  current: number,
  target: number,
  smoothing: number,
  delta: number,
  epsilon = assignmentEpsilon,
) {
  if (Math.abs(current - target) <= epsilon) {
    return target
  }

  const next = MathUtils.damp(current, target, smoothing, delta)
  return Math.abs(next - target) <= epsilon ? target : next
}

function createEmptyNodes(): SatelliteNodes {
  return {
    coreMaterial: null,
    glowMaterial: null,
    group: null,
    haloMaterial: null,
    hitMesh: null,
    trackMaterial: null,
  }
}

function ProjectTrackNode({
  index,
  project,
  registerNode,
}: {
  index: number
  project: ProjectSatellite
  registerNode: RegisterNode
}) {
  return (
    <mesh rotation={[Math.PI / 2, project.angle * 0.08, 0]} scale={[project.radius, project.radius, 1]}>
      <torusGeometry args={[1, 0.006, 10, 96]} />
      <meshBasicMaterial
        ref={registerNode(index, 'trackMaterial')}
        color={project.color}
        depthWrite={false}
        opacity={0}
        toneMapped={false}
        transparent
      />
    </mesh>
  )
}

function SatelliteNode({
  index,
  project,
  registerNode,
}: {
  index: number
  project: ProjectSatellite
  registerNode: RegisterNode
}) {
  const handlePointerOver = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHoveredProject(project.id)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (interactionState.hoveredProjectId === project.id) {
      setHoveredProject(null)
      document.body.style.cursor = ''
    }
  }

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const isFocused = interactionState.focusedProjectId === project.id
    setFocusedProject(isFocused ? null : project.id)
  }

  return (
    <group ref={registerNode(index, 'group')}>
      <mesh
        ref={registerNode(index, 'hitMesh')}
        onClick={handleClick}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
        scale={project.size * 1.85}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial opacity={0} transparent />
      </mesh>
      <Select enabled>
        <mesh scale={project.size * 0.68}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial
            ref={registerNode(index, 'glowMaterial')}
            color={project.color}
            depthWrite={false}
            opacity={0}
            toneMapped={false}
            transparent
          />
        </mesh>
      </Select>
      <mesh scale={project.size}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={registerNode(index, 'coreMaterial')}
          color={project.color}
          emissive={project.color}
          metalness={0.55}
          opacity={0}
          roughness={0.35}
          transparent
        />
      </mesh>
      <mesh scale={project.size * 1.85}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          ref={registerNode(index, 'haloMaterial')}
          color={project.color}
          depthWrite={false}
          opacity={0}
          toneMapped={false}
          transparent
        />
      </mesh>
    </group>
  )
}

export function ProjectsOrbit() {
  const layerRef = useRef<Group>(null)
  const satelliteNodes = useRef<SatelliteNodes[]>(
    projects.map(() => createEmptyNodes()),
  )
  const orbitTargets = useRef(projects.map(() => new Vector3()))
  const worldAnchors = useRef(projects.map(() => new Vector3()))
  const revealDelays = useMemo(
    () => projects.map((_, index) => index * staggerWindow),
    [],
  )
  const registerNode = useMemo(() => {
    return function registerNode(index: number, key: SatelliteNodeKey) {
      return (value: SatelliteNodes[SatelliteNodeKey]) => {
        const node = satelliteNodes.current[index]

        switch (key) {
          case 'group':
            node.group = value as Group | null
            break
          case 'hitMesh':
            node.hitMesh = value as Mesh | null
            break
          case 'coreMaterial':
            node.coreMaterial = value as MeshStandardMaterial | null
            break
          case 'glowMaterial':
            node.glowMaterial = value as MeshBasicMaterial | null
            break
          case 'haloMaterial':
            node.haloMaterial = value as MeshBasicMaterial | null
            break
          case 'trackMaterial':
            node.trackMaterial = value as MeshBasicMaterial | null
            break
          default:
            break
        }
      }
    }
  }, [])

  useFrame((state, delta) => {
    const layer = layerRef.current
    if (!layer) {
      return
    }

    const progress = scrollState.progress
    const velocity = scrollState.velocity
    const reveal = getProjectsReveal(progress)
    const layerVisible = reveal > 0.01

    if (layer.visible !== layerVisible) {
      layer.visible = layerVisible
    }

    if (!layerVisible) {
      if (interactionState.focusedProjectId) {
        setFocusedProject(null)
      }
      if (interactionState.hoveredProjectId) {
        setHoveredProject(null)
        document.body.style.cursor = ''
      }
      return
    }

    const focusedProjectId = interactionState.focusedProjectId
    const hoveredProjectId = interactionState.hoveredProjectId
    const hasFocusedProject = focusedProjectId !== null
    const focusSlowdown = hasFocusedProject ? 0.24 : 1
    const layerRotationY =
      layer.rotation.y + delta * (0.018 + reveal * 0.01) * focusSlowdown
    if (Math.abs(layerRotationY - layer.rotation.y) > assignmentEpsilon) {
      layer.rotation.y = layerRotationY
    }

    const nextLayerRotationX = dampNumber(
      layer.rotation.x,
      0.06 + velocity * 0.025,
      4,
      delta,
    )
    if (nextLayerRotationX !== layer.rotation.x) {
      layer.rotation.x = nextLayerRotationX
    }

    const nextLayerScale = dampNumber(layer.scale.x, 0.9 + reveal * 0.1, 5, delta)
    if (nextLayerScale !== layer.scale.x) {
      layer.scale.setScalar(nextLayerScale)
    }

    if (
      hoveredProjectId &&
      hasFocusedProject &&
      hoveredProjectId !== focusedProjectId
    ) {
      setHoveredProject(null)
      document.body.style.cursor = ''
    }

    const elapsed = state.clock.getElapsedTime()
    const orbitPhase = progress * 0.16 + velocity * 0.08
    const driftTime = elapsed * 0.58
    const noiseTime = elapsed * 0.34
    const depthTime = elapsed * 0.28
    const orbitNodes = satelliteNodes.current
    const anchorMap = interactionState.projectAnchors

    for (let index = 0; index < projects.length; index += 1) {
      const project = projects[index]
      const node = orbitNodes[index]
      const group = node.group
      const trackMaterial = node.trackMaterial
      const coreMaterial = node.coreMaterial
      const haloMaterial = node.haloMaterial
      const glowMaterial = node.glowMaterial

      if (
        !group ||
        !trackMaterial ||
        !coreMaterial ||
        !haloMaterial ||
        !glowMaterial
      ) {
        continue
      }

      const satelliteReveal = getProjectsReveal(progress, revealDelays[index])
      const visible = satelliteReveal > 0.01
      if (group.visible !== visible) {
        group.visible = visible
      }

      const focused = focusedProjectId === project.id
      const hovered = hoveredProjectId === project.id
      const dimmed = hasFocusedProject && !focused
      const interactive = satelliteReveal > 0.04 && (!hasFocusedProject || focused)

      if (node.hitMesh && node.hitMesh.visible !== interactive) {
        node.hitMesh.visible = interactive
      }

      const trackOpacityTarget =
        satelliteReveal * 0.22 * (dimmed ? 0.2 : 1)
      const nextTrackOpacity = dampNumber(
        trackMaterial.opacity,
        trackOpacityTarget,
        4.8,
        delta,
      )
      if (nextTrackOpacity !== trackMaterial.opacity) {
        trackMaterial.opacity = nextTrackOpacity
      }

      if (!visible) {
        continue
      }

      if (!dimmed) {
        const orbitSpeedMultiplier = focused ? 0.16 : 1
        const orbitAngle =
          project.angle +
          elapsed * project.orbitSpeed * orbitSpeedMultiplier +
          orbitPhase

        const targetPosition = orbitTargets.current[index]
        getOrbitPosition(
          targetPosition,
          orbitAngle,
          project.radius,
          project.height,
          project.inclination,
        )
        targetPosition.x +=
          Math.sin(noiseTime + project.radius * 1.7) * 0.025
        targetPosition.y +=
          Math.sin(driftTime + project.angle * 6.4) * 0.055
        targetPosition.z +=
          Math.cos(depthTime + project.inclination * 12) * 0.025

        if (group.position.distanceToSquared(targetPosition) > 0.000001) {
          group.position.lerp(targetPosition, 1 - Math.exp(-delta * 3.6))
        }

        group.rotation.y += delta * (focused ? 0.16 : 0.28)
      }

      const nextRotationZ = dampNumber(
        group.rotation.z,
        hovered ? 0.24 : focused ? 0.18 : 0,
        4.5,
        delta,
      )
      if (nextRotationZ !== group.rotation.z) {
        group.rotation.z = nextRotationZ
      }

      const targetScale =
        0.54 +
        satelliteReveal * 0.98 +
        (hovered ? 0.18 : 0) +
        (focused ? 0.42 : 0) -
        (dimmed ? 0.18 : 0)
      const nextScale = dampNumber(group.scale.x, targetScale, 5.4, delta)
      if (nextScale !== group.scale.x) {
        group.scale.setScalar(nextScale)
      }

      const nextCoreOpacity = dampNumber(
        coreMaterial.opacity,
        satelliteReveal * (dimmed ? 0.12 : focused ? 1 : 0.9),
        5,
        delta,
      )
      if (nextCoreOpacity !== coreMaterial.opacity) {
        coreMaterial.opacity = nextCoreOpacity
      }

      const nextEmissive = dampNumber(
        coreMaterial.emissiveIntensity,
        satelliteReveal * 1.05 + (hovered ? 1.1 : 0) + (focused ? 1.75 : 0),
        4.8,
        delta,
      )
      if (nextEmissive !== coreMaterial.emissiveIntensity) {
        coreMaterial.emissiveIntensity = nextEmissive
      }

      const nextRoughness = dampNumber(
        coreMaterial.roughness,
        focused ? 0.18 : 0.35,
        5,
        delta,
      )
      if (nextRoughness !== coreMaterial.roughness) {
        coreMaterial.roughness = nextRoughness
      }

      const nextHaloOpacity = dampNumber(
        haloMaterial.opacity,
        satelliteReveal * 0.1 + (hovered ? 0.12 : 0) + (focused ? 0.16 : 0),
        4.8,
        delta,
      )
      if (nextHaloOpacity !== haloMaterial.opacity) {
        haloMaterial.opacity = nextHaloOpacity
      }

      const nextGlowOpacity = dampNumber(
        glowMaterial.opacity,
        satelliteReveal * 0.14 + (hovered ? 0.12 : 0) + (focused ? 0.2 : 0),
        5,
        delta,
      )
      if (nextGlowOpacity !== glowMaterial.opacity) {
        glowMaterial.opacity = nextGlowOpacity
      }

      if (!dimmed || focused) {
        const worldAnchor = worldAnchors.current[index]
        group.getWorldPosition(worldAnchor)
        const anchor = anchorMap.get(project.id) ?? new Vector3()
        anchor.copy(worldAnchor)
        anchorMap.set(project.id, anchor)
      }
    }
  })

  return (
    <group ref={layerRef}>
      {projects.map((project, index) => (
        <ProjectTrackNode
          key={`${project.id}-track`}
          index={index}
          project={project}
          registerNode={registerNode}
        />
      ))}
      {projects.map((project, index) => (
        <SatelliteNode
          key={project.id}
          index={index}
          project={project}
          registerNode={registerNode}
        />
      ))}
    </group>
  )
}
