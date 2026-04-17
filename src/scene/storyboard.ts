import { CatmullRomCurve3, MathUtils, Vector3, type Vector3Tuple } from 'three'

export type OrbitZoneId =
  | 'intro'
  | 'projects'
  | 'skills'
  | 'experience'
  | 'contact'

export type OrbitZone = {
  end: number
  focusOffset: Vector3Tuple
  fov: number
  id: OrbitZoneId
  label: string
  start: number
}

export const orbitZones: OrbitZone[] = [
  {
    id: 'intro',
    label: 'Distant Jupiter',
    start: 0,
    end: 0.2,
    fov: 38,
    focusOffset: [0, 0.28, 0.08],
  },
  {
    id: 'projects',
    label: 'Orbital Projects',
    start: 0.2,
    end: 0.44,
    fov: 34,
    focusOffset: [0.18, 0.1, 0.22],
  },
  {
    id: 'skills',
    label: 'Atmosphere Skills',
    start: 0.44,
    end: 0.68,
    fov: 29.5,
    focusOffset: [0.12, -0.08, 0.12],
  },
  {
    id: 'experience',
    label: 'Ring Experience',
    start: 0.68,
    end: 0.88,
    fov: 32.5,
    focusOffset: [-0.18, -0.18, -0.16],
  },
  {
    id: 'contact',
    label: 'Deep Space Contact',
    start: 0.88,
    end: 1,
    fov: 35.5,
    focusOffset: [-0.05, 0.02, -0.22],
  },
]

const cameraPathPoints: Vector3Tuple[] = [
  [-8.8, 1.45, 2.4],
  [-6.9, 1.18, 6.6],
  [-2.3, 0.7, 8.7],
  [3.2, 0.34, 7.6],
  [5.9, -0.08, 3.2],
  [6.1, -0.58, -2.4],
  [2.1, -0.86, -7.2],
  [-4.1, -0.4, -7.4],
  [-7.4, 0.1, -3.1],
]

const focusPathPoints: Vector3Tuple[] = [
  [0, 0.25, 0.04],
  [0.08, 0.18, 0.16],
  [0.22, 0.08, 0.26],
  [0.18, 0.02, 0.1],
  [0.1, -0.12, -0.02],
  [-0.12, -0.22, -0.14],
  [-0.16, -0.14, -0.22],
  [-0.08, -0.02, -0.06],
  [0.02, 0.08, 0.02],
]

function makeCurve(points: Vector3Tuple[]) {
  return new CatmullRomCurve3(
    points.map(([x, y, z]) => new Vector3(x, y, z)),
    false,
    'centripetal',
    0.4,
  )
}

export const cameraPath = makeCurve(cameraPathPoints)
export const focusPath = makeCurve(focusPathPoints)

export function getZoneById(id: OrbitZoneId) {
  return orbitZones.find((zone) => zone.id === id)
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

export function getZoneInfluence(zone: OrbitZone, progress: number, feather = 0.08) {
  const fadeIn = smoothstep(zone.start - feather, zone.start + feather, progress)
  const fadeOut = 1 - smoothstep(zone.end - feather, zone.end + feather, progress)
  return fadeIn * fadeOut
}
