// Stub declaration to prevent TypeScript from loading Three.js-backed types
// from react-globe.gl, which causes the build worker to segfault on complex
// type graphs. The actual runtime behaviour is correct; we only lose type
// checking for Globe props (which are passed as `any` in GeospatialGlobe).
declare module 'react-globe.gl' {
  import type { ComponentType } from 'react'
  const Globe: ComponentType<Record<string, unknown>>
  export default Globe
}
