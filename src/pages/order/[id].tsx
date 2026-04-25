import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { motion, Variants } from 'framer-motion'
import { 
  Package, 
  Navigation, 
  Search, 
  XCircle, 
  MapPin, 
  ArrowDown, 
  Weight, 
  CreditCard, 
  Clock,
  ArrowLeft,
  Plus,
  Activity,
  Terminal,
  Loader2,
  Send,
  CheckCircle2
} from 'lucide-react'
import DeliveryMap from '@/components/DeliveryMap'

type Order = {
  id: string
  from_address: string
  to_address: string
  from_lat: number
  from_lon: number
  to_lat: number
  to_lon: number
  weight: number
  status: 'pending' | 'loading' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled'
  price: number
  created_at: string
}

// Эталонный маршрут миссии (5 шагов)
const STEPS = [
  { 
    key: 'pending', 
    label: 'ПОИСК', 
    icon: Search, 
    desc: 'Ожидайте. Система сканирует сеть, чтобы закрепить за вашим заказом ближайший дрон.' 
  },
  { 
    key: 'loading', 
    label: 'ПОГРУЗКА', 
    icon: Package, 
    desc: 'Подготовьтесь к отслеживанию. Ваш груз прямо сейчас безопасно фиксируется в отсеке дрона.' 
  },
  { 
    key: 'in_transit', 
    label: 'ПОЛЕТ', 
    icon: Send, 
    desc: 'Следите за радаром. Дрон находится в воздухе — вы можете наблюдать за его скоростью и высотой на карте.' 
  },
  { 
    key: 'arrived', 
    label: 'ПРИБЫТИЕ', 
    icon: MapPin, 
    desc: 'Требуется ваше действие! Подойдите к дрону и введите 4-значный PIN-код на экране для открытия замка.' 
  },
  { 
    key: 'delivered', 
    label: 'УСПЕХ', 
    icon: CheckCircle2, 
    desc: 'Заберите вашу посылку. Убедитесь, что грузовой отсек пуст. Спасибо за использование системы!' 
  },
]

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function OrderTracking() {
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    // Обновляем запрос загрузки заказа
const fetchOrder = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) { router.push('/auth/login'); return }

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      drones (
        callsign,
        model,
        battery_level,
        max_payload_kg
      )
    `) // Подтягиваем данные дрона через связь drone_id
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) setNotFound(true)
  else setOrder(data)
  setLoading(false)
}

    fetchOrder()

    const channel = supabase
      .channel('order-tracking')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${id}`,
      }, (payload) => setOrder(payload.new as Order))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, router])

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-primary/70 font-mono text-sm tracking-widest">ПОИСК СИГНАЛА БОРТА...</span>
        </div>
      </div>
    )
  }

  // --- Not found ---
  if (notFound || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background bg-grid-pattern px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-accent/5 rounded-full blur-[100px]" />
        <Search className="w-20 h-20 text-slate-600 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">СИГНАЛ НЕ НАЙДЕН</h1>
        <p className="text-slate-500 mb-8 font-mono text-sm text-center max-w-sm">
          Запрашиваемый ID транзакции отсутствует в реестре или у вас нет прав доступа к этой телеметрии.
        </p>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-surface/50 border border-white/10 text-white px-8 py-3.5 rounded-xl font-medium tracking-wide hover:bg-surface hover:border-white/30 transition-all"
        >
          <Terminal className="w-5 h-5 text-slate-400" />
          ВЕРНУТЬСЯ В ТЕРМИНАЛ
        </Link>
      </div>
    )
  }

  // Вычисляем индекс текущего шага на основе статуса из БД
  const stepIndexMap: Record<string, number> = {
    'pending': 0,
    'loading': 1,
    'in_transit': 2,
    'arrived': 3,
    'delivered': 4,
    'cancelled': -1, // -1 значит, что мы убираем прогресс-бар при отмене
  };

  const currentStep = stepIndexMap[order.status] ?? 0;
  const isCancelled = order.status === 'cancelled';
  // Вычисляем ширину закрашенной линии (от 0% до 100%)
  const progressPercent = currentStep >= 0 ? (currentStep / (STEPS.length - 1)) * 100 : 0;

  // Координаты для карты
  const hasCoords = order.from_lat && order.from_lon && order.to_lat && order.to_lon
  const staticStart: [number, number] | undefined = hasCoords ? [order.from_lon, order.from_lat] : undefined
  const staticEnd: [number, number] | undefined = hasCoords ? [order.to_lon, order.to_lat] : undefined

  return (
    <>
      <Head><title>Радар: #{order.id.slice(0, 8)} — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
          >
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-mono mb-2">
                <Activity className="w-4 h-4 animate-pulse" />
                СЕАНС ТЕЛЕМЕТРИИ
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter">
                ID: {order.id.slice(0, 8).toUpperCase()}
              </h1>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-mono text-slate-400 hover:text-primary transition-colors pb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              БАЗА
            </Link>
          </motion.div>

          {/* Cancelled Alert */}
          {isCancelled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-accent/10 border border-accent/30 rounded-2xl p-6 mb-8 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
              <XCircle className="w-10 h-10 text-accent mx-auto mb-3 opacity-80" />
              <p className="text-accent font-bold tracking-widest text-lg mb-1">ПРОТОКОЛ ПРЕРВАН</p>
              <p className="text-accent/70 font-mono text-sm">Полетное задание отменено диспетчером или системой.</p>
            </motion.div>
          )}

          {/* Трекер статуса */}
          {!isCancelled && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="bg-slate-950/80 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 mb-8 relative overflow-hidden shadow-2xl"
            >
              {/* Фоновое свечение */}
              <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${
                order.status === 'in_transit' ? 'bg-primary/20' :
                order.status === 'delivered' ? 'bg-green-500/20' : 'bg-slate-500/10'
              }`} />

              <h2 className="font-semibold text-white tracking-widest text-sm mb-12 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                СТАТУС МИССИИ
              </h2>

              {/* Progress Bar */}
              <div className="relative mb-8 px-4 md:px-8">
                {/* Подложка линии (чуть темнее для контраста) */}
                <div className="absolute top-6 left-12 right-12 h-1 bg-slate-800 rounded-full" />
                {/* Заполненная линия */}
                <div
                  className="absolute top-6 left-12 h-1 bg-primary rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(56,189,248,0.5)]"
                  style={{ width: `calc(${progressPercent}% - 6rem)` }}
                />
                
                <div className="relative flex justify-between">
                  {STEPS.map((step, index) => {
                    // Разделяем состояния для более точной раскраски
                    const isCompleted = index < currentStep;
                    const isActive = index === currentStep;
                    const isFinalStep = step.key === 'delivered';

                    return (
                      <div key={step.key} className="flex flex-col items-center w-24 md:w-32">
                        <div className={`
                          w-12 h-12 rounded-2xl flex items-center justify-center
                          transition-all duration-500 z-10 relative
                          ${isCompleted 
                            ? 'bg-primary text-slate-950 shadow-[0_0_20px_rgba(56,189,248,0.4)]' // Пройденные: сплошная заливка
                            : isActive
                              ? isFinalStep 
                                ? 'bg-green-500 text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.6)]' // Финал: зеленая заливка
                                : 'bg-slate-900 border-2 border-primary text-primary shadow-[0_0_20px_rgba(56,189,248,0.5)]' // Текущий: обводка и текст в цвет primary
                              : 'bg-slate-900 border border-white/5 text-slate-600' // Будущие: тусклые
                          }
                        `}>
                          <step.icon className={`w-6 h-6 ${isActive && step.key === 'in_transit' ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                          
                          {/* Эффект радара только для активного шага */}
                          {isActive && (
                            <div className={`absolute -inset-2 rounded-[1.25rem] border ${isFinalStep ? 'border-green-500/50' : 'border-primary/50'} animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]`} />
                          )}
                        </div>
                        
                        <p className={`text-[10px] md:text-xs font-mono font-bold mt-4 text-center tracking-widest transition-colors ${
                          isCompleted || isActive ? 'text-white' : 'text-slate-600'
                        }`}>
                          {step.label}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
              {/* --- НОВЫЙ БЛОК: Информационная панель текущего шага --- */}
              <div className="flex justify-center mt-8">
                <motion.div
                  key={currentStep} // Смена ключа триггерит анимацию при каждом новом статусе
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-900/80 backdrop-blur-md border border-primary/20 rounded-2xl px-6 py-4 max-w-lg w-full text-center shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                >
                  <h3 className="text-primary text-[10px] font-mono font-bold tracking-[0.2em] mb-1.5 uppercase opacity-80">
                    Текущая фаза: {STEPS[currentStep]?.label || 'Ожидание'}
                  </h3>
                  <p className="text-slate-300 text-sm font-medium">
                    {STEPS[currentStep]?.desc || 'Синхронизация данных...'}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ═══════════════════════════════════════
            КАРТА МОНИТОРИНГА — показывается всегда
            кроме отменённых заказов
            ═══════════════════════════════════════
          */}
          {!isCancelled && hasCoords && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mb-8"
            >
              {/* Заголовок секции */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest">
                  <span className={`w-2 h-2 rounded-full ${order.status === 'in_transit' ? 'bg-primary animate-pulse' : 'bg-slate-600'}`} />
                  {order.status === 'in_transit'
                    ? 'Live_Tracking — Сигнал активен'
                    : order.status === 'delivered'
                    ? 'Маршрут завершён'
                    : 'Маршрут ожидает запуска'}
                </div>

                {/* Бейдж статуса */}
                {order.status === 'in_transit' && (
                  <div className="bg-primary/10 border border-primary/30 text-primary text-[9px] font-mono px-2.5 py-1 rounded-lg tracking-widest">
                    REALTIME
                  </div>
                )}
              </div>

              {/* Сама карта */}
              <DeliveryMap
                orderId={order.id}
                staticStart={staticStart}
                staticEnd={staticEnd}
              />
            </motion.div>
          )}

          {/* Детали маршрута + метрики */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            {/* Вектор маршрута */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="md:col-span-2 glass-card rounded-3xl p-8"
            >
              <h2 className="font-semibold text-slate-400 font-mono text-xs tracking-widest mb-6">КООРДИНАТЫ МАРШРУТА</h2>
              <div className="relative space-y-6">
                <div className="absolute left-[19px] top-[40px] bottom-[40px] w-px bg-white/10 border-l border-dashed border-slate-600" />
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center shrink-0 z-10">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">ТОЧКА А (ОТПРАВЛЕНИЕ)</p>
                    <p className="text-white font-medium">{order.from_address}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center shrink-0 z-10">
                    <ArrowDown className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-mono mb-1">ТОЧКА Б (НАЗНАЧЕНИЕ)</p>
                    <p className="text-white font-medium">{order.to_address}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Метрики */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <Weight className="w-4 h-4 text-slate-500" />
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest">МАССА</p>
                </div>
                <p className="text-3xl font-black text-white">
                  {order.weight.toFixed(1)} <span className="text-base text-slate-500 font-normal">КГ</span>
                </p>
              </div>
              <div className="glass-card rounded-2xl p-6 flex-1 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="w-4 h-4 text-slate-500" />
                  <p className="text-[10px] text-slate-400 font-mono tracking-widest">БЮДЖЕТ</p>
                </div>
                <p className="text-3xl font-black text-primary">
                  {order.price} <span className="text-base font-normal">₸</span>
                </p>
              </div>
            </motion.div>
          </div>

          {/* Подвал */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-2 text-slate-500 text-sm font-mono">
              <Clock className="w-4 h-4" />
              ИНИЦИАЛИЗАЦИЯ: {new Date(order.created_at).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </div>
            <div className="flex w-full md:w-auto gap-4">
              <Link
                href="/order/new"
                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-surface/80 border border-white/10 text-white px-6 py-3 rounded-xl font-medium tracking-wide hover:bg-white/5 transition-all"
              >
                <Plus className="w-4 h-4" />
                НОВЫЙ ЗАПУСК
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}