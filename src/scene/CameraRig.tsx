import { useFrame } from '@react-three/fiber'
import { damp3 } from 'maath/easing'
import { MathUtils, Vector3 } from 'three'
import { interactionState, setFocusCameraSettled } from './interactionState'
import { scrollState } from './scrollState'
import { cameraPath, focusPath, getZoneInfluence, orbitZones } from './storyboard'

const cameraTarget = new Vector3()
const finalCameraTarget = new Vector3()
const focusTarget = new Vector3()
const focusOffset = new Vector3()
const tangent = new Vector3()
const focusedCameraTarget = new Vector3()
const focusedLookTarget = new Vector3()
const focusDirection = new Vector3()
const lookAtTarget = new Vector3()
const lastAppliedLookAt = new Vector3()
const lastAppliedCameraPosition = new Vector3()

export function CameraRig() {
  useFrame(({ camera }, delta) => {
    if (!('fov' in camera)) {
      return
    }

    scrollState.progress = MathUtils.damp(
      scrollState.progress,
      scrollState.targetProgress,
      4.5,
      delta,
    )
    scrollState.velocity = MathUtils.damp(scrollState.velocity, 0, 5.5, delta)

    const progress = scrollState.progress
    const pathProgress = MathUtils.clamp(progress * 0.96 + 0.02, 0.02, 0.98)
    const atmosphereDive = Math.exp(-Math.pow((progress - 0.58) / 0.12, 2))
    const contactDrift = Math.exp(-Math.pow((progress - 0.92) / 0.08, 2))

    cameraTarget.copy(cameraPath.getPointAt(pathProgress))
    tangent.copy(cameraPath.getTangentAt(pathProgress))
    cameraTarget.addScaledVector(tangent, scrollState.velocity * 0.18)
    cameraTarget.y -= atmosphereDive * 0.22
    cameraTarget.z -= contactDrift * 0.32

    let weightSum = 0
    let targetFov = 0
    focusOffset.set(0, 0, 0)

    for (let index = 0; index < orbitZones.length; index += 1) {
      const zone = orbitZones[index]
      const weight = getZoneInfluence(zone, progress)
      if (weight <= 0) {
        continue
      }

      weightSum += weight
      targetFov += zone.fov * weight
      focusOffset.x += zone.focusOffset[0] * weight
      focusOffset.y += zone.focusOffset[1] * weight
      focusOffset.z += zone.focusOffset[2] * weight
    }

    if (weightSum > 0) {
      targetFov /= weightSum
      focusOffset.divideScalar(weightSum)
    } else {
      targetFov = 34
    }

    focusTarget.copy(focusPath.getPointAt(pathProgress))
    focusTarget.add(focusOffset)
    focusTarget.z -= atmosphereDive * 0.16

    targetFov -= atmosphereDive * 2.4
    targetFov += contactDrift * 1.6
    finalCameraTarget.copy(cameraTarget)

    const focusedProjectId = interactionState.focusedProjectId
    const focusedAnchor = focusedProjectId
      ? interactionState.projectAnchors.get(focusedProjectId)
      : null

    if (focusedAnchor) {
      focusDirection.copy(focusedAnchor).normalize()
      focusedLookTarget.copy(focusedAnchor)
      focusedLookTarget.y += 0.06

      focusedCameraTarget.copy(focusedAnchor)
      focusedCameraTarget.addScaledVector(focusDirection, 1.58)
      focusedCameraTarget.y += 0.34

      finalCameraTarget.copy(focusedCameraTarget)
      focusTarget.lerp(focusedLookTarget, 0.72)
      targetFov = MathUtils.lerp(targetFov, 26.5, 0.8)
    } else {
      setFocusCameraSettled(false)
    }

    damp3(camera.position, finalCameraTarget, focusedAnchor ? 0.18 : 0.24, delta)
    damp3(lookAtTarget, focusTarget, focusedAnchor ? 0.16 : 0.22, delta)

    if (
      lastAppliedLookAt.distanceToSquared(lookAtTarget) > 0.000001 ||
      lastAppliedCameraPosition.distanceToSquared(camera.position) > 0.000001
    ) {
      camera.lookAt(lookAtTarget)
      lastAppliedLookAt.copy(lookAtTarget)
      lastAppliedCameraPosition.copy(camera.position)
    }

    const nextFov = MathUtils.damp(camera.fov, targetFov, 3.5, delta)
    if (Math.abs(nextFov - camera.fov) > 0.01) {
      camera.fov = nextFov
      camera.updateProjectionMatrix()
    }

    if (focusedAnchor) {
      const settledThresholdScale = interactionState.focusCameraSettled ? 1.9 : 1
      const positionSettled =
        camera.position.distanceToSquared(finalCameraTarget) <
        0.016 * settledThresholdScale
      const lookSettled =
        lookAtTarget.distanceToSquared(focusTarget) <
        0.01 * settledThresholdScale
      const fovSettled =
        Math.abs(camera.fov - targetFov) < 0.18 * settledThresholdScale

      setFocusCameraSettled(positionSettled && lookSettled && fovSettled)
    }
  })

  return null
}
