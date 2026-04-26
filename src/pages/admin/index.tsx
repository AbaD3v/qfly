import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, Battery, Crosshair, Navigation, Package,
  ShieldAlert, Terminal, Loader2, X, Settings2, Save, Eye
} from 'lucide-react';
import DispatcherPanel from '@/components/DispatcherPanel';

type Drone = {
  id: string; callsign: string; model: string;
  max_payload_kg: number; battery_level: number;
  status: 'idle' | 'on_mission' | 'charging' | 'maintenance' | 'waiting';
  max_radius_km: number; speed_multiplier: number; battery_drain: number;
};

type Order = {
  id: string; from_address: string; to_address: string;
  weight: number; status: string; created_at: string; drone_id?: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [drones, setDrones] = useState<Drone[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingDrone, setEditingDrone] = useState<Drone | null>(null);
  const [takeoffLoading, setTakeoffLoading] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted) return;
      
      if (!user) { 
        router.push('/auth/login'); 
        return; 
      }
      
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
      
      if (!isMounted) return;
      
      if (profile?.role !== 'admin') {
        router.push('/dashboard');
      } else {
        setIsAuthorized(true);
        fetchData();
      }
    }
    
    checkAuth();
    
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function fetchData() {
    const { data: dronesData } = await supabase.from('drones').select('*').order('callsign');
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      // ИЗМЕНЕНИЕ: Добавлен статус 'to_pickup', чтобы заказы не исчезали из ЦУПа
      .in('status', ['pending', 'to_pickup', 'loading', 'in_transit', 'arrived'])
      .order('created_at', { ascending: false });
    if (dronesData) setDrones(dronesData);
    if (ordersData) setOrders(ordersData);
    setLoading(false);
  }

  const handleSaveDroneSettings = async (updates: Partial<Drone>) => {
    if (!editingDrone) return;
    await supabase.from('drones').update(updates).eq('id', editingDrone.id);
    setEditingDrone(null);
    fetchData();
  };

  const handleTakeoff = async (order: Order) => {
    if (!order.drone_id) {
      alert('Ошибка: К заказу не привязан борт!');
      return;
    }
    setTakeoffLoading(order.id);
    try {
      await supabase
        .from('orders')
        .update({ status: 'in_transit' })
        .eq('id', order.id);
    } catch (err) {
      console.error('Ошибка при взлёте:', err);
      alert('Не удалось отправить сигнал на взлёт');
    }
    setTakeoffLoading(null);
  };

  const handleCancel = async (order: Order) => {
    if (!confirm(`Отменить заказ #${order.id.slice(0, 8)}?`)) return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
    if (order.drone_id) {
      await supabase.from('drones').update({ status: 'idle' }).eq('id', order.drone_id);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const channel = supabase.channel('admin-live-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drones' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthorized]);

  const stats = useMemo(() => ({
    activeMissions: drones.filter(d => d.status === 'on_mission' || d.status === 'waiting').length,
    avgBattery: drones.length > 0
      ? Math.round(drones.reduce((s, d) => s + d.battery_level, 0) / drones.length)
      : 0,
    pendingCount: orders.filter(o => o.status === 'pending').length,
  }), [drones, orders]);

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-primary/50 font-mono text-xs tracking-widest animate-pulse">УСТАНОВКА СВЯЗИ С СИСТЕМОЙ...</p>
      </div>
    );
  }

  return (
    <>
      <Head><title>ЦУП | Q'fly</title></Head>
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 pt-28 pb-10 px-6 md:px-10 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">

          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-8">
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
              <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                <Terminal className="w-10 h-10 text-primary" />
                УПРАВЛЕНИЕ ФЛОТОМ
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-2 text-green-500 font-mono text-[10px] uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Связь: Стабильна
                </span>
              </div>
            </motion.div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatTile label="В ВОЗДУХЕ" value={stats.activeMissions} icon={Navigation} color="text-primary" />
            <StatTile label="В ОЧЕРЕДИ" value={stats.pendingCount} icon={Package} color="text-yellow-500" />
            <StatTile label="ЗАРЯД ФЛОТА" value={`${stats.avgBattery}%`} icon={ZapIcon}
              color={stats.avgBattery < 30 ? 'text-red-500' : 'text-green-500'} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-5 h-5 text-primary" /> Очередь доставок
                </h2>
                <span className="text-[10px] font-mono text-slate-500">ЗАКАЗОВ: {orders.length}</span>
              </div>

              <div className="grid gap-4">
                <AnimatePresence mode="popLayout">
                  {orders.length === 0 && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-slate-600 font-mono text-sm text-center py-10">
                      Активных заказов нет
                    </motion.p>
                  )}
                  {orders.map(order => (
                    <motion.div layout key={order.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-6 hover:bg-slate-900/60 transition-all border-l-4 border-l-transparent hover:border-l-primary"
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">
                              #{order.id.slice(0, 8)}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-white font-medium">{order.from_address}</p>
                          <p className="text-slate-500 text-xs tracking-wide">→ {order.to_address}</p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end flex-wrap">
                          <div className="text-right">
                            <p className="text-[10px] text-slate-500 font-mono uppercase">Груз</p>
                            <p className="text-lg font-bold text-white">{order.weight}кг</p>
                          </div>

                          {order.status === 'pending' && (
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="bg-primary text-slate-950 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                            >
                              <Crosshair className="w-4 h-4" /> Назначить борт
                            </button>
                          )}

                          {order.status === 'loading' && (
                            <button
                              onClick={() => handleTakeoff(order)}
                              disabled={takeoffLoading === order.id}
                              className="bg-accent text-slate-950 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] flex items-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                              {takeoffLoading === order.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <Navigation className="w-4 h-4" />}
                              Разрешить взлёт
                            </button>
                          )}

                          {/* ИЗМЕНЕНИЕ: Отмена теперь доступна и во время полета к точке А (to_pickup) */}
                          {(order.status === 'pending' || order.status === 'to_pickup' || order.status === 'loading') && (
                            <button
                              onClick={() => handleCancel(order)}
                              className="p-2 text-slate-600 hover:text-accent transition-colors hover:bg-accent/10 rounded-lg"
                              title="Отменить заказ"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}

                          <Link href={`/order/${order.id}`}
                            className="p-2 text-slate-600 hover:text-primary transition-colors hover:bg-primary/10 rounded-lg"
                            title="Открыть страницу заказа">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4 uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-slate-400" /> Состояние флота
              </h2>
              <div className="space-y-3">
                {drones.map(drone => (
                  <div key={drone.id}
                    className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:border-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        {drone.callsign}
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          drone.status === 'idle' ? 'bg-green-500'
                          : drone.status === 'charging' ? 'bg-yellow-500 animate-pulse'
                          : drone.status === 'waiting' ? 'bg-blue-400 animate-pulse'
                          : 'bg-primary animate-pulse'
                        }`} />
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                        {drone.model} · {droneStatusLabel(drone.status)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-1.5 text-xs font-mono font-bold ${drone.battery_level < 20 ? 'text-red-500' : 'text-slate-300'}`}>
                        <Battery className={`w-4 h-4 ${drone.battery_level < 20 ? 'animate-bounce' : ''}`} />
                        {drone.battery_level}%
                      </div>
                      <button onClick={() => setEditingDrone(drone)}
                        className="p-2 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-lg"
                        title="Настроить параметры">
                        <Settings2 className="w-4 h-4" />
                      </button>
                      <Link href={`/admin/drones/${drone.id}`}
                        className="p-2 text-primary hover:text-white transition-colors hover:bg-primary/10 rounded-lg"
                        title="Телеметрия">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl">
              <button onClick={() => setSelectedOrder(null)}
                className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white bg-slate-900 rounded-full border border-white/10">
                <X />
              </button>
              <DispatcherPanel
                orderId={selectedOrder.id}
                orderWeight={selectedOrder.weight}
                onAssigned={() => { setSelectedOrder(null); fetchData(); }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingDrone && (
          <DroneSettingsModal
            drone={editingDrone}
            onClose={() => setEditingDrone(null)}
            onSave={handleSaveDroneSettings}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function droneStatusLabel(status: string) {
  const labels: Record<string, string> = {
    idle: 'свободен',
    on_mission: 'в полёте',
    charging: 'заряжается',
    maintenance: 'тех. обслуживание',
    waiting: 'ждёт получателя',
  };
  return labels[status] ?? status;
}

function DroneSettingsModal({ drone, onClose, onSave }: { drone: Drone; onClose: () => void; onSave: (d: Partial<Drone>) => void }) {
  const [radius, setRadius] = useState(drone.max_radius_km || 20);
  const [speed, setSpeed] = useState(drone.speed_multiplier || 1);
  const [drain, setDrain] = useState(drone.battery_drain || 1);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-3xl p-8 w-full max-w-md relative z-10">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X /></button>
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Settings2 className="w-6 h-6 text-primary" /> Настройки: {drone.callsign}
        </h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Макс. дальность (км)</label>
            <input type="number" value={radius} onChange={e => setRadius(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Скорость симуляции (множитель)</label>
            <input type="number" step="0.1" value={speed} onChange={e => setSpeed(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
            <p className="text-xs text-slate-500 mt-1">1.0 — стандарт, 2.0 — вдвое быстрее</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Расход батареи (% за тик)</label>
            <input type="number" step="0.5" value={drain} onChange={e => setDrain(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-primary outline-none transition-colors" />
          </div>
          <button onClick={() => onSave({ max_radius_km: radius, speed_multiplier: speed, battery_drain: drain })}
            className="w-full bg-primary text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors mt-8">
            <Save className="w-5 h-5" /> Сохранить параметры
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatTile({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] relative overflow-hidden shadow-2xl">
      <Icon className={`absolute -right-4 -bottom-4 w-24 h-24 opacity-5 ${color}`} />
      <p className="text-[10px] font-mono text-slate-500 tracking-[0.2em] mb-2 uppercase">{label}</p>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    to_pickup:  'bg-purple-500/10 text-purple-400 border-purple-500/30 animate-pulse', // ИЗМЕНЕНИЕ: Добавлен стиль для to_pickup
    loading:    'bg-orange-500/10 text-orange-500 border-orange-500/20',
    in_transit: 'bg-primary/20 text-primary border-primary/30 animate-pulse',
    arrived:    'bg-blue-500/10 text-blue-500 border-blue-500/20',
    delivered:  'bg-green-500/10 text-green-500 border-green-500/20',
    cancelled:  'bg-red-500/10 text-red-500 border-red-500/20',
  };
  const labels: Record<string, string> = {
    pending: 'ОЖИДАНИЕ', 
    to_pickup: 'В ПУТИ ЗА ГРУЗОМ', // ИЗМЕНЕНИЕ: Текст для to_pickup
    loading: 'ПОГРУЗКА', 
    in_transit: 'В ПОЛЁТЕ',
    arrived: 'ПРИБЫЛ', 
    delivered: 'ГОТОВО', 
    cancelled: 'ОТМЕНЁН',
  };
  return (
    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border uppercase tracking-widest ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ZapIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}