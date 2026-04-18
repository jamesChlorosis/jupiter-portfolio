import type { CSSProperties } from 'react'
import {
  setFocusedProject,
  useFocusCameraSettled,
  useFocusedProjectId,
} from '../scene/interactionState'
import { projects } from '../scene/projectData'
import './FocusedProjectCard.css'

type ProjectOverlayRecord = (typeof projects)[number] & {
  orbitIndex: number
}

const projectLookup = new Map<string, ProjectOverlayRecord>(
  projects.map((project, index) => [
    project.id,
    {
      ...project,
      orbitIndex: index + 1,
    },
  ]),
)

export function FocusedProjectCard() {
  const focusedProjectId = useFocusedProjectId()
  const focusCameraSettled = useFocusCameraSettled()
  const project =
    (focusedProjectId ? projectLookup.get(focusedProjectId) : null) ?? null
  const isActive =
    focusedProjectId !== null && project !== null && focusCameraSettled
  const accentStyle =
    project != null
      ? ({ ['--project-accent' as string]: project.color } as CSSProperties)
      : undefined

  return (
    <div className="ui-overlay" aria-live="polite">
      <aside
        className={`focused-project-card${isActive ? ' is-active' : ''}`}
        aria-hidden={!isActive}
        style={accentStyle}
      >
        {project ? (
          <>
            <div className="focused-project-card__halo" aria-hidden="true" />
            <div className="focused-project-card__eyebrow">
              <span>Project Orbit</span>
              <span>{String(project.orbitIndex).padStart(2, '0')}</span>
            </div>
            <h2 className="focused-project-card__title">{project.title}</h2>
            <p className="focused-project-card__summary">{project.summary}</p>
            <ul className="focused-project-card__tags" aria-label="Technology tags">
              {project.tech.map((tech) => (
                <li key={tech}>{tech}</li>
              ))}
            </ul>
            <dl className="focused-project-card__meta">
              <div>
                <dt>Role</dt>
                <dd>{project.role}</dd>
              </div>
              <div>
                <dt>Window</dt>
                <dd>{project.year}</dd>
              </div>
            </dl>
            <div className="focused-project-card__actions">
              <a
                className="focused-project-card__cta"
                href={project.ctaHref}
                target="_blank"
                rel="noreferrer"
              >
                {project.ctaLabel}
              </a>
              <button
                type="button"
                className="focused-project-card__dismiss"
                onClick={() => {
                  setFocusedProject(null)
                }}
              >
                Release focus
              </button>
            </div>
          </>
        ) : null}
      </aside>
    </div>
  )
}
