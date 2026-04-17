import { Vector3 } from 'three'

export const interactionState = {
  focusedProjectId: null as string | null,
  hoveredProjectId: null as string | null,
  projectAnchors: new Map<string, Vector3>(),
}

export function setFocusedProject(id: string | null) {
  interactionState.focusedProjectId = id
}

export function setHoveredProject(id: string | null) {
  interactionState.hoveredProjectId = id
}
