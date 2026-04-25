import { useEffect, useRef, useState } from 'react'
import { load } from '@2gis/mapgl'

interface RouteMapProps {
  from: { lat: number; lon: number } | null
  to: { lat: number; lon: number } | null
  distance: number | null
}

const MAX_DISTANCE_KM = 4.0

export default function RouteMap({ from, to, distance }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const mapglRef = useRef<any>(null)
  const markersRef = useRef<{ from?: any; to?: any; line?: any }>({})
  const [ready, setReady] = useState(false)

  // Инициализация карты один раз
  useEffect(() => {
    if (!containerRef.current) return
    let destroyed = false

    load().then((mapgl) => {
      if (destroyed || !containerRef.current) return

      mapglRef.current = mapgl
      mapRef.current = new mapgl.Map(containerRef.current, {
        center: [71.4460, 51.1801],
        zoom: 12,
        pitch: 0,
        key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
        style: 'c080bb6a-0ad1-4d34-bd43-9829f04ef050',
      })

      setReady(true)
    })

    return () => {
      destroyed = true
      markersRef.current.from?.destroy()
      markersRef.current.to?.destroy()
      markersRef.current.line?.destroy()
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [])

  // Обновляем маркеры и линию при изменении координат
  useEffect(() => {
    if (!ready || !mapRef.current || !mapglRef.current) return
    const mapgl = mapglRef.current

    // Удаляем старые
    markersRef.current.from?.destroy()
    markersRef.current.to?.destroy()
    markersRef.current.line?.destroy()
    markersRef.current = {}

    if (from) {
      markersRef.current.from = new mapgl.HtmlMarker(mapRef.current, {
        coordinates: [from.lon, from.lat],
        html: markerHtml('А', '#38bdf8'),
        anchor: [0.5, 1],
      })
    }

    if (to) {
      markersRef.current.to = new mapgl.HtmlMarker(mapRef.current, {
        coordinates: [to.lon, to.lat],
        html: markerHtml('Б', '#f43f5e'),
        anchor: [0.5, 1],
      })
    }

    if (from && to) {
      markersRef.current.line = new mapgl.Polyline(mapRef.current, {
        coordinates: [
          [from.lon, from.lat],
          [to.lon, to.lat],
        ],
        style: {
          color: distance && distance > MAX_DISTANCE_KM ? '#f43f5e' : '#38bdf8',
          width: 2,
          dashArray: [5, 7],
          opacity: 0.7,
        },
      })

      const minLon = Math.min(from.lon, to.lon)
      const maxLon = Math.max(from.lon, to.lon)
      const minLat = Math.min(from.lat, to.lat)
      const maxLat = Math.max(from.lat, to.lat)
      mapRef.current.fitBounds(
        { northEast: [maxLon, maxLat], southWest: [minLon, minLat] },
        { padding: 60, duration: 600 }
      )
    } else if (from) {
      mapRef.current.setCenter([from.lon, from.lat], { duration: 500 })
      mapRef.current.setZoom(15, { duration: 500 })
    } else if (to) {
      mapRef.current.setCenter([to.lon, to.lat], { duration: 500 })
      mapRef.current.setZoom(15, { duration: 500 })
    }
  }, [ready, from, to, distance])

  const isOverLimit = distance !== null && distance > MAX_DISTANCE_KM

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10">
      <div ref={containerRef} className="w-full h-52" />

      {/* Легенда */}
      <div className="absolute bottom-3 left-3 flex gap-2 z-10">
        {from && (
          <div className="bg-[#080f1e]/90 backdrop-blur-md border border-primary/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-[9px] font-mono text-primary uppercase tracking-widest">Точка А</span>
          </div>
        )}
        {to && (
          <div className="bg-[#080f1e]/90 backdrop-blur-md border border-accent/30 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <span className="text-[9px] font-mono text-accent uppercase tracking-widest">Точка Б</span>
          </div>
        )}
      </div>

      {/* Дистанция */}
      {distance !== null && (
        <div className={`absolute top-3 right-3 z-10 bg-[#080f1e]/90 backdrop-blur-md border rounded-lg px-3 py-1.5 ${isOverLimit ? 'border-accent/40' : 'border-white/10'}`}>
          <span className="text-[10px] font-mono text-slate-400">
            {distance.toFixed(2)}{' '}
            <span className={isOverLimit ? 'text-accent' : 'text-primary'}>KM</span>
          </span>
        </div>
      )}

      {/* Пустое состояние */}
      {!from && !to && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#080f1e]/70 backdrop-blur-sm pointer-events-none z-10">
          <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            Введите адрес для отображения
          </span>
        </div>
      )}
    </div>
  )
}

function markerHtml(label: string, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:28px;height:28px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        box-shadow:0 0 14px ${color}90;
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);color:#080f1e;font-size:10px;font-weight:900;font-family:monospace;">${label}</span>
      </div>
      <div style="width:2px;height:5px;background:${color};opacity:0.5;"></div>
    </div>
  `
}
