import { type ThreeEvent, useFrame } from '@react-three/fiber'
import { Select } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef } from 'react'
import {
  Color,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  MathUtils,
  Object3D,
  Vector3,
} from 'three'
import {
  interactionState,
  setFocusedProject,
  setHoveredProject,
} from './interactionState'
import { projects } from './projectData'
import { scrollState } from './scrollState'
import { getZoneById } from './storyboard'

type RuntimeSatellite = {
  position: Vector3
  roll: number
  scale: number
  spin: number
  trackScale: number
}

const projectZone = getZoneById('projects')
const staggerWindow = 0.032
const orbitAxis = new Vector3(1, 0, 0)
const tempObject = new Object3D()
const tempColor = new Color()
const tempGlowOffset = new Vector3()
const tempBeaconOffset = new Vector3()
const tempBeaconPosition = new Vector3()
const tempGlowPosition = new Vector3()
const tempWorldPosition = new Vector3()
const origin = new Vector3()
const instanceCount = projects.length
const hiddenScale = 0.0001

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

function composeInstanceMatrix(
  position: Vector3,
  scaleX: number,
  scaleY: number,
  scaleZ: number,
  rotationX: number,
  rotationY: number,
  rotationZ: number,
) {
  tempObject.position.copy(position)
  tempObject.rotation.set(rotationX, rotationY, rotationZ)
  tempObject.scale.set(scaleX, scaleY, scaleZ)
  tempObject.updateMatrix()
  return tempObject.matrix
}

function setInstanceColor(
  mesh: InstancedMesh,
  index: number,
  baseColor: Color,
  intensity: number,
) {
  tempColor.copy(baseColor).multiplyScalar(Math.max(intensity, 0))
  mesh.setColorAt(index, tempColor)
}

export function ProjectsOrbit() {
  const layerRef = useRef<Group>(null)
  const trackMeshRef = useRef<InstancedMesh>(null)
  const hitMeshRef = useRef<InstancedMesh>(null)
  const coreMeshRef = useRef<InstancedMesh>(null)
  const frameMeshRef = useRef<InstancedMesh>(null)
  const glowMeshRef = useRef<InstancedMesh>(null)
  const beaconMeshRef = useRef<InstancedMesh>(null)
  const haloMeshRef = useRef<InstancedMesh>(null)

  const runtimeSatellites = useRef<RuntimeSatellite[]>(
    projects.map(() => ({
      position: new Vector3(),
      roll: 0,
      scale: hiddenScale,
      spin: 0,
      trackScale: hiddenScale,
    })),
  )
  const baseColors = useMemo(() => projects.map((project) => new Color(project.color)), [])
  const revealDelays = useMemo(
    () => projects.map((_, index) => index * staggerWindow),
    [],
  )
  const anchorCache = useRef(projects.map(() => new Vector3()))

  useEffect(() => {
    const meshes = [
      trackMeshRef.current,
      hitMeshRef.current,
      coreMeshRef.current,
      frameMeshRef.current,
      glowMeshRef.current,
      beaconMeshRef.current,
      haloMeshRef.current,
    ]

    for (let index = 0; index < meshes.length; index += 1) {
      const mesh = meshes[index]
      if (!mesh) {
        continue
      }

      mesh.instanceMatrix.setUsage(DynamicDrawUsage)
      mesh.frustumCulled = false
    }

    if (coreMeshRef.current?.instanceColor) {
      coreMeshRef.current.instanceColor.setUsage(DynamicDrawUsage)
    }
    if (glowMeshRef.current?.instanceColor) {
      glowMeshRef.current.instanceColor.setUsage(DynamicDrawUsage)
    }
    if (beaconMeshRef.current?.instanceColor) {
      beaconMeshRef.current.instanceColor.setUsage(DynamicDrawUsage)
    }
    if (haloMeshRef.current?.instanceColor) {
      haloMeshRef.current.instanceColor.setUsage(DynamicDrawUsage)
    }
    if (trackMeshRef.current?.instanceColor) {
      trackMeshRef.current.instanceColor.setUsage(DynamicDrawUsage)
    }
  }, [])

  const clearInteraction = () => {
    if (interactionState.hoveredProjectId !== null) {
      setHoveredProject(null)
      document.body.style.cursor = ''
    }
    if (interactionState.focusedProjectId !== null) {
      setFocusedProject(null)
    }
  }

  const updateHoveredProject = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    const instanceId = event.instanceId
    if (instanceId == null) {
      return
    }

    const project = projects[instanceId]
    if (!project) {
      return
    }

    if (interactionState.hoveredProjectId !== project.id) {
      setHoveredProject(project.id)
      document.body.style.cursor = 'pointer'
    }
  }

  const clearHoveredProject = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    if (interactionState.hoveredProjectId !== null) {
      setHoveredProject(null)
      document.body.style.cursor = ''
    }
  }

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const instanceId = event.instanceId
    if (instanceId == null) {
      return
    }

    const project = projects[instanceId]
    if (!project) {
      return
    }

    const isFocused = interactionState.focusedProjectId === project.id
    setFocusedProject(isFocused ? null : project.id)
  }

  useFrame((state, delta) => {
    const layer = layerRef.current
    const trackMesh = trackMeshRef.current
    const hitMesh = hitMeshRef.current
    const coreMesh = coreMeshRef.current
    const frameMesh = frameMeshRef.current
    const glowMesh = glowMeshRef.current
    const beaconMesh = beaconMeshRef.current
    const haloMesh = haloMeshRef.current

    if (
      !layer ||
      !trackMesh ||
      !hitMesh ||
      !coreMesh ||
      !frameMesh ||
      !glowMesh ||
      !beaconMesh ||
      !haloMesh
    ) {
      return
    }

    const progress = scrollState.progress
    const velocity = scrollState.velocity
    const zoneReveal = getProjectsReveal(progress)
    const zoneActive = zoneReveal > 0.01

    if (layer.visible !== zoneActive) {
      layer.visible = zoneActive
    }

    if (!zoneActive) {
      clearInteraction()
      return
    }

    const focusId = interactionState.focusedProjectId
    const hoveredId = interactionState.hoveredProjectId
    const hasFocusedProject = focusId !== null
    const focusSlowdown = hasFocusedProject ? 0.24 : 1

    layer.rotation.y += delta * (0.018 + zoneReveal * 0.01) * focusSlowdown
    layer.rotation.x = MathUtils.damp(
      layer.rotation.x,
      0.06 + velocity * 0.025,
      4,
      delta,
    )

    const layerScale = MathUtils.damp(layer.scale.x, 0.9 + zoneReveal * 0.1, 5, delta)
    if (Math.abs(layerScale - layer.scale.x) > 0.0001) {
      layer.scale.setScalar(layerScale)
    }

    layer.updateMatrixWorld(true)

    const elapsed = state.clock.getElapsedTime()
    const orbitPhase = progress * 0.16 + velocity * 0.08
    const driftTime = elapsed * 0.58
    const noiseTime = elapsed * 0.34
    const depthTime = elapsed * 0.28
    const runtime = runtimeSatellites.current
    const anchorMap = interactionState.projectAnchors

    for (let index = 0; index < instanceCount; index += 1) {
      const project = projects[index]
      const satellite = runtime[index]
      const reveal = getProjectsReveal(progress, revealDelays[index])
      const focused = focusId === project.id
      const hovered = hoveredId === project.id
      const dimmed = hasFocusedProject && !focused
      const activeForMotion = !dimmed

      if (activeForMotion) {
        const orbitSpeedMultiplier = focused ? 0.16 : 1
        const orbitAngle =
          project.angle +
          elapsed * project.orbitSpeed * orbitSpeedMultiplier +
          orbitPhase

        getOrbitPosition(
          satellite.position,
          orbitAngle,
          project.radius,
          project.height,
          project.inclination,
        )

        satellite.position.x +=
          Math.sin(noiseTime + project.radius * 1.7) * 0.025
        satellite.position.y +=
          Math.sin(driftTime + project.angle * 6.4) * 0.055
        satellite.position.z +=
          Math.cos(depthTime + project.inclination * 12) * 0.025

        satellite.spin += delta * (focused ? 0.16 : 0.28)
      }

      satellite.roll = MathUtils.damp(
        satellite.roll,
        hovered ? 0.24 : focused ? 0.18 : 0,
        4.5,
        delta,
      )

      const targetScale =
        reveal <= 0.01
          ? hiddenScale
          : 0.28 +
            reveal * 0.56 +
            (hovered ? 0.08 : 0) +
            (focused ? 0.2 : 0) -
            (dimmed ? 0.08 : 0)
      satellite.scale = MathUtils.damp(
        satellite.scale,
        Math.max(targetScale, hiddenScale),
        5.4,
        delta,
      )

      const targetTrackScale =
        reveal <= 0.01
          ? hiddenScale
          : 0.86 + reveal * 0.1 - (dimmed ? 0.08 : 0)
      satellite.trackScale = MathUtils.damp(
        satellite.trackScale,
        Math.max(targetTrackScale, hiddenScale),
        4.8,
        delta,
      )

      const glowColorIntensity =
        reveal * 0.16 + (hovered ? 0.08 : 0) + (focused ? 0.14 : 0)
      const frameColorIntensity =
        reveal * (dimmed ? 0.08 : focused ? 0.34 : 0.24)
      const beaconPulse =
        0.78 + Math.sin(elapsed * (focused ? 4.8 : 3.2) + index * 1.3) * 0.12
      const beaconColorIntensity =
        reveal * (dimmed ? 0.12 : 0.46) * beaconPulse +
        (hovered ? 0.1 : 0) +
        (focused ? 0.18 : 0)
      const haloColorIntensity =
        reveal * 0.08 + (hovered ? 0.05 : 0) + (focused ? 0.08 : 0)
      const trackColorIntensity =
        reveal * (dimmed ? 0.03 : focused ? 0.12 : 0.08)
      const coreScale = project.size * satellite.scale * 0.7
      const frameScale = coreScale * (focused ? 1.62 : hovered ? 1.56 : 1.48)
      const glowScale = coreScale * (focused ? 1.08 : hovered ? 1.04 : 1)
      const haloScale = coreScale * (focused ? 1.55 : 1.42)
      const beaconScale = coreScale * (focused ? 0.28 : hovered ? 0.25 : 0.22)
      const hitScale =
        reveal > 0.04 && (!hasFocusedProject || focused)
          ? coreScale * 1.85
          : hiddenScale

      const baseColor = baseColors[index]
      setInstanceColor(trackMesh, index, baseColor, trackColorIntensity)
      setInstanceColor(frameMesh, index, baseColor, frameColorIntensity)
      setInstanceColor(glowMesh, index, baseColor, glowColorIntensity)
      setInstanceColor(beaconMesh, index, baseColor, beaconColorIntensity)
      setInstanceColor(haloMesh, index, baseColor, haloColorIntensity)

      const trackMatrix = composeInstanceMatrix(
        origin,
        project.radius * satellite.trackScale,
        project.radius * satellite.trackScale,
        satellite.trackScale,
        Math.PI / 2,
        project.angle * 0.26 + elapsed * 0.012,
        project.inclination * 0.65,
      )
      trackMesh.setMatrixAt(index, trackMatrix)

      const coreMatrix = composeInstanceMatrix(
        satellite.position,
        coreScale,
        coreScale,
        coreScale,
        0,
        satellite.spin,
        satellite.roll,
      )
      coreMesh.setMatrixAt(index, coreMatrix)

      const frameMatrix = composeInstanceMatrix(
        satellite.position,
        frameScale,
        frameScale,
        frameScale,
        satellite.spin * 0.9 + 0.42,
        satellite.roll + project.inclination * 2.2,
        project.angle * 0.32 + elapsed * 0.05,
      )
      frameMesh.setMatrixAt(index, frameMatrix)

      tempGlowOffset.set(
        Math.cos(satellite.spin * 1.4 + project.angle) * coreScale * 0.12,
        Math.sin(satellite.spin * 1.1 + project.height * 12) * coreScale * 0.08,
        Math.sin(satellite.spin * 1.4 + project.angle) * coreScale * 0.1,
      )
      tempGlowPosition.copy(satellite.position).add(tempGlowOffset)
      const glowMatrix = composeInstanceMatrix(
        tempGlowPosition,
        glowScale,
        glowScale,
        glowScale,
        0,
        satellite.spin,
        satellite.roll,
      )
      glowMesh.setMatrixAt(index, glowMatrix)

      tempBeaconOffset.set(
        Math.cos(satellite.spin * 1.18 + project.angle * 4.4) * coreScale * 1.2,
        coreScale * 0.34 +
          Math.sin(driftTime * 0.8 + project.height * 18) * coreScale * 0.18,
        Math.sin(satellite.spin * 1.18 + project.angle * 4.4) * coreScale * 0.78,
      )
      tempBeaconPosition.copy(satellite.position).add(tempBeaconOffset)
      const beaconMatrix = composeInstanceMatrix(
        tempBeaconPosition,
        beaconScale,
        beaconScale,
        beaconScale,
        0,
        satellite.spin * 1.4,
        satellite.roll * 0.4,
      )
      beaconMesh.setMatrixAt(index, beaconMatrix)

      const haloMatrix = composeInstanceMatrix(
        satellite.position,
        haloScale,
        haloScale,
        haloScale,
        0,
        satellite.spin,
        satellite.roll,
      )
      haloMesh.setMatrixAt(index, haloMatrix)

      const hitMatrix = composeInstanceMatrix(
        satellite.position,
        hitScale,
        hitScale,
        hitScale,
        0,
        satellite.spin,
        satellite.roll,
      )
      hitMesh.setMatrixAt(index, hitMatrix)

      tempWorldPosition.copy(satellite.position).applyMatrix4(layer.matrixWorld)
      anchorCache.current[index].copy(tempWorldPosition)
      anchorMap.set(project.id, anchorCache.current[index])
    }

    trackMesh.instanceMatrix.needsUpdate = true
    coreMesh.instanceMatrix.needsUpdate = true
    frameMesh.instanceMatrix.needsUpdate = true
    glowMesh.instanceMatrix.needsUpdate = true
    beaconMesh.instanceMatrix.needsUpdate = true
    haloMesh.instanceMatrix.needsUpdate = true
    hitMesh.instanceMatrix.needsUpdate = true

    if (trackMesh.instanceColor) {
      trackMesh.instanceColor.needsUpdate = true
    }
    if (frameMesh.instanceColor) {
      frameMesh.instanceColor.needsUpdate = true
    }
    if (glowMesh.instanceColor) {
      glowMesh.instanceColor.needsUpdate = true
    }
    if (beaconMesh.instanceColor) {
      beaconMesh.instanceColor.needsUpdate = true
    }
    if (haloMesh.instanceColor) {
      haloMesh.instanceColor.needsUpdate = true
    }
  })

  return (
    <group ref={layerRef}>
      <instancedMesh
        ref={trackMeshRef}
        args={[undefined, undefined, instanceCount]}
        renderOrder={-1}
      >
        <torusGeometry args={[1, 0.0032, 8, 72, Math.PI * 1.42]} />
        <meshStandardMaterial
          depthWrite={false}
          emissive="#152033"
          emissiveIntensity={0.08}
          metalness={0.08}
          opacity={0.24}
          roughness={0.92}
          toneMapped={false}
          transparent
          vertexColors
        />
      </instancedMesh>

      <instancedMesh
        ref={hitMeshRef}
        args={[undefined, undefined, instanceCount]}
        onClick={handleClick}
        onPointerMove={updateHoveredProject}
        onPointerOut={clearHoveredProject}
      >
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial opacity={0} transparent />
      </instancedMesh>

      <instancedMesh ref={coreMeshRef} args={[undefined, undefined, instanceCount]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshPhysicalMaterial
          clearcoat={0.62}
          clearcoatRoughness={0.42}
          color="#121a2a"
          emissive="#243754"
          emissiveIntensity={0.22}
          metalness={0.14}
          roughness={0.48}
        />
      </instancedMesh>

      <instancedMesh ref={frameMeshRef} args={[undefined, undefined, instanceCount]}>
        <torusGeometry args={[1, 0.08, 8, 28, Math.PI * 1.7]} />
        <meshStandardMaterial
          emissive="#273958"
          emissiveIntensity={0.14}
          metalness={0.48}
          roughness={0.34}
          toneMapped={false}
          vertexColors
        />
      </instancedMesh>

      <Select enabled>
        <>
          <instancedMesh ref={glowMeshRef} args={[undefined, undefined, instanceCount]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial
              depthTest
              depthWrite={false}
              opacity={0.42}
              toneMapped={false}
              transparent
              vertexColors
            />
          </instancedMesh>

          <instancedMesh ref={beaconMeshRef} args={[undefined, undefined, instanceCount]}>
            <sphereGeometry args={[1, 18, 18]} />
            <meshBasicMaterial
              depthTest
              depthWrite={false}
              opacity={0.95}
              toneMapped={false}
              transparent
              vertexColors
            />
          </instancedMesh>
        </>
      </Select>

      <instancedMesh ref={haloMeshRef} args={[undefined, undefined, instanceCount]}>
        <sphereGeometry args={[1, 18, 18]} />
        <meshBasicMaterial
          depthTest
          depthWrite={false}
          opacity={0.18}
          toneMapped={false}
          transparent
          vertexColors
        />
      </instancedMesh>
    </group>
  )
}
