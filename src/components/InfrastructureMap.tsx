import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { load } from '@2gis/mapgl'

const HUB_CENTER: [number, number] = [71.4305, 51.1283]

const ZONES_DATA = [
  { radius: 2000, color: '#94a3b8' },
  { radius: 3500, color: '#38bdf8' },
  { radius: 4000, color: '#f97316' },
]

export default function InfrastructureMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const markersRef = useRef<{ [key: string]: any }>({})
  const channelRef = useRef<any>(null) // Храним канал здесь для надежной очистки

  useEffect(() => {
    let isMounted = true;
    
    // Защита от двойного рендера (Strict Mode)
    if (mapInstance.current) return;

    const initMap = async () => {
      try {
        const mapgl = await load()
        if (!isMounted || !mapContainer.current) return

        mapInstance.current = new mapgl.Map(mapContainer.current, {
          center: HUB_CENTER,
          zoom: 12,
          pitch: 35, // Слегка наклоним для красоты 3D
          key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
          // Временно закомментировал твой стиль, чтобы не было ошибки 404, 
          // если он удален или закрыт настройками приватности в 2GIS
          // style: 'c080bb6a-0ad1-4d34-bd43-9829f04ef050',
        });

        // Рисуем круги зон покрытия
        ZONES_DATA.forEach((zone) => {
          new mapgl.Circle(mapInstance.current, {
            coordinates: HUB_CENTER,
            radius: zone.radius,
            color: zone.color + '1A', // Немного прозрачнее (HEX)
            strokeColor: zone.color,
            strokeWidth: 1,
          })
        })

        // 1. Загружаем текущее состояние флота
        const { data: drones } = await supabase.from('drones').select('*')
        if (isMounted && drones) {
          drones.forEach((drone) => updateDroneMarker(drone, mapgl))
        }

        // 2. Подписываемся на обновления
        if (isMounted) {
          channelRef.current = supabase.channel('live-fleet')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'drones' }, (payload) => {
              if (payload.new && Object.keys(payload.new).length > 0) {
                updateDroneMarker(payload.new, mapgl)
              }
            })
            .subscribe((status) => {
              console.log('📡 РАДАР: Сигнал флота ->', status)
            })
        }

      } catch (err) {
        console.error('Ошибка инициализации карты флота:', err);
      }
    }

    initMap()

    // Идеальная очистка при уходе со страницы
    return () => {
      isMounted = false;
      if (mapInstance.current) {
        mapInstance.current.destroy()
        mapInstance.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const updateDroneMarker = (drone: any, mapgl: any) => {
    if (!drone || !drone.current_lat || !drone.current_lon || !mapInstance.current) return
    
    const coords = [drone.current_lon, drone.current_lat]
    const marker = markersRef.current[drone.id]

    if (marker) {
      // Плавно перемещаем существующий маркер
      marker.setCoordinates(coords)
    } else {
      // Если дрона еще нет на карте — создаем его.
      // ИЗМЕНЕНИЕ: Добавил цветовую индикацию статуса прямо на маркер
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'idle': return 'bg-green-500' // Свободен (на базе)
          case 'waiting': return 'bg-blue-400' // Ждет PIN-код
          case 'charging': return 'bg-yellow-500' // На зарядке
          default: return 'bg-primary' // on_mission (в полете)
        }
      }

      const content = `
        <div class="relative flex items-center justify-center pointer-events-none">
          <div class="w-3 h-3 rounded-full ${getStatusColor(drone.status)} shadow-[0_0_12px_currentColor] ${drone.status === 'on_mission' ? 'animate-pulse' : ''}"></div>
          <div class="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 px-1.5 py-0.5 rounded text-[9px] text-white font-mono whitespace-nowrap shadow-lg">
            ${drone.callsign}
          </div>
        </div>
      `

      markersRef.current[drone.id] = new mapgl.HtmlMarker(mapInstance.current, {
        coordinates: coords,
        html: content,
      })
    }
  }

  return (
    <div className="relative w-full h-[500px] overflow-hidden rounded-3xl border border-white/5 shadow-2xl">
      <div ref={mapContainer} className="w-full h-full opacity-90" />
      <div className="absolute bottom-6 left-6 z-10 pointer-events-none">
        <div className="bg-slate-900/80 p-2 px-4 rounded-full border border-primary/20 backdrop-blur-md flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
          <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
          <span className="text-[10px] font-mono text-white tracking-widest uppercase">ОБЩИЙ РАДАР АКТИВЕН</span>
        </div>
      </div>
    </div>
  )
}