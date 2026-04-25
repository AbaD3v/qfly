import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { load } from '@2gis/mapgl' // Используем официальный загрузчик

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

  useEffect(() => {
    let mapglInstance: any;
    let activeChannel: any;

    // Официальный способ загрузки MapGL
    load().then(async (mapgl) => {
      if (!mapContainer.current) return
      mapglInstance = mapgl

      // Инициализация карты
mapInstance.current = new mapgl.Map(mapContainer.current, {
  center: HUB_CENTER,
  zoom: 12,
  key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
  style: 'c080bb6a-0ad1-4d34-bd43-9829f04ef050',
});

      // Рисуем круги зон
      ZONES_DATA.forEach((zone) => {
        new mapgl.Circle(mapInstance.current, {
          coordinates: HUB_CENTER,
          radius: zone.radius,
          color: zone.color + '22', // 22 - это прозрачность в HEX
          strokeColor: zone.color,
          strokeWidth: 1,
        })
      })

      // Запуск трекинга флота и сохранение канала для очистки
      activeChannel = await fetchAndSubscribeDrones(mapgl)
    })

    return () => {
      if (mapInstance.current) {
        mapInstance.current.destroy()
      }
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  const fetchAndSubscribeDrones = async (mapgl: any) => {
    // 1. Сначала загружаем текущее состояние флота
    const { data: drones } = await supabase.from('drones').select('*')
    drones?.forEach((drone) => updateDroneMarker(drone, mapgl))

    // 2. Создаем канал, ВЕШАЕМ ОБРАБОТЧИК и только потом вызываем subscribe()
    const channel = supabase
      .channel('live-fleet')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'drones' }, 
        (payload) => {
          // payload.new — это данные при вставке или обновлении
          // payload.old — данные при удалении
          if (payload.new && Object.keys(payload.new).length > 0) {
            updateDroneMarker(payload.new, mapgl)
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime status:', status)
      })

    // Возвращаем канал для отписки в useEffect
    return channel
  }

  const updateDroneMarker = (drone: any, mapgl: any) => {
    // Если дрон удален, нет координат или карта не инициализирована, выходим
    if (!drone || !drone.current_lat || !drone.current_lon || !mapInstance.current) return
    
    const coords = [drone.current_lon, drone.current_lat]

    if (markersRef.current[drone.id]) {
      markersRef.current[drone.id].setCoordinates(coords)
    } else {
      // Создаем кастомный HTML маркер
      const content = `
        <div class="relative">
          <div class="drone-glow"></div>
          <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 border border-primary/30 px-2 py-0.5 rounded text-[10px] text-primary font-mono whitespace-nowrap shadow-xl">
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
    <div className="relative w-full h-[500px] overflow-hidden rounded-2xl">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 z-10">
        <div className="glass-card p-2 px-4 rounded-full border-primary/20 backdrop-blur-xl flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-mono text-primary tracking-widest uppercase">Сигнал флота активен</span>
        </div>
      </div>
    </div>
  )
}