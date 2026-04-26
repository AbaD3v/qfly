import { useEffect, useRef, useState, useCallback } from 'react';
import { load } from '@2gis/mapgl';
import { supabase } from '@/lib/supabase';
import { Terminal, Battery, Loader2, Search, Package, CheckCircle2, XCircle, Navigation } from 'lucide-react';

interface DeliveryMapProps {
  orderId?: string;
  staticStart?: [number, number];
  staticEnd?: [number, number];
}

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DeliveryMap({ orderId, staticStart, staticEnd }: DeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const mapglRef = useRef<any>(null);
  const droneMarker = useRef<any>(null);
  const routeLineRef = useRef<any>(null);

  // Для подсчёта прогресса на основе реальных координат
  const droneIdRef = useRef<string | null>(null);
  const prevPosRef = useRef<[number, number] | null>(null);
  const totalDistRef = useRef<number>(0);
  const travelledRef = useRef<number>(0);

  const [logs, setLogs] = useState<string[]>([]);
  const [telemetry, setTelemetry] = useState({ alt: 0, speed: 0, battery: 100, progress: 0 });
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [isFlying, setIsFlying] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('pending');
  const [correctPin, setCorrectPin] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    setLogs(prev => [...prev.slice(-4), `[${timestamp}] ${message}`]);
  }, []);

  // Двигаем маркер дрона по данным из БД — никакой локальной анимации
  const updateDronePosition = useCallback((lon: number, lat: number, battery?: number) => {
    if (droneMarker.current) {
      droneMarker.current.setCoordinates([lon, lat]);
    }
    if (mapInstance.current) {
      // Плавный сдвиг камеры к новой позиции (движок пишет каждые 2с)
      mapInstance.current.setCenter([lon, lat], { duration: 1800 });
    }

    // Считаем пройденное расстояние для прогресс-бара
    if (prevPosRef.current) {
      const step = haversineKm(prevPosRef.current[0], prevPosRef.current[1], lon, lat);
      travelledRef.current += step;
    }
    prevPosRef.current = [lon, lat];

    const progress = totalDistRef.current > 0
      ? Math.min(100, Math.round((travelledRef.current / totalDistRef.current) * 100))
      : 0;

    setTelemetry(prev => ({
      battery: battery ?? prev.battery,
      progress,
      alt: Math.round(Math.sin((progress / 100) * Math.PI) * 150),
      speed: progress > 5 && progress < 95
        ? Math.round(60 + (Math.random() - 0.5) * 6)
        : Math.round(30 * (progress < 5 ? progress / 5 : (100 - progress) / 5)),
    }));
  }, []);

  const handleStatusChange = useCallback((status: string, data: any) => {
    setCurrentStatus(status);
    
    if (status === 'pending') {
      addLog('СИСТЕМА: ПОИСК СВОБОДНОГО ДРОНА...');
    }
    if (status === 'to_pickup') {
      addLog('СТАТУС: ДРОН НАЗНАЧЕН. СЛЕДУЕТ К МЕСТУ ПОГРУЗКИ...');
    }
    if (status === 'loading') {
      addLog('СТАТУС: ПОГРУЗКА БОРТА НА БАЗЕ');
    }
    if (status === 'in_transit') {
      addLog('ВЗЛЁТ: ДРОН В ВОЗДУХЕ. СЛЕЖЕНИЕ АКТИВНО');
      setIsFlying(true);
      travelledRef.current = 0;
      prevPosRef.current = null;
      if (data.from_lon && data.to_lon) {
        totalDistRef.current = haversineKm(data.from_lon, data.from_lat, data.to_lon, data.to_lat);
      }
    }
    if (status === 'arrived') {
      addLog('СТАТУС: ДРОН ПРИБЫЛ. ОЖИДАЕТСЯ ИЗЪЯТИЕ ГРУЗА');
      setIsFlying(false);
      setTelemetry(prev => ({ ...prev, speed: 0, alt: 0, progress: 100 }));
      if (droneMarker.current && data.to_lon) {
        droneMarker.current.setCoordinates([data.to_lon, data.to_lat]);
      }
    }
    if (status === 'delivered') {
      addLog('МИССИЯ ЗАВЕРШЕНА. ГРУЗ ПЕРЕДАН');
      routeLineRef.current?.destroy();
      setIsFlying(false);
    }
    if (status === 'cancelled') {
      addLog('КРИТИЧЕСКАЯ ОШИБКА: МИССИЯ ПРЕРВАНА');
      setIsFlying(false);
    }
  }, [addLog]);

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    setIsUnlocking(true);
    setPinError(false);
    await new Promise(r => setTimeout(r, 800));
    
    if (pinInput === correctPin) {
      addLog('СИСТЕМА: PIN ПРИНЯТ. ОТКРЫТИЕ ЗАМКА...');
      const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
      if (error) { 
        addLog('ОШИБКА: СБОЙ СВЯЗИ'); 
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
    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    let droneChannel: ReturnType<typeof supabase.channel> | null = null;

    // Подписка на позицию дрона — отдельный канал, пересоздаётся при смене дрона
    const subscribeToDrone = (droneId: string) => {
      if (droneChannel) supabase.removeChannel(droneChannel);
      droneChannel = supabase
        .channel(`drone-pos-${droneId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'drones',
          filter: `id=eq.${droneId}`,
        }, (payload) => {
          if (destroyed) return;
          const { current_lon, current_lat, battery } = payload.new;
          if (current_lon && current_lat) {
            updateDronePosition(current_lon, current_lat, battery);
          }
        })
        .subscribe();
    };

    const initSystem = async () => {
      try {
        const mapgl = await load();
        if (destroyed || !mapContainerRef.current) return;
        mapglRef.current = mapgl;

        const center = staticStart ?? [71.446, 51.1801];
        mapInstance.current = new mapgl.Map(mapContainerRef.current, {
          center, zoom: 14, pitch: 45,
          key: process.env.NEXT_PUBLIC_2GIS_API_KEY as string,
          style: 'c080bb6a-8134-4993-93d0-3e9e1f1f1311',
        });

        droneMarker.current = new mapgl.HtmlMarker(mapInstance.current, {
          coordinates: center,
          html: `<div class="drone-glow"></div>`,
        });

        if (staticStart) {
          new mapgl.HtmlMarker(mapInstance.current, {
            coordinates: staticStart, html: pointMarkerHtml('А', '#38bdf8'), anchor: [0.5, 1],
          });
        }
        if (staticEnd) {
          new mapgl.HtmlMarker(mapInstance.current, {
            coordinates: staticEnd, html: pointMarkerHtml('Б', '#f43f5e'), anchor: [0.5, 1],
          });
        }
        if (staticStart && staticEnd) {
          routeLineRef.current = new mapgl.Polyline(mapInstance.current, {
            coordinates: [staticStart, staticEnd],
            color: '#38bdf825', width: 1.5, dashLength: 4, gapLength: 8,
          });
          mapInstance.current.fitBounds(
            {
              northEast: [Math.max(staticStart[0], staticEnd[0]), Math.max(staticStart[1], staticEnd[1])],
              southWest: [Math.min(staticStart[0], staticEnd[0]), Math.min(staticStart[1], staticEnd[1])],
            },
            { padding: 80, duration: 800 }
          );
        }

        setIsMapLoading(false);

        if (!orderId) { addLog('СИСТЕМА МОНИТОРИНГА: ОЖИДАНИЕ СИГНАЛА...'); return; }

        // Загружаем текущий заказ из БД
        const { data: order } = await supabase
          .from('orders')
          .select('status, from_lon, from_lat, to_lon, to_lat, pin_code, drone_id')
          .eq('id', orderId)
          .single();

        if (!order || destroyed) return;
        setCorrectPin(order.pin_code);
        handleStatusChange(order.status, order);

        // Если дрон уже назначен — ставим его позицию и подписываемся
        if (order.drone_id) {
          droneIdRef.current = order.drone_id;
          const { data: drone } = await supabase
            .from('drones')
            .select('current_lon, current_lat, battery')
            .eq('id', order.drone_id)
            .single();
          if (drone && !destroyed) {
            droneMarker.current?.setCoordinates([drone.current_lon, drone.current_lat]);
            setTelemetry(prev => ({ ...prev, battery: drone.battery ?? 100 }));
          }
          subscribeToDrone(order.drone_id);
        }

        // Подписка на изменения самого заказа (статус, drone_id)
        orderChannel = supabase
          .channel(`order-status-${orderId}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}`,
          }, (payload) => {
            if (destroyed) return;
            const d = payload.new;
            if (d.pin_code) setCorrectPin(d.pin_code);
            handleStatusChange(d.status, d);
            // Дрон только что назначен движком — начинаем следить за ним
            if (d.drone_id && d.drone_id !== droneIdRef.current) {
              droneIdRef.current = d.drone_id;
              subscribeToDrone(d.drone_id);
            }
          })
          .subscribe();

      } catch (err) {
        console.error('Ошибка инициализации карты:', err);
      }
    };

    initSystem();

    return () => {
      destroyed = true;
      routeLineRef.current?.destroy();
      mapInstance.current?.destroy();
      mapInstance.current = null;
      mapglRef.current = null;
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (droneChannel) supabase.removeChannel(droneChannel);
    };
  }, [orderId, staticStart, staticEnd, handleStatusChange, updateDronePosition, addLog]);

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

      {/* Прогресс (только в полете) */}
      {isFlying && (
        <div className="absolute top-6 left-6 right-44 z-10">
          <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-xl">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-mono text-primary uppercase tracking-widest animate-pulse">В ПОЛЁТЕ</span>
              <span className="text-[9px] font-mono text-slate-400">{telemetry.progress}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                style={{ width: `${telemetry.progress}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Консоль */}
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

      {/* Статус: pending */}
      {currentStatus === 'pending' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-primary/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Search className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-sm font-mono text-white tracking-wide">Поиск свободного дрона...</span>
          </div>
        </div>
      )}

      {/* Статус: to_pickup */}
      {currentStatus === 'to_pickup' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Navigation className="w-5 h-5 text-indigo-400 animate-pulse" />
            <span className="text-sm font-mono text-white tracking-wide">Дрон направляется к месту погрузки...</span>
          </div>
        </div>
      )}

      {/* Статус: loading */}
      {currentStatus === 'loading' && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-900/80 backdrop-blur-md border border-yellow-500/30 px-6 py-3 rounded-full flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.15)]">
            <Package className="w-5 h-5 text-yellow-500 animate-bounce" />
            <span className="text-sm font-mono text-white tracking-wide">Загрузка посылки в дрон...</span>
          </div>
        </div>
      )}

      {/* Статус: arrived — PIN ввод */}
      {currentStatus === 'arrived' && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-slate-900 border border-primary/30 p-8 rounded-3xl shadow-2xl flex flex-col items-center w-80 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 border border-primary/20">
              <span className="text-primary animate-pulse text-2xl">📦</span>
            </div>
            <h3 className="text-white text-lg font-bold mb-1">Груз прибыл</h3>
            <p className="text-slate-400 text-sm mb-6">Введите 4-значный код из вашего приложения.</p>
            <div className="flex gap-3 mb-6 relative">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className={`w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-mono font-bold
                  ${pinInput[index] ? 'bg-primary text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.5)]' : 'bg-slate-800 text-slate-500 border border-white/5'}
                  ${pinError ? 'border-red-500 bg-red-500/10 text-red-500' : ''}`}>
                  {pinInput[index] || '•'}
                </div>
              ))}
              <input type="text" inputMode="numeric" maxLength={4} value={pinInput}
                onChange={(e) => { setPinError(false); setPinInput(e.target.value.replace(/\D/g, '')); }}
                className="absolute inset-0 opacity-0 cursor-text w-full h-full" />
            </div>
            <button onClick={handlePinSubmit} disabled={pinInput.length !== 4 || isUnlocking}
              className={`w-full py-3 rounded-xl font-bold uppercase tracking-wider transition-all
                ${pinInput.length === 4 && !isUnlocking
                  ? 'bg-primary text-slate-950 hover:bg-primary/90 shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
              {isUnlocking ? <Loader2 className="w-5 h-5 mx-auto animate-spin" /> : 'Разблокировать'}
            </button>
            {pinError && <span className="text-red-400 text-xs mt-3 animate-pulse">Доступ запрещен.</span>}
          </div>
        </div>
      )}

      {/* Статус: delivered */}
      {currentStatus === 'delivered' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-green-500/30 p-8 rounded-3xl shadow-[0_0_40px_rgba(34,197,94,0.2)] flex flex-col items-center w-80 text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Груз доставлен!</h3>
            <p className="text-slate-400 text-sm">Спасибо, что пользуетесь нашей системой доставки.</p>
          </div>
        </div>
      )}

      {/* Статус: cancelled */}
      {currentStatus === 'cancelled' && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 border border-red-500/50 p-8 rounded-3xl flex flex-col items-center w-80 text-center">
            <XCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
            <h3 className="text-white text-xl font-bold mb-2">Миссия прервана</h3>
            <p className="text-slate-400 text-sm">Свяжитесь со службой поддержки.</p>
          </div>
        </div>
      )}

      {/* Уголки */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/30 pointer-events-none rounded-tl-lg" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 pointer-events-none rounded-tr-lg" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/30 pointer-events-none rounded-bl-lg" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/30 pointer-events-none rounded-br-lg" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.4)]" />
    </div>
  );
}

function pointMarkerHtml(label: string, color: string): string {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${color};box-shadow:0 0 12px ${color}80;
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);color:#080f1e;font-size:10px;font-weight:900;font-family:monospace;">${label}</span>
      </div>
      <div style="width:2px;height:5px;background:${color};opacity:0.4;"></div>
    </div>
  `
}