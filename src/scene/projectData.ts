export type ProjectSatellite = {
  angle: number
  ctaHref: string
  ctaLabel: string
  color: string
  height: number
  id: string
  inclination: number
  orbitSpeed: number
  radius: number
  role: string
  size: number
  summary: string
  tech: string[]
  title: string
  year: string
}

export const projects: ProjectSatellite[] = [
  {
    id: 'quant-platform',
    title: 'Quant Platform',
    summary:
      'Realtime market intelligence shaped for fast, high-volatility decisions.',
    role: 'System Design',
    year: '2026',
    tech: ['R3F', 'TypeScript', 'Realtime Data'],
    ctaLabel: 'View GitHub',
    ctaHref: 'https://github.com/search?q=quant+platform&type=repositories',
    angle: 0.18,
    radius: 3.55,
    height: 0.24,
    size: 0.23,
    color: '#ff8b52',
    inclination: 0.08,
    orbitSpeed: 0.07,
  },
  {
    id: 'security-grid',
    title: 'Security Grid',
    summary:
      'Threat telemetry fused into one calm surface for infrastructure response teams.',
    role: 'Security UX',
    year: '2025',
    tech: ['Telemetry', 'Mapping', 'Incident Ops'],
    ctaLabel: 'View GitHub',
    ctaHref: 'https://github.com/search?q=security+telemetry+dashboard&type=repositories',
    angle: 1.48,
    radius: 4.08,
    height: -0.16,
    size: 0.29,
    color: '#8cb8ff',
    inclination: -0.12,
    orbitSpeed: 0.052,
  },
  {
    id: 'signal-engine',
    title: 'Signal Engine',
    summary:
      'A forecasting engine designed to surface weak signals before they become obvious.',
    role: 'Research Systems',
    year: '2025',
    tech: ['Forecasting', 'Pipelines', 'Research'],
    ctaLabel: 'View GitHub',
    ctaHref: 'https://github.com/search?q=forecasting+engine&type=repositories',
    angle: 2.7,
    radius: 3.82,
    height: 0.12,
    size: 0.21,
    color: '#ffd48f',
    inclination: 0.16,
    orbitSpeed: 0.061,
  },
  {
    id: 'stellar-ops',
    title: 'Stellar Ops',
    summary:
      'Mission-control tooling for distributed teams operating across fragile systems.',
    role: 'Operations Platform',
    year: '2024',
    tech: ['Ops', 'Dashboards', 'Coordination'],
    ctaLabel: 'View GitHub',
    ctaHref: 'https://github.com/search?q=operations+dashboard&type=repositories',
    angle: 3.94,
    radius: 4.32,
    height: -0.28,
    size: 0.26,
    color: '#9f94ff',
    inclination: -0.08,
    orbitSpeed: 0.044,
  },
  {
    id: 'atmos-lab',
    title: 'Atmos Lab',
    summary:
      'Rapid atmosphere studies for motion, simulation, and immersive interface concepts.',
    role: 'Creative Technology',
    year: '2024',
    tech: ['Shaders', 'Simulation', 'Creative Code'],
    ctaLabel: 'View GitHub',
    ctaHref: 'https://github.com/search?q=creative+coding+simulation&type=repositories',
    angle: 5.22,
    radius: 3.64,
    height: 0.31,
    size: 0.19,
    color: '#8fe7d2',
    inclination: 0.11,
    orbitSpeed: 0.058,
  },
]
