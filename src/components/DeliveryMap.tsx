import { useEffect, useRef, useState, useCallback } from 'react';
import { load } from '@2gis/mapgl';
import { supabase } from '@/lib/supabase';
import { Terminal, Battery, Loader2, Search, Package, CheckCircle2, XCircle } from 'lucide-react';

interface DeliveryMapProps {
  orderId?: string;
  staticStart?: [number, number];
  staticEnd?: [number, number];
}

// Реалистичные параметры дрона
const DRONE_SPEED_KMH = 60          // крейсерская скорость км/ч
const FRAME_INTERVAL_MS = 100       // обновление позиции каждые 100мс
const MIN_FLIGHT_MS = 30_000        // минимум 30 секунд (для коротких маршрутов)
const MAX_FLIGHT_MS = 10 * 60_000   // максимум 10 минут

// Haversine — прямое расстояние между двумя точками в км
function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Считаем реалистичное время полёта в мс
function calcFlightDurationMs(start: [number, number], end: [number, number]): number {
  const distKm = haversineKm(start[0], start[1], end[0], end[1]);
  const rawMs = (distKm / DRONE_SPEED_KMH) * 3600 * 1000;
  return Math.min(MAX_FLIGHT_MS, Math.max(MIN_FLIGHT_MS, rawMs));
}

export default function DeliveryMap({ orderId, staticStart, staticEnd }: DeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const droneMarker = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const animFrameRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const flightDurationRef = useRef<number>(MIN_FLIGHT_MS);

  const [logs, setLogs] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({ alt: 0, speed: 0, battery: 100, progress: 0 });
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isFlying, setIsFlying] = useState(false);

  // Стейты для жизненного цикла заказа и PIN-кода
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [correctPin, setCorrectPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  }, []);

const animateFlight = useCallback((
    start: [number, number],
    end: [number, number],
    mapgl: any
  ) => {
    if (animFrameRef.current) clearInterval(animFrameRef.current);

    const durationMs = calcFlightDurationMs(start, end);
    flightDurationRef.current = durationMs;
    startTimeRef.current = Date.now();
    setIsFlying(true);

    const distKm = haversineKm(start[0], start[1], end[0], end[1]);
    const etaMin = Math.round(durationMs / 60000);

    addLog(`ВЗЛЁТ: ${distKm.toFixed(2)} КМ — ETA ${etaMin} МИН`);

    if (routeLineRef.current) routeLineRef.current.destroy();
    if (staticStart && staticEnd) {
      routeLineRef.current = new mapgl.Polyline(mapInstance.current, {
        coordinates: [staticStart, staticEnd],
        color: '#38bdf840',
        width: 1.5,
        dashLength: 4,
        gapLength: 8,
      });
    }

    // Делаем коллбэк асинхронным, чтобы можно было использовать await
    animFrameRef.current = setInterval(async () => {
      const elapsed = Date.now() - (startTimeRef.current ?? Date.now());
      const f = Math.min(elapsed / durationMs, 1);

      const eased = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;

      const curLon = start[0] + (end[0] - start[0]) * eased;
      const curLat = start[1] + (end[1] - start[1]) * eased;

      const altM = Math.round(Math.sin(f * Math.PI) * 150);
      const speed = f < 0.05 || f > 0.95
        ? Math.round(DRONE_SPEED_KMH * f * 20)
        : Math.round(DRONE_SPEED_KMH + (Math.random() - 0.5) * 6);
      const battery = Math.round(100 - f * 25);
      const progress = Math.round(f * 100);

      if (droneMarker.current) droneMarker.current.setCoordinates([curLon, curLat]);
      if (mapInstance.current) mapInstance.current.setCenter([curLon, curLat], { duration: FRAME_INTERVAL_MS });

      setTelemetry({ alt: altM, speed, battery, progress });

      // Когда дрон прилетел (прогресс 100%)
      if (f >= 1) {
        clearInterval(animFrameRef.current!);
        animFrameRef.current = null;
        setTelemetry(prev => ({ ...prev, speed: 0, alt: 0, progress: 100 }));
        
        // 1. Сообщаем в лог, что садимся
        addLog('СИСТЕМА: ПОСАДКА. СИНХРОНИЗАЦИЯ С БАЗОЙ...');

        // 2. АВТОМАТИЧЕСКИ обновляем статус в Supabase на 'arrived'
        if (orderId) {
          const { error } = await supabase
            .from('orders')
            .update({ status: 'arrived' })
            .eq('id', orderId);
            
          if (error) {
            addLog('ОШИБКА: СБОЙ СИНХРОНИЗАЦИИ САТУСА');
            setIsFlying(false); // Выключаем полет вручную на случай ошибки
          }
          // Если ошибки нет, Realtime-подписка сама переключит всё остальное!
        }
      }
    }, FRAME_INTERVAL_MS);

    // ВАЖНО: Добавляем orderId в массив зависимостей хука useCallback
  }, [addLog, staticStart, staticEnd, orderId]);

  // Обработка отправки PIN-кода
  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    
    setIsUnlocking(true);
    setPinError(false);

    // Имитация небольшой задержки для реалистичности
    await new Promise(resolve => setTimeout(resolve, 800));

    if (pinInput === correctPin) {
      addLog('СИСТЕМА: PIN ПРИНЯТ. ОТКРЫТИЕ ЗАМКА...');
      
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);
        
      if (error) {
        addLog('ОШИБКА: СБОЙ СВЯЗИ С БАЗОЙ ДАННЫХ');
        setPinError(true);
      }
    } else {
      addLog('ОШИБКА: НЕВЕРНЫЙ PIN-КОД');
      setPinError(true);
      setPinInput('');
    }
    setIsUnlocking(false);
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    let destroyed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const handleStatusChange = (status: string, data: any, mapgl: any) => {
      setCurrentStatus(status);

      if (status === 'pending') {
        addLog('СИСТЕМА: ПОИСК СВОБОДНОГО ДРОНА...');
      } 
      else if (status === 'loading') {
        addLog('СТАТУС: ПОГРУЗКА БОРТА НА БАЗЕ');
        if (droneMarker.current && data.from_lon && data.from_lat) {
          droneMarker.current.setCoordinates([data.from_lon, data.from_lat]);
        }
      } 
      else if (status === 'in_transit') {
        const start: [number, number] = [data.from_lon, data.from_lat];
        const end: [number, number] = [data.to_lon, data.to_lat];
        animateFlight(start, end, mapgl);
      } 
      else if (status === 'arrived') {
        addLog('СТАТУС: ДРОН ПРИБЫЛ. ОЖИДАЕТСЯ ИЗЪЯТИЕ ГРУЗА');
        if (animFrameRef.current) clearInterval(animFrameRef.current);
        setIsFlying(false);
        if (droneMarker.current && data.to_lon && data.to_lat) {
          droneMarker.current.setCoordinates([data.to_lon, data.to_lat]);
        }
      } 
      else if (status === 'delivered') {
        addLog('МИССИЯ ЗАВЕРШЕНА. ГРУЗ ПЕРЕДАН');
        routeLineRef.current?.destroy();
        setIsFlying(false);
      } 
      else if (status === 'cancelled') {
        addLog('КРИТИЧЕСКАЯ ОШИБКА: МИССИЯ ПРЕРВАНА');
        if (animFrameRef.current) clearInterval(animFrameRef.current);
        setIsFlying(false);
      }
    };

    const initSystem = async () => {
      try {
        const mapgl = await load();
        if (destroyed || !mapContainerRef.current) return;

        mapglRef.current = mapgl;
        const center = staticStart ?? [71.446, 51.1801];

        mapInstance.current = new mapgl.Map(mapContainerRef.current, {
          center,
          zoom: 14,
          pitch: 45,
          key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
          style: 'c080bb6a-8134-4993-93d0-3e9e1f1f1311',
        });

        droneMarker.current = new mapgl.HtmlMarker(mapInstance.current, {
          coordinates: center,
          html: `<div class="drone-glow"></div>`,
        });

        if (staticStart) {
          new mapgl.HtmlMarker(mapInstance.current, {
            coordinates: staticStart,
            html: pointMarkerHtml('А', '#38bdf8'),
            anchor: [0.5, 1],
          });
        }
        if (staticEnd) {
          new mapgl.HtmlMarker(mapInstance.current, {
            coordinates: staticEnd,
            html: pointMarkerHtml('Б', '#f43f5e'),
            anchor: [0.5, 1],
          });
        }

        if (staticStart && staticEnd) {
          routeLineRef.current = new mapgl.Polyline(mapInstance.current, {
            coordinates: [staticStart, staticEnd],
            color: '#38bdf840',
            width: 1.5,
            dashLength: 4,
            gapLength: 8,
          });

          const minLon = Math.min(staticStart[0], staticEnd[0]);
          const maxLon = Math.max(staticStart[0], staticEnd[0]);
          const minLat = Math.min(staticStart[1], staticEnd[1]);
          const maxLat = Math.max(staticStart[1], staticEnd[1]);
          mapInstance.current.fitBounds(
            { northEast: [maxLon, maxLat], southWest: [minLon, minLat] },
            { padding: 80, duration: 800 }
          );
        }

        setIsMapLoading(false);

        if (orderId) {
          const { data: order, error } = await supabase
            .from('orders')
            .select('status, from_lon, from_lat, to_lon, to_lat, pin_code')
            .eq('id', orderId)
            .single();

          if (order && !destroyed) {
            setCorrectPin(order.pin_code);
            handleStatusChange(order.status, order, mapgl);
          }
        } else {
          addLog('СИСТЕМА МОНИТОРИНГА: ОЖИДАНИЕ СИГНАЛА...');
        }

      } catch (err) {
        console.error("Ошибка инициализации карты:", err);
      }
    };

    initSystem();

    if (orderId) {
      channel = supabase
        .channel(`tracking-${orderId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        }, (payload) => {
          const mapgl = mapglRef.current;
          if (!mapgl) return;
          
          if (payload.new.pin_code) setCorrectPin(payload.new.pin_code);
          handleStatusChange(payload.new.status, payload.new, mapgl);
        })
        .subscribe();
    }

    return () => {
      destroyed = true;
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      routeLineRef.current?.destroy();
      mapInstance.current?.destroy();
      mapInstance.current = null;
      mapglRef.current = null;
      if (channel) supabase.removeChannel(channel);
    };
  }, [orderId, staticStart, staticEnd, animateFlight, addLog]);

  return (
    <div className="relative w-full h-[500px] bg-slate-950 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">

      <div ref={mapContainerRef} className="w-full h-full opacity-90" />

      {isMapLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-50">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Телеметрия */}
      <div className="absolute top-6 right-6 z-10">
        <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-slate-500 uppercase font-mono tracking-widest">ALT</span>
            <span className="text-sm font-mono font-bold text-white">{telemetry.alt}m</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col items-center">
            <span className="text-[8px] text-slate-500 uppercase font-mono tracking-widest">SPD</span>
            <span className="text-sm font-mono font-bold text-white">{telemetry.speed}km/h</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex items-center gap-1.5">
            <Battery size={14} className={telemetry.battery < 20 ? 'text-accent animate-pulse' : 'text-primary'} />
            <span className="text-sm font-mono font-bold text-white">{telemetry.battery}%</span>
          </div>
        </div>
      </div>

      {/* Прогресс-бар полёта */}
      {isFlying && (
        <div className="absolute top-6 left-6 right-32 z-10 mr-6">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-primary uppercase tracking-widest animate-pulse">В ПОЛЁТЕ</span>
              <span className="text-[9px] font-mono text-slate-400">{telemetry.progress}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                style={{ width: `${telemetry.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Консоль логов */}
      <div className="absolute bottom-6 left-6 z-10 w-72">
        <div className="bg-black/60 backdrop-blur-xl border border-primary/20 p-4 rounded-2xl">
          <div className="flex items-center gap-2 mb-2.5 text-primary font-mono text-[9px] uppercase tracking-[0.2em]">
            <Terminal size={12} className="animate-pulse" />
            System_Link_Active
          </div>
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div key={i} className={`text-[9px] font-mono leading-tight flex items-start gap-2 ${i === logs.length - 1 ? 'text-slate-200' : 'text-slate-500'}`}>
                <span className="text-primary/40 shrink-0">#</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- ИНТЕРФЕЙС НАБЛЮДАТЕЛЯ (UI ОВЕРЛЕИ) --- */}

      {currentStatus === 'pending' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-primary/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Search className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-mono text-white tracking-wide">Поиск свободного дрона...</span>
          </div>
        </div>
      )}

      {currentStatus === 'loading' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <Package className="w-5 h-5 text-yellow-500 animate-bounce" />
            <span className="text-sm font-mono text-white tracking-wide">Загрузка посылки в дрон...</span>
          </div>
        </div>
      )}

      {currentStatus === 'arrived' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-slate-900 border border-primary/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center w-80 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <span className="text-primary animate-pulse text-2xl">📦</span>
            </div>
            <h3 className="text-white text-lg font-bold mb-1">Груз прибыл</h3>
            <p className="text-slate-400 text-sm mb-6">Введите 4-значный код из вашего приложения для открытия отсека.</p>

            <div className="flex gap-3 mb-6 relative">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-mono font-bold
                    ${pinInput[index] ? 'bg-primary text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-slate-800 text-slate-500 border border-white/5'}
                    ${pinError ? 'border-red-500 bg-red-500/10 text-red-500' : ''}
                  `}
                >
                  {pinInput[index] || '•'}
                </div>
              ))}
              
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={pinInput}
                onChange={(e) => {
                  setPinError(false);
                  setPinInput(e.target.value.replace(/\D/g, ''));
                }}
                className="absolute inset-0 opacity-0 cursor-text w-full h-full"
              />
            </div>

            <button
              onClick={handlePinSubmit}
              disabled={pinInput.length !== 4 || isUnlocking}
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all
                ${pinInput.length === 4 && !isUnlocking
                  ? 'bg-primary text-slate-950 hover:bg-primary/90 shadow-[0_0_20px_rgba(56,189,248,0.4)]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}
              `}
            >
              {isUnlocking ? (
                <Loader2 className="w-5 h-5 mx-auto animate-spin" />
              ) : (
                'Разблокировать'
              )}
            </button>
            
            {pinError && (
              <span className="text-red-400 text-xs mt-3 animate-pulse">Доступ запрещен. Попробуйте еще раз.</span>
            )}
          </div>
        </div>
      )}

      {currentStatus === 'delivered' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-green-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(34,197,94,0.2)] flex flex-col items-center w-80 text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Груз доставлен!</h3>
            <p className="text-slate-400 text-sm">Спасибо, что пользуетесь нашей системой доставки.</p>
          </div>
        </div>
      )}

      {currentStatus === 'cancelled' && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-red-500/50 p-8 rounded-3xl shadow-[0_0_40px_rgba(239,68,68,0.4)] flex flex-col items-center w-80 text-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
            <h3 className="text-white text-xl font-bold mb-2">Миссия прервана</h3>
            <p className="text-slate-400 text-sm">Полет отменен. Свяжитесь со службой поддержки для уточнения деталей.</p>
          </div>
        </div>
      )}

      {/* Уголки видоискателя */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/30 pointer-events-none rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 pointer-events-none rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/30 pointer-events-none rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/30 pointer-events-none rounded-br-lg" />

      {/* Виньетка */}
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function pointMarkerHtml(label: string, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        width:26px;height:26px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        background:${color};
        box-shadow:0 0 12px ${color}80;
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);color:#080f1e;font-size:10px;font-weight:900;font-family:monospace;">${label}</span>
      </div>
      <div style="width:2px;height:5px;background:${color};opacity:0.4;"></div>
    </div>
  `
}