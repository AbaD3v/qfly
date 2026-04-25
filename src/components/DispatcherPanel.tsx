import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Crosshair, Battery, Weight, Loader2, Send, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

// Тип дрона, соответствующий нашей таблице в БД
type Drone = {
  id: string;
  callsign: string;
  model: string;
  max_payload_kg: number;
  battery_level: number;
  status: string;
};

interface DispatcherPanelProps {
  orderId: string;
  orderWeight: number;
  onAssigned: () => void; // Коллбэк, чтобы закрыть панель после назначения
}

export default function DispatcherPanel({ orderId, orderWeight, onAssigned }: DispatcherPanelProps) {
  const [drones, setDrones] = useState<Drone[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    // Подтягиваем только свободные дроны, сортируем по заряду батареи
    const fetchDrones = async () => {
      const { data, error } = await supabase
        .from('drones')
        .select('*')
        .eq('status', 'idle')
        .order('battery_level', { ascending: false });

      if (!error && data) {
        setDrones(data);
      }
      setLoading(false);
    };

    fetchDrones();
  }, []);

  const handleAssign = async (drone: Drone) => {
    setAssigningId(drone.id);

    try {
      // 1. Привязываем дрон к заказу и меняем статус заказа на 'loading'
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          drone_id: drone.id,
          status: 'loading' 
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Обновляем статус самого дрона, чтобы его не заняли другие
      const { error: droneError } = await supabase
        .from('drones')
        .update({ status: 'on_mission' })
        .eq('id', drone.id);

      if (droneError) throw droneError;

      // Вызываем коллбэк успешного назначения
      onAssigned();

    } catch (err) {
      console.error('Ошибка назначения борта:', err);
      alert('Ошибка синхронизации с базой данных!');
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-white/10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/90 backdrop-blur-xl border border-primary/30 rounded-3xl p-6 shadow-[0_0_30px_rgba(56,189,248,0.15)] relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-white font-bold tracking-widest flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-primary" />
            ТЕРМИНАЛ ДИСПЕТЧЕРА
          </h3>
          <p className="text-slate-400 text-xs font-mono mt-1">ВЫБЕРИТЕ БОРТ ДЛЯ НАЗНАЧЕНИЯ НА МИССИЮ</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 font-mono tracking-widest">МАССА ГРУЗА</p>
          <p className="text-xl font-black text-white">{orderWeight} <span className="text-sm font-normal text-slate-500">КГ</span></p>
        </div>
      </div>

      {drones.length === 0 ? (
        <div className="text-center p-6 border border-dashed border-red-500/30 rounded-2xl bg-red-500/5">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2 opacity-80" />
          <p className="text-red-400 font-mono text-sm">СВОБОДНЫЕ БОРТЫ ОТСУТСТВУЮТ</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {drones.map((drone) => {
            const isOverweight = orderWeight > drone.max_payload_kg;
            const isLowBattery = drone.battery_level < 20;
            const isWarning = isOverweight || isLowBattery;

            return (
              <div 
                key={drone.id}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  isWarning 
                    ? 'border-red-500/20 bg-red-500/5 opacity-60 grayscale' 
                    : 'border-white/10 bg-slate-800/50 hover:bg-slate-800 hover:border-primary/50'
                }`}
              >
                <div>
                  <p className="text-white font-bold font-mono text-sm flex items-center gap-2">
                    {drone.callsign}
                    {isWarning && <AlertTriangle className="w-3 h-3 text-red-500" />}
                  </p>
                  <p className="text-slate-500 text-xs font-mono mt-0.5">{drone.model}</p>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <Weight className={`w-4 h-4 mb-1 ${isOverweight ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className="text-xs font-mono text-white">{drone.max_payload_kg} кг</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Battery className={`w-4 h-4 mb-1 ${isLowBattery ? 'text-red-500' : 'text-success'}`} />
                    <span className="text-xs font-mono text-white">{drone.battery_level}%</span>
                  </div>

                  <button
                    onClick={() => handleAssign(drone)}
                    disabled={isWarning || assigningId === drone.id}
                    className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-widest flex items-center gap-2 transition-all ${
                      isWarning
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : assigningId === drone.id
                          ? 'bg-primary/50 text-white cursor-wait'
                          : 'bg-primary/10 text-primary hover:bg-primary hover:text-slate-950 border border-primary/30 hover:border-primary'
                    }`}
                  >
                    {assigningId === drone.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {assigningId === drone.id ? 'СВЯЗЬ...' : 'НАЗНАЧИТЬ'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}