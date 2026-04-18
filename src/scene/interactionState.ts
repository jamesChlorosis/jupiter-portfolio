import { useSyncExternalStore } from 'react'
import { Vector3 } from 'three'

type InteractionListener = () => void

const focusListeners = new Set<InteractionListener>()
const focusSettleListeners = new Set<InteractionListener>()
const hoverListeners = new Set<InteractionListener>()

export const interactionState = {
  focusCameraSettled: false,
  focusedProjectId: null as string | null,
  hoveredProjectId: null as string | null,
  projectAnchors: new Map<string, Vector3>(),
}

let currentFocusCameraSettled = interactionState.focusCameraSettled
let currentFocusedProjectId = interactionState.focusedProjectId
let currentHoveredProjectId = interactionState.hoveredProjectId

function emitFocusChange() {
  currentFocusedProjectId = interactionState.focusedProjectId
  for (const listener of focusListeners) {
    listener()
  }
}

function emitFocusSettleChange() {
  currentFocusCameraSettled = interactionState.focusCameraSettled
  for (const listener of focusSettleListeners) {
    listener()
  }
}

function emitHoverChange() {
  currentHoveredProjectId = interactionState.hoveredProjectId
  for (const listener of hoverListeners) {
    listener()
  }
}

function subscribeToFocusedProject(listener: InteractionListener) {
  focusListeners.add(listener)
  return () => {
    focusListeners.delete(listener)
  }
}

function subscribeToFocusSettle(listener: InteractionListener) {
  focusSettleListeners.add(listener)
  return () => {
    focusSettleListeners.delete(listener)
  }
}

function subscribeToHoveredProject(listener: InteractionListener) {
  hoverListeners.add(listener)
  return () => {
    hoverListeners.delete(listener)
  }
}

function getFocusSettleSnapshot() {
  return currentFocusCameraSettled
}

function getFocusedProjectSnapshot() {
  return currentFocusedProjectId
}

function getHoveredProjectSnapshot() {
  return currentHoveredProjectId
}

export function useFocusedProjectId() {
  return useSyncExternalStore(
    subscribeToFocusedProject,
    getFocusedProjectSnapshot,
    getFocusedProjectSnapshot,
  )
}

export function useFocusCameraSettled() {
  return useSyncExternalStore(
    subscribeToFocusSettle,
    getFocusSettleSnapshot,
    getFocusSettleSnapshot,
  )
}

export function useHoveredProjectId() {
  return useSyncExternalStore(
    subscribeToHoveredProject,
    getHoveredProjectSnapshot,
    getHoveredProjectSnapshot,
  )
}

export function setFocusCameraSettled(settled: boolean) {
  if (interactionState.focusCameraSettled === settled) {
    return
  }

  interactionState.focusCameraSettled = settled
  emitFocusSettleChange()
}

export function setFocusedProject(id: string | null) {
  if (interactionState.focusedProjectId === id) {
    return
  }

  interactionState.focusedProjectId = id
  if (id === null) {
    setFocusCameraSettled(false)
  }
  emitFocusChange()
}

export function setHoveredProject(id: string | null) {
  if (interactionState.hoveredProjectId === id) {
    return
  }

  interactionState.hoveredProjectId = id
  emitHoverChange()
}
