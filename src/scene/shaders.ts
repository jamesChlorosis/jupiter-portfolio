export const planetVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const planetFragmentShader = `
uniform float uTime;
uniform float uProgress;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x)
    + (c - a) * u.y * (1.0 - u.x)
    + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.02;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 bandUv = vec2(fract(vUv.x + uTime * 0.008), vUv.y);
  float latitude = bandUv.y * 2.0 - 1.0;

  float broadNoise = fbm(vec2(bandUv.x * 3.5, bandUv.y * 18.0));
  float fineNoise = fbm(vec2(bandUv.x * 10.0 - uTime * 0.018, bandUv.y * 48.0));
  float streakNoise = fbm(vec2(bandUv.x * 20.0 + uTime * 0.012, bandUv.y * 120.0));
  float bandCurve = sin(latitude * 18.5 + broadNoise * 2.8 + fineNoise * 0.9);
  float bands = 0.5 + 0.5 * bandCurve;
  float atmosphereMix = smoothstep(0.44, 0.7, uProgress);
  float contactMix = smoothstep(0.84, 1.0, uProgress);

  vec3 cream = vec3(0.95, 0.87, 0.73);
  vec3 sand = vec3(0.86, 0.67, 0.47);
  vec3 caramel = vec3(0.70, 0.46, 0.28);
  vec3 deepRust = vec3(0.47, 0.27, 0.16);
  vec3 stormWhite = vec3(0.98, 0.94, 0.85);

  vec3 baseColor = mix(cream, sand, smoothstep(0.2, 0.75, bands));
  baseColor = mix(baseColor, caramel, smoothstep(0.48, 0.98, fineNoise + bands * 0.35));
  baseColor = mix(baseColor, deepRust, smoothstep(0.62, 1.0, streakNoise));
  baseColor = mix(baseColor, stormWhite, smoothstep(0.72, 1.0, 1.0 - bands + broadNoise * 0.35));

  float polarFade = smoothstep(0.0, 0.9, abs(latitude));
  baseColor *= mix(1.0, 0.8, polarFade);

  vec2 spotUv = bandUv - vec2(0.72, 0.38);
  spotUv.x *= 1.7;
  spotUv.y *= 3.6;
  float spotDist = length(spotUv);
  float spotSwirl = atan(spotUv.y, spotUv.x) + spotDist * 11.0 - uTime * 0.07;
  float spotMask = smoothstep(0.34, 0.07, spotDist + sin(spotSwirl) * 0.018);
  vec3 spotColor = mix(vec3(0.79, 0.31, 0.15), vec3(1.0, 0.63, 0.35), fineNoise);

  baseColor = mix(baseColor, spotColor, spotMask * (0.72 + atmosphereMix * 0.32));
  baseColor += spotMask * (0.08 + atmosphereMix * 0.05) * vec3(1.0, 0.62, 0.28);
  baseColor = mix(baseColor, baseColor * vec3(0.88, 0.93, 1.04), atmosphereMix * 0.18);
  baseColor = mix(baseColor, baseColor * vec3(0.9, 0.88, 0.94), contactMix * 0.14);

  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(vec3(0.78, 0.30, 0.55));
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float diffuse = max(dot(normal, lightDir), 0.0);
  float twilight = smoothstep(-0.3, 0.35, dot(normal, lightDir));
  float rim = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.6);

  vec3 lit = baseColor * (0.28 + diffuse * 0.95);
  lit += vec3(0.18, 0.24, 0.36) * (1.0 - twilight) * 0.32;
  lit += vec3(0.25, 0.34, 0.48) * atmosphereMix * (1.0 - twilight) * 0.18;
  lit += baseColor * rim * 0.12;

  gl_FragColor = vec4(lit, 1.0);
}
`

export const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const atmosphereFragmentShader = `
uniform float uTime;
uniform float uProgress;

varying vec3 vNormal;
varying vec3 vWorldPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);
  float atmosphereMix = smoothstep(0.44, 0.72, uProgress);
  float contactMix = smoothstep(0.84, 1.0, uProgress);
  float shimmer = 0.92 + sin(uTime * 0.2 + vWorldPosition.y * 1.8 + uProgress * 5.0) * 0.08;
  vec3 glowColor = mix(
    vec3(0.42, 0.54, 1.08),
    vec3(1.18, 0.7, 0.3),
    clamp(normal.y * 0.5 + 0.5, 0.0, 1.0)
  );
  glowColor = mix(glowColor, vec3(0.62, 0.74, 1.18), atmosphereMix * 0.22);
  glowColor = mix(glowColor, vec3(0.84, 0.9, 1.12), contactMix * 0.14);

  gl_FragColor = vec4(
    glowColor,
    fresnel * mix(0.26, 0.42, atmosphereMix) * (1.0 - contactMix * 0.15) * shimmer
  );
}
`
