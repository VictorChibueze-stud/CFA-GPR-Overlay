'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'

const MARKERS = [
  { lat: 26.5, lng:  56.2, label: 'Strait of Hormuz', color: '#ef4444', size: 0.8 },
  { lat: 31.8, lng:  35.2, label: 'Israel-Gaza',       color: '#ef4444', size: 0.6 },
  { lat: 51.5, lng:  -0.1, label: 'London',            color: '#f59e0b', size: 0.3 },
  { lat: 40.7, lng: -74.0, label: 'New York',          color: '#f59e0b', size: 0.3 },
]

export default function GeospatialGlobe() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(280)
  const [GlobeComponent, setGlobeComponent] = useState<any>(null)

  // Load globe only on client, after mount
  useEffect(() => {
    import('react-globe.gl').then(mod => {
      setGlobeComponent(() => mod.default)
    }).catch(() => {
      // Silently fail — show placeholder if lib fails to load
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full h-[200px] overflow-hidden flex items-center justify-center">
      {GlobeComponent ? (
        <GlobeComponent
          width={width}
          height={200}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
          backgroundColor="rgba(0,0,0,0)"
          atmosphereColor="#60a5fa"
          atmosphereAltitude={0.12}
          pointsData={MARKERS}
          pointColor={(d: any) => d.color}
          pointAltitude={0.02}
          pointRadius={(d: any) => d.size}
          pointLabel={(d: any) => d.label}
        />
      ) : (
        <div className="w-full h-full bg-slate-900 flex items-center justify-center">
          <span className="text-slate-600 text-[10px] font-black uppercase tracking-widest">
            Loading globe...
          </span>
        </div>
      )}
    </div>
  )
}
