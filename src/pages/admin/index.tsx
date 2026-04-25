import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Battery, 
  Crosshair, 
  Navigation, 
  Package, 
  ShieldAlert, 
  Terminal,
  Loader2,
  X,
  ZapIcon
} from 'lucide-react';
import DispatcherPanel from '@/components/DispatcherPanel';

// Вспомогательная функция для расчета точки между А и Б
function interpolatePosition(startLat: number, startLon: number, endLat: number, endLon: number, fraction: number) {
  return {
    lat: startLat + (endLat - startLat) * fraction,
    lon: startLon + (endLon - startLon) * fraction
  };
}

// Типы остаются прежними...
type Drone = {
  id: string; callsign: string; model: string;
  max_payload_kg: number; battery_level: number;
  status: 'idle' | 'on_mission' | 'charging' | 'maintenance';
};
type Order = {
  id: string; from_address: string; to_address: string;
  weight: number; status: string; created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [drones, setDrones] = useState<Drone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // 1. ПРОВЕРКА РОЛИ ПРИ ЗАГРУЗКЕ
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        setIsAuthorized(true);
        fetchData();
      }
    }
    checkAuth();
  }, [router]);

  async function fetchData() {
    const { data: dronesData } = await supabase.from('drones').select('*').order('callsign');
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['pending', 'loading', 'in_transit', 'arrived'])
      .order('created_at', { ascending: false });

    if (dronesData) setDrones(dronesData);
    if (ordersData) setOrders(ordersData);
    setLoading(false);
  }

  // Запуск симуляции реального полета
  const handleTakeoff = async (order: Order) => {
    try {
      // 1. Получаем координаты заказа и ID назначенного дрона
      const { data: orderData } = await supabase
        .from('orders')
        .select('drone_id, from_lat, from_lon, to_lat, to_lon')
        .eq('id', order.id)
        .single();

      if (!orderData || !orderData.drone_id) {
        alert('Ошибка: К заказу не привязан борт!');
        return;
      }

      const droneId = orderData.drone_id;

      // 2. Получаем текущий заряд дрона
      const { data: droneData } = await supabase.from('drones').select('battery_level').eq('id', droneId).single();
      let currentBattery = droneData?.battery_level || 100;

      // 3. Даем команду на старт (меняем статусы в БД)
      await supabase.from('orders').update({ status: 'in_transit' }).eq('id', order.id);
      await supabase.from('drones').update({ status: 'on_mission' }).eq('id', droneId);
      
      // Сразу обновляем интерфейс диспетчера
      fetchData();

      // 4. ЗАПУСКАЕМ ДВИГАТЕЛИ (Симулятор телеметрии)
      const FLIGHT_TIME_MS = 20000; // Весь полет займет 20 секунд (для тестов)
      const TICK_RATE_MS = 2000;    // Отправляем данные каждые 2 секунды
      const totalTicks = FLIGHT_TIME_MS / TICK_RATE_MS;
      let currentTick = 0;

      const flightInterval = setInterval(async () => {
        currentTick++;
        const progress = currentTick / totalTicks; // Прогресс от 0 до 1

        // Высчитываем новую позицию на линии маршрута
        const newPos = interpolatePosition(
          orderData.from_lat, orderData.from_lon,
          orderData.to_lat, orderData.to_lon,
          progress
        );

        // Дрон тратит 1% заряда за каждый тик
        currentBattery = Math.max(0, currentBattery - 1);

        // ОТПРАВЛЯЕМ ТЕЛЕМЕТРИЮ В БАЗУ ДАННЫХ
        await supabase.from('drones').update({
          current_lat: newPos.lat,
          current_lon: newPos.lon,
          battery_level: currentBattery
        }).eq('id', droneId);

        // 5. ПОСАДКА (Прогресс 100%)
        if (progress >= 1) {
          clearInterval(flightInterval);
          await supabase.from('orders').update({ status: 'arrived' }).eq('id', order.id);
          await supabase.from('drones').update({ status: 'idle' }).eq('id', droneId);
          console.log(`[ЦУП]: Миссия ${order.id.slice(0,8)} успешно завершена. Борт сел.`);
          fetchData(); // Финальное обновление админки
        }
      }, TICK_RATE_MS);
    } catch (err) {
      console.error('Ошибка при запуске дрона:', err);
      alert('Не удалось отправить сигнал на взлет');
    }
  };

  // 2. REALTIME ПОДПИСКА (теперь обновляет всё мгновенно)
  useEffect(() => {
    if (!isAuthorized) return;

    const channel = supabase.channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drones' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthorized]);

  // Считаем статистику через useMemo, чтобы не лагало
  const stats = useMemo(() => ({
    activeMissions: drones.filter(d => d.status === 'on_mission').length,
    avgBattery: drones.length > 0 ? Math.round(drones.reduce((s, d) => s + d.battery_level, 0) / drones.length) : 0,
    pendingCount: orders.filter(o => o.status === 'pending').length,
  }), [drones, orders]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary/50 font-mono text-xs tracking-[0.3em] animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>ЦУП | Q'fly Admin</title></Head>

      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pt-28 pb-10 px-6 md:px-10 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-8">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                <Terminal className="w-10 h-10 text-primary" />
                FLEET_COMMAND
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-2 text-green-500 font-mono text-[10px] uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Satellite_Link: Stable
                </span>
                <span className="text-slate-600 font-mono text-[10px]">v2.4.0-build_88</span>
              </div>
            </motion.div>
          </header>

          {/* STATS TILES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatTile label="В ВОЗДУХЕ" value={stats.activeMissions} icon={Navigation} color="text-primary" glow="shadow-primary/10" />
            <StatTile label="ОЖИДАЮТ" value={stats.pendingCount} icon={Package} color="text-yellow-500" glow="shadow-yellow-500/10" />
            <StatTile label="ЗАРЯД ФЛОТА" value={`${stats.avgBattery}%`} icon={Zap} color={stats.avgBattery < 30 ? 'text-red-500' : 'text-green-500'} glow="shadow-current/10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ORDERS COLUMN */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-5 h-5 text-primary" /> Очередь миссий
                </h2>
                <span className="text-[10px] font-mono text-slate-500">{orders.length} ACTIVE_TASKS</span>
              </div>
              
              <div className="grid gap-4">
                <AnimatePresence mode='popLayout'>
                  {orders.map(order => (
                    <motion.div
                      layout
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-slate-900/60 transition-all border-l-4 border-l-transparent hover:border-l-primary"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">#{order.id.slice(0, 8)}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-white font-medium">{order.from_address}</p>
                          <p className="text-slate-500 text-xs italic tracking-wide">Destination: {order.to_address}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-mono uppercase">Груз</p>
                            <p className="text-lg font-bold text-white">{order.weight}кг</p>
                          </div>
                          {order.status === 'pending' && (
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="bg-primary text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                              <Crosshair className="w-4 h-4" /> Назначить
                            </button>
                          )}
                          {order.status === 'loading' && (
                            <button 
                              onClick={() => handleTakeoff(order)}
                              className="bg-accent text-slate-950 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center gap-2 animate-pulse"
                            >
                              <Navigation className="w-4 h-4" /> Разрешить взлет
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* DRONES COLUMN */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4 uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-slate-400" /> Мониторинг флота
              </h2>
              <div className="space-y-3">
                {drones.map(drone => (
                  <div key={drone.id} className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {drone.callsign}
                        <span className={`w-1.5 h-1.5 rounded-full ${drone.status === 'idle' ? 'bg-green-500' : 'bg-primary animate-pulse'}`} />
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{drone.model}</p>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-mono font-bold ${drone.battery_level < 20 ? 'text-red-500' : 'text-slate-300'}`}>
                      <Battery className={`w-4 h-4 ${drone.battery_level < 20 ? 'animate-bounce' : ''}`} />
                      {drone.battery_level}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DISPATCHER MODAL */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl">
              <button onClick={() => setSelectedOrder(null)} className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full border border-white/10"><X /></button>
              <DispatcherPanel orderId={selectedOrder.id} orderWeight={selectedOrder.weight} onAssigned={() => { setSelectedOrder(null); fetchData(); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
function StatTile({ label, value, icon: Icon, color, glow }: any) {
  return (
    <div className={`bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden shadow-2xl ${glow}`}>
      <Icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 ${color}`} />
      <p className="text-[10px] font-mono text-slate-500 tracking-[0.2em] mb-2 uppercase">{label}</p>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    loading: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    in_transit: 'bg-primary/20 text-primary border-primary/30 animate-pulse',
    arrived: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    delivered: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  const labels: any = {
    pending: 'ОЖИДАНИЕ',
    loading: 'ПОГРУЗКА',
    in_transit: 'В ПОЛЕТЕ',
    arrived: 'ПРИБЫЛ',
    delivered: 'ГОТОВО',
  };

  return (
    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest transition-all ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  );
}

// Иконка молнии для статистики
function Zap(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  );
}