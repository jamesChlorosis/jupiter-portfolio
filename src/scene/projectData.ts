export type ProjectSatellite = {
  angle: number
  color: string
  height: number
  id: string
  inclination: number
  orbitSpeed: number
  radius: number
  size: number
  title: string
}

export const projects: ProjectSatellite[] = [
  {
    id: 'quant-platform',
    title: 'Quant Platform',
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
    angle: 5.22,
    radius: 3.64,
    height: 0.31,
    size: 0.19,
    color: '#8fe7d2',
    inclination: 0.11,
    orbitSpeed: 0.058,
  },
]
