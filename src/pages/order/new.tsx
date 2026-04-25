import Head from 'next/head'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import { 
  Target, 
  Weight, 
  AlertTriangle, 
  Rocket, 
  Loader2,
  CheckCircle2,
  ChevronRight,
  Map,
  ShieldAlert
} from 'lucide-react'
import AddressInput from '@/components/AddressInput'
import RouteMap from '@/components/RouteMap'

// Базовые константы
const DEFAULT_PRICE_PER_KG = 500
const DEFAULT_BASE_PRICE = 800
const DEFAULT_PRICE_PER_KM = 150 
const MAX_DISTANCE_KM = 15.0 // Увеличили максимальный радиус до 15 км

// Тип для наших дронов из БД
type Drone = {
  id: string;
  callsign: string;
  model: string;
  max_payload_kg: number;
  battery_level: number;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371 
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function NewOrder() {
  const router = useRouter()
  
  // --- Состояния ---
  const [form, setForm] = useState({ from_address: '', to_address: '', weight: '' })
  const [coords, setCoords] = useState<{
    from: { lat: number; lon: number } | null;
    to: { lat: number; lon: number } | null;
  }>({ from: null, to: null })

  const [availableDrones, setAvailableDrones] = useState<Drone[]>([])
  const [fleetLoading, setFleetLoading] = useState(true)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [distance, setDistance] = useState<number | null>(null)
  const [showMap, setShowMap] = useState(false)

  // --- Загрузка флота при входе ---
  useEffect(() => {
    async function fetchFleet() {
      const { data, error } = await supabase
        .from('drones')
        .select('*')
        .eq('status', 'idle')
        .gte('battery_level', 20);

      if (data) {
        setAvailableDrones(data);
      }
      setFleetLoading(false);
    }
    fetchFleet();
  }, []);

  // --- Логика подбора борта и расчета ---
  const weightNum = parseFloat(form.weight) || 0
  
  const maxFleetPayload = availableDrones.length > 0 
    ? Math.max(...availableDrones.map(d => d.max_payload_kg))
    : 0;

  const optimalDrone = useMemo(() => {
    if (weightNum <= 0 || availableDrones.length === 0) return null;
    const capableDrones = availableDrones.filter(d => d.max_payload_kg >= weightNum);
    if (capableDrones.length === 0) return null;
    
    return capableDrones.sort((a, b) => a.max_payload_kg - b.max_payload_kg)[0];
  }, [weightNum, availableDrones]);

  // Расчет цены
  const price = useMemo(() => {
    if (!distance) return DEFAULT_BASE_PRICE;
    const distCost = Math.round(distance * DEFAULT_PRICE_PER_KM);
    const weightCost = Math.round(weightNum * DEFAULT_PRICE_PER_KG);
    return DEFAULT_BASE_PRICE + distCost + weightCost;
  }, [distance, weightNum]);

  // --- Эффекты карты ---
  useEffect(() => {
    if (coords.from && coords.to) {
      const dist = calculateDistance(coords.from.lat, coords.from.lon, coords.to.lat, coords.to.lon)
      setDistance(dist)
      setShowMap(true)
      
      if (dist > MAX_DISTANCE_KM) {
        setError(`Превышен радиус доставки: ${dist.toFixed(1)} км. Максимальная дальность полета составляет ${MAX_DISTANCE_KM} км.`)
      } else {
        setError('')
      }
    } else if (coords.from || coords.to) {
      setShowMap(true)
      setDistance(null)
    }
  }, [coords])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/auth/login')

    const { error: insertError } = await supabase.from('orders').insert({
      user_id: user.id,
      from_address: form.from_address,
      to_address: form.to_address,
      from_lat: coords.from?.lat,
      from_lon: coords.from?.lon,
      to_lat: coords.to?.lat,
      to_lon: coords.to?.lon,
      weight: parseFloat(form.weight),
      price: price,
      status: 'pending',
    })

    if (insertError) {
      console.error(insertError)
      setError('Ошибка при создании заказа. Пожалуйста, попробуйте еще раз.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  // --- Валидация ---
  const isWeightValid = weightNum > 0 && weightNum <= maxFleetPayload;
  const isRouteValid = distance !== null && distance <= MAX_DISTANCE_KM;
  const canSubmit = isRouteValid && isWeightValid && !loading && availableDrones.length > 0 && optimalDrone !== null;

  if (fleetLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <span className="text-primary font-mono text-xs tracking-widest animate-pulse">ПОИСК СВОБОДНЫХ БОРТОВ...</span>
      </div>
    )
  }

  return (
    <>
      <Head><title>Полетное задание — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pb-24 pt-24">
        <div className="max-w-2xl mx-auto px-6">
          
          {/* Заголовок */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="flex items-center gap-2 text-primary text-[10px] font-mono mb-2 tracking-[0.3em] uppercase">
              <span className={`w-2 h-2 rounded-full ${availableDrones.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              Q'FLY | На линии: {availableDrones.length}
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">ОФОРМИТЬ ДОСТАВКУ</h1>
            <p className="text-slate-500 text-sm mt-2">
              Укажите адреса и параметры посылки для автоматического расчета стоимости.
            </p>
          </motion.div>

          {/* Глобальная ошибка (Нет флота) */}
          {availableDrones.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-500/10 border border-red-500/30 text-red-500 p-6 rounded-2xl mb-8 flex items-center gap-4 backdrop-blur-md">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <p className="font-bold tracking-widest uppercase">Все дроны заняты</p>
                <p className="text-sm opacity-80 mt-1">В данный момент нет доступных дронов для заказа. Пожалуйста, подождите немного и обновите страницу.</p>
              </div>
            </motion.div>
          )}

          {/* Локальная ошибка маршрута */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-accent/10 border border-accent/30 text-accent text-sm p-4 rounded-xl mb-8 flex items-start gap-3 backdrop-blur-md"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>{error}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form 
            variants={containerVariants} 
            initial="hidden" 
            animate="show" 
            onSubmit={handleSubmit} 
            className="space-y-6"
          >
            
            {/* Секция: Маршрут */}
            <motion.div variants={itemVariants} className="glass-card rounded-3xl p-8 relative overflow-hidden border-white/5">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/50" />
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-bold text-white text-sm tracking-widest uppercase flex items-center gap-3">
                  <Target className="w-5 h-5 text-primary" /> Маршрут
                </h2>
                {isRouteValid && <CheckCircle2 className="w-5 h-5 text-success animate-pulse" />}
              </div>

              <div className="space-y-4">
                <AddressInput label="ОТКУДА ЗАБРАТЬ" placeholder="Поиск адреса отправления..." markerColor="primary" onSelect={(data) => {
                  if (data) {
                    setCoords(prev => ({ ...prev, from: { lat: data.lat, lon: data.lon } }))
                    setForm(prev => ({ ...prev, from_address: data.address }))
                  } else {
                    setCoords(prev => ({ ...prev, from: null })); setForm(prev => ({ ...prev, from_address: '' }))
                  }
                }} />

                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 h-px bg-white/5" />
                  <ChevronRight className="rotate-90 text-slate-700 w-4 h-4 shrink-0" />
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                <AddressInput label="КУДА ДОСТАВИТЬ" placeholder="Поиск адреса назначения..." markerColor="accent" onSelect={(data) => {
                  if (data) {
                    setCoords(prev => ({ ...prev, to: { lat: data.lat, lon: data.lon } }))
                    setForm(prev => ({ ...prev, to_address: data.address }))
                  } else {
                    setCoords(prev => ({ ...prev, to: null })); setForm(prev => ({ ...prev, to_address: '' }))
                  }
                }} />
              </div>

              <AnimatePresence>
                {showMap && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden">
                    <div className="flex items-center gap-2 mb-3">
                      <Map className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">Предварительный маршрут</span>
                    </div>
                    <RouteMap from={coords.from} to={coords.to} distance={distance} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {distance && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 pt-5 border-t border-white/5 flex justify-between items-center">
                    <span className="text-xs text-slate-500 uppercase tracking-widest">Расчетная дистанция</span>
                    <span className={`font-mono text-sm font-bold ${distance > MAX_DISTANCE_KM ? 'text-accent' : 'text-primary'}`}>
                      {distance.toFixed(2)} км
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Секция: Масса груза */}
            <motion.div variants={itemVariants} className="glass-card rounded-3xl p-8 border-white/5">
              <h2 className="font-bold text-white text-sm tracking-widest uppercase mb-6 flex items-center gap-3">
                <Weight className="w-5 h-5 text-primary" /> Данные о посылке
              </h2>
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="relative shrink-0">
                  <input
                    name="weight" 
                    type="number" 
                    required 
                    min="0.1" 
                    max={maxFleetPayload || 0}
                    step="0.1" 
                    placeholder="0.0"
                    value={form.weight} 
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    disabled={availableDrones.length === 0}
                    className="w-32 bg-background border border-white/10 rounded-2xl px-6 py-4 text-2xl font-black text-white focus:outline-none focus:border-primary/50 transition-all font-mono disabled:opacity-50"
                  />
                  <div className="absolute -top-2 -right-2 bg-primary text-background text-[10px] font-bold px-2 py-0.5 rounded-md">КГ</div>
                </div>
                
                <div className="text-sm text-slate-500 leading-relaxed flex-1">
                  Максимальный вес для текущего флота: <strong className="text-white">{maxFleetPayload} кг</strong>.
                  <br />
                  {weightNum > maxFleetPayload && (
                    <span className="text-accent mt-1 inline-block">Вес превышает возможности доступных дронов.</span>
                  )}
                  {optimalDrone && weightNum > 0 && weightNum <= maxFleetPayload && (
                    <span className="text-green-500 mt-1 inline-block">
                      ✓ Подходящий борт найден
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Секция: Финансовый отчет */}
            <motion.div variants={itemVariants} className="bg-primary/5 border border-primary/20 rounded-3xl p-8">
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between text-slate-400">
                  <span>Базовый тариф доставки</span>
                  <span className="text-slate-200">{DEFAULT_BASE_PRICE} ₸</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Надбавка за дистанцию</span>
                  <span className="text-slate-200">+{distance ? Math.round(distance * DEFAULT_PRICE_PER_KM) : 0} ₸</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Надбавка за вес</span>
                  <span className="text-slate-200">+{weightNum > 0 && isWeightValid ? Math.round(weightNum * DEFAULT_PRICE_PER_KG) : 0} ₸</span>
                </div>
                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                  <span className="text-white font-bold uppercase tracking-widest text-xs">Итого к оплате</span>
                  <span className="text-3xl font-black text-primary tracking-tighter">{price} ₸</span>
                </div>
              </div>
            </motion.div>

            {/* Кнопка запуска */}
            <motion.button
              variants={itemVariants} 
              type="submit" 
              disabled={!canSubmit}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-4 bg-primary text-background py-5 rounded-2xl font-black tracking-widest text-sm uppercase hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(56,189,248,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Rocket className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
              )}
              {loading ? 'ОФОРМЛЕНИЕ ЗАКАЗА...' : 'ОПЛАТИТЬ И ЗАКАЗАТЬ'}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </>
  )
}