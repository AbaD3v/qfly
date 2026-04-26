import { useEffect, useRef, useState, useCallback } from 'react';
import { load } from '@2gis/mapgl';
import { supabase } from '@/lib/supabase';
import { Terminal, Battery, Loader2, Search, Package, CheckCircle2, XCircle, Key, Navigation } from 'lucide-react';

interface DeliveryMapProps {
  orderId?: string;
  droneId?: string;
  staticStart?: [number, number];
  staticEnd?: [number, number];
}

const BASE_COORDS: [number, number] = [71.446, 51.1801];

export default function DeliveryMapAdmin({ orderId, droneId, staticStart, staticEnd }: DeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const droneMarker = useRef<any>(null);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [realDrone, setRealDrone] = useState<any>(null);
  const [orderState, setOrderState] = useState<any>(null); // ИЗМЕНЕНИЕ: Отдельный стейт для заказа
  const [isMapLoading, setIsMapLoading] = useState(true);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  }, []);

  // 1. ПОДПИСКА НА ДАННЫЕ (ДРОН + ЗАКАЗ)
  useEffect(() => {
    let droneChannel: ReturnType<typeof supabase.channel> | null = null;
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let isMounted = true;
    
    const fetchAndSubscribeDrone = async (id: string) => {
      try {
        const { data, error } = await supabase.from('drones').select('*').eq('id', id).single();
        if (!isMounted) return;
        if (error) throw error;
        
        if (data) {
          setRealDrone(data);
          addLog('БОРТ: Данные загружены');
        }

        droneChannel = supabase.channel(`realtime-drone-${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drones', filter: `id=eq.${id}` }, 
          (payload) => {
             if (isMounted) setRealDrone(payload.new);
          }).subscribe();
      } catch (error) {
        console.error('❌ Error fetching drone:', error);
      }
    };

    const fetchAndSubscribeOrder = async (id: string) => {
      try {
        const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
        if (!isMounted) return;
        if (error) throw error;

        if (data) {
          setOrderState(data);
          // Если мы пришли сюда только с orderId, подхватываем дрон из заказа
          if (!droneId && data.drone_id) fetchAndSubscribeDrone(data.drone_id);
        }

        orderChannel = supabase.channel(`realtime-order-${id}`)
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, 
          (payload) => {
            if (isMounted) {
              setOrderState(payload.new);
              addLog(`ЗАКАЗ: Статус изменен на [${payload.new.status}]`);
            }
          }).subscribe();
      } catch (error) {
        console.error('❌ Error fetching order:', error);
      }
    };

    // Запускаем загрузку в зависимости от пропсов
    if (orderId) {
      fetchAndSubscribeOrder(orderId);
      // Если droneId тоже передан явно (например из ЦУПа), подписываемся сразу
      if (droneId) fetchAndSubscribeDrone(droneId);
    } else if (droneId) {
      fetchAndSubscribeDrone(droneId);
    }

    return () => { 
      isMounted = false;
      if (droneChannel) supabase.removeChannel(droneChannel); 
      if (orderChannel) supabase.removeChannel(orderChannel); 
    };
  }, [droneId, orderId, addLog]);

  // 2. ПЕРЕМЕЩЕНИЕ МАРКЕРА
  useEffect(() => {
    if (droneMarker.current && realDrone?.current_lon && realDrone?.current_lat) {
      const newCoords = [realDrone.current_lon, realDrone.current_lat];
      
      // Плавное перемещение маркера средствами 2GIS
      droneMarker.current.setCoordinates(newCoords);
      
      // Центрируем карту за дроном, если он "на миссии"
      if (realDrone.status === 'on_mission' && mapInstance.current) {
        mapInstance.current.setCenter(newCoords, { duration: 500 });
      }
    }
  }, [realDrone]);

  // 3. ИНИЦИАЛИЗАЦИЯ КАРТЫ (СТРОГО ОДИН РАЗ)
  useEffect(() => {
    // Если карта уже существует - выходим, чтобы не было прыжков!
    if (!mapContainerRef.current || mapInstance.current) return;
    let destroyed = false;

    const initMap = async () => {
      try {
        const mapgl = await load();
        if (destroyed || !mapContainerRef.current) return;

        mapglRef.current = mapgl;
        mapInstance.current = new mapgl.Map(mapContainerRef.current, {
          center: BASE_COORDS,
          zoom: 15,
          pitch: 45,
          key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
        });

        // Статичный маркер Хаба
        new mapgl.HtmlMarker(mapInstance.current, {
          coordinates: BASE_COORDS,
          html: pointMarkerHtml('HUB', '#22c55e', true),
        });

        // Создаем маркер дрона (он будет двигаться в другом useEffect)
        droneMarker.current = new mapgl.HtmlMarker(mapInstance.current, {
          coordinates: BASE_COORDS,
          html: `<div class="drone-glow"></div>`,
        });

        setIsMapLoading(false);
      } catch (err) {
        console.error("Map load error:", err);
      }
    };

    initMap();

    return () => {
      destroyed = true;
      mapInstance.current?.destroy();
      mapInstance.current = null;
    };
  }, []); // <-- ПУСТОЙ МАССИВ! Карта инициализируется только при старте страницы.

  // 4. ОТРИСОВКА МАРШРУТА (Точки А и Б)
  const routeMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    // Ждем, пока карта полностью загрузится
    if (isMapLoading || !mapInstance.current || !mapglRef.current) return;

    // Очищаем старые маркеры А и Б, если маршрут изменился
    routeMarkersRef.current.forEach(marker => marker.destroy());
    routeMarkersRef.current = [];

    if (staticStart && Array.isArray(staticStart) && staticStart.length === 2) {
      const markerA = new mapglRef.current.HtmlMarker(mapInstance.current, { 
        coordinates: staticStart, 
        html: pointMarkerHtml('А', '#38bdf8') 
      });
      routeMarkersRef.current.push(markerA);
      addLog('МАРШРУТ: Точка А загружена');
    }
    
    if (staticEnd && Array.isArray(staticEnd) && staticEnd.length === 2) {
      const markerB = new mapglRef.current.HtmlMarker(mapInstance.current, { 
        coordinates: staticEnd, 
        html: pointMarkerHtml('Б', '#f43f5e') 
      });
      routeMarkersRef.current.push(markerB);
      addLog('МАРШРУТ: Точка Б загружена');
    }

    // Лайфхак: превращаем массивы в строки "71.4,51.1", чтобы React не сходил с ума от новых ссылок
  }, [staticStart?.join(','), staticEnd?.join(','), isMapLoading, addLog]);

  const battery = realDrone?.battery_level ?? 100;
  // Используем статус заказа для UI, если он есть. Иначе берем статус дрона (для простой телеметрии).
  const displayStatus = orderState ? orderState.status : (realDrone?.status || 'idle');

  return (
    <div className="relative w-full h-[500px] bg-slate-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
      <div ref={mapContainerRef} className="w-full h-full opacity-90" />

      {isMapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Панель телеметрии */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-slate-500 font-mono tracking-widest">STATUS</span>
            <span className="text-[10px] font-mono font-bold text-primary uppercase">{displayStatus}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Battery size={14} className={battery < 20 ? 'text-red-500 animate-pulse' : 'text-primary'} />
            <span className="text-sm font-mono font-bold text-white">{battery}%</span>
          </div>
        </div>
      </div>

      {/* Логи диспетчера */}
      <div className="absolute bottom-6 left-6 z-10 w-72 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-xl border border-primary/20 p-4 rounded-2xl pointer-events-auto">
          <div className="flex items-center gap-2 mb-2.5 text-primary font-mono text-[9px] uppercase tracking-[0.2em]">
            <Terminal size={12} className="animate-pulse" />
            LIVE_TELEMETRY
          </div>
          <div className="space-y-1.5">
            <div className="text-[9px] font-mono text-slate-200">
              ID: {realDrone?.id?.slice(0, 8) || '---'}
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              LAT: {realDrone?.current_lat?.toFixed(6) || '---'}
            </div>
            <div className="text-[9px] font-mono text-slate-400">
              LON: {realDrone?.current_lon?.toFixed(6) || '---'}
            </div>
            {logs.map((log, i) => (
              <div key={i} className="text-[9px] font-mono text-slate-500 italic">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* UI ОВЕРЛЕИ НА ОСНОВЕ СТАТУСА ЗАКАЗА */}

      {/* 1. Ждет борт */}
      {displayStatus === 'pending' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <Search className="w-5 h-5 text-yellow-500 animate-pulse" />
            <span className="text-sm font-mono text-white tracking-wide">Поиск борта для миссии...</span>
          </div>
        </div>
      )}

      {/* 2. Летит к точке А */}
      {displayStatus === 'to_pickup' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
            <Navigation className="w-5 h-5 text-purple-400 animate-pulse" />
            <span className="text-sm font-mono text-white tracking-wide">Борт в пути к отправителю...</span>
          </div>
        </div>
      )}

      {/* 3. Ожидание погрузки */}
      {displayStatus === 'loading' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-orange-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
            <Package className="w-5 h-5 text-orange-500 animate-bounce" />
            <span className="text-sm font-mono text-white tracking-wide">Погрузка: Ожидание разрешения на взлет</span>
          </div>
        </div>
      )}

      {/* 4. В полете */}
      {displayStatus === 'in_transit' && (
         <div className="absolute top-6 left-6 z-10">
            <div className="bg-primary/20 backdrop-blur-md border border-primary/50 px-4 py-2 rounded-full flex items-center gap-2">
               <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
               <span className="text-[10px] font-mono text-white uppercase tracking-tighter">Груз в пути к получателю</span>
            </div>
         </div>
      )}

      {/* 5. Прибыл (Ожидание PIN-кода) */}
      {displayStatus === 'arrived' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-slate-900 border border-primary/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center w-[22rem] text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <Key className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <h3 className="text-white text-lg font-bold mb-1">Борт ожидает клиента</h3>
            <p className="text-slate-400 text-sm mb-6">PIN-код для доступа к грузовому отсеку:</p>

            <div className="flex gap-3 mb-6">
              {orderState?.pin_code ? orderState.pin_code.split('').map((digit: string, index: number) => (
                <div 
                  key={index}
                  className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-mono font-bold bg-primary text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                >
                  {digit}
                </div>
              )) : (
                <div className="text-slate-500 font-mono text-sm">Код не сгенерирован</div>
              )}
            </div>

            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Система ждет ввода кода со стороны клиента
            </p>
          </div>
        </div>
      )}

      {/* 6. Успешно доставлен (Возврат) */}
      {displayStatus === 'delivered' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-green-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-sm font-mono text-white tracking-wide">Груз выдан. Борт возвращается.</span>
          </div>
        </div>
      )}

      {/* 7. Отменен */}
      {displayStatus === 'cancelled' && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-red-500/50 p-8 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.4)] flex flex-col items-center w-80 text-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
            <h3 className="text-white text-xl font-bold mb-2">Миссия прервана</h3>
            <p className="text-slate-400 text-xs">Заказ был отменен диспетчером</p>
          </div>
        </div>
      )}

      {/* Рамки */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/30 pointer-events-none rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 pointer-events-none rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/30 pointer-events-none rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/30 pointer-events-none rounded-br-lg" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function pointMarkerHtml(label: string, color: string, isHub: boolean = false): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:${isHub ? '32px' : '24px'};height:${isHub ? '32px' : '24px'};
        background:${color};
        border-radius: 4px;
        display:flex;align-items:center;justify-content:center;
        border: 2px solid #0f172a;
        box-shadow: 0 0 10px ${color}80;
      ">
        <span style="color:#080f1e;font-size:10px;font-weight:900;">${label}</span>
      </div>
    </div>
  `;
}