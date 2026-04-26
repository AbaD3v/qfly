import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Battery, Cpu, Radio, MapPin, Loader2 } from 'lucide-react';
import DeliveryMapAdmin from '@/components/DeliveryMapAdmin';

export default function DroneDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [drone, setDrone] = useState<any>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;

    const fetchDroneData = async () => {
      try {
        // 1. Получаем инфо о дроне
        const { data: droneData, error: droneError } = await supabase
          .from('drones')
          .select('*')
          .eq('id', id)
          .single();

        if (!isMounted) return;
        if (droneError) throw droneError;

        if (droneData) {
          setDrone(droneData);

          // 2. Если дрон на миссии, ищем активный заказ для этого дрона
          if (droneData.status === 'on_mission') {
            const { data: orderData, error: orderError } = await supabase
              .from('orders')
              .select('*')
              .eq('drone_id', id)
              .in('status', ['loading', 'in_transit', 'arrived'])
              .single();
            
            if (!isMounted) return;
            if (!orderError && orderData) setActiveOrder(orderData);
          }
        }
      } catch (error) {
        console.error('Error fetching drone data:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDroneData();

    // Realtime подписка на изменения этого дрона
    const channel = supabase.channel(`drone-detail-${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'drones', 
        filter: `id=eq.${id}` 
      }, (payload) => {
        if (isMounted) {
          console.log('📡 Realtime UPDATE из БД:', payload.new);
          setDrone(payload.new);
        }
      })
      .subscribe((status) => {
        console.log('📡 Статус подписки на дрон:', status);
      });

    return () => { 
      isMounted = false;
      supabase.removeChannel(channel); 
    };
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );

  if (!drone) return <div className="text-white p-10 text-center">Борт не найден</div>;

  return (
    <>
      <Head><title>{drone.callsign} | Телеметрия</title></Head>

      <div className="min-h-screen bg-slate-950 text-white pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Навигация назад */}
          <Link href="/admin" className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-4">
            <ChevronLeft size={20} />
            Назад в центр управления
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Левая колонка: Карта и управление */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <DeliveryMapAdmin 
                  orderId={activeOrder?.id} 
                  droneId={drone.id}
                  staticStart={activeOrder ? [activeOrder.from_lon, activeOrder.from_lat] : undefined}
                  staticEnd={activeOrder ? [activeOrder.to_lon, activeOrder.to_lat] : undefined}
                />
              </div>

              {/* Карточка текущего статуса */}
              <div className="bg-slate-900/50 border border-white/5 p-8 rounded-3xl flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter uppercase">{drone.callsign}</h2>
                  <p className="text-slate-500 font-mono text-xs uppercase mt-1">{drone.model}</p>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-mono font-bold px-3 py-1 rounded-full border mb-2 inline-block
                    ${drone.status === 'idle' ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-primary border-primary/20 bg-primary/5 animate-pulse'}
                  `}>
                    {drone.status === 'idle' ? 'ОЖИДАНИЕ' : 'В РАБОТЕ'}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Battery size={18} className={drone.battery_level < 20 ? 'text-red-500 animate-bounce' : ''} />
                    <span className="font-bold">{drone.battery_level}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Правая колонка: Технические данные */}
            <div className="space-y-6">
              <h3 className="text-sm font-mono text-slate-500 tracking-[0.2em] uppercase">Технический стек</h3>
              
              <div className="grid gap-4">
                <TechInfoCard icon={Cpu} label="Процессор" value="Q-Core v2" />
                <TechInfoCard icon={Radio} label="Связь" value="L-Band Satellite" />
                <TechInfoCard icon={MapPin} label="Координаты" value={`${drone.current_lat?.toFixed(4)}, ${drone.current_lon?.toFixed(4)}`} />
              </div>

              {activeOrder && (
                <div className="mt-8 p-6 bg-primary/5 border border-primary/10 rounded-3xl">
                  <h4 className="text-xs font-mono text-primary tracking-widest uppercase mb-4">Активная миссия</h4>
                  <p className="text-sm text-slate-300 mb-2">Груз: <span className="text-white font-bold">{activeOrder.weight} кг</span></p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">От: {activeOrder.from_address}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-2">До: {activeOrder.to_address}</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}

function TechInfoCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-slate-900/30 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] font-mono text-slate-500 uppercase">{label}</p>
        <p className="text-sm font-bold text-white">{value}</p>
      </div>
    </div>
  );
}