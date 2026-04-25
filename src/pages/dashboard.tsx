import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { motion, Variants } from 'framer-motion'
import { 
  Package, 
  Navigation, 
  CheckCircle, 
  Plus, 
  Clock, 
  ArrowRight,
  Terminal,
  Loader2,
  AlertCircle
} from 'lucide-react'

type Order = {
  id: string
  from_address: string
  to_address: string
  weight: number
  status: 'pending' | 'loading' | 'in_transit' | 'arrived' | 'delivered' | 'cancelled'
  price: number
  created_at: string
}

// Конфигурация статусов в стиле Cyber-Aero
const statusConfig: Record<string, { label: string, styles: string }> = {
  pending: { 
    label: 'ОЖИДАНИЕ', 
    styles: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 shadow-[0_0_10px_rgba(250,204,21,0.15)]' 
  },
  loading: {
    label: 'ПОГРУЗКА',
    styles: 'text-orange-400 bg-orange-400/10 border border-orange-400/20 shadow-[0_0_10px_rgba(251,146,60,0.15)]'
  },
  in_transit: { 
    label: 'В ПОЛЕТЕ', 
    styles: 'text-primary bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(56,189,248,0.2)]' 
  },
  arrived: {
    label: 'ПРИБЫЛ',
    styles: 'text-blue-400 bg-blue-400/10 border border-blue-400/20 shadow-[0_0_10px_rgba(96,165,250,0.15)]'
  },
  delivered: { 
    label: 'ДОСТАВЛЕН', 
    styles: 'text-success bg-success/10 border border-success/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
  },
  cancelled: { 
    label: 'ОТМЕНЕН', 
    styles: 'text-accent bg-accent/10 border border-accent/20 shadow-[0_0_10px_rgba(244,63,94,0.15)]' 
  },
  unknown: {
    label: 'ОБРАБОТКА',
    styles: 'text-slate-400 bg-slate-800/50 border border-slate-600 shadow-[0_0_10px_rgba(71,85,105,0.15)]'
  }
}

// Анимации
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<{ full_name: string } | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()
        
        setProfile(profileData)

        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        
        setOrders(ordersData || [])
      }

      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-primary/70 font-mono text-sm tracking-widest">ПОДКЛЮЧЕНИЕ К СЕРВЕРУ...</span>
        </div>
      </div>
    )
  }

  const stats = {
    total: orders.length,
    inTransit: orders.filter(o => o.status === 'in_transit').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  return (
    <>
      <Head><title>Терминал управления — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pb-20 pt-24">
        <div className="max-w-5xl mx-auto px-6">

          {/* Заголовок профиля */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-mono mb-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                СЕАНС АКТИВЕН
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Добро пожаловать, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Оператор'}</span>
              </h1>
              <p className="text-slate-400 font-mono text-sm mt-1 border-l-2 border-white/10 pl-3">
                ID: {user?.id.split('-')[0] || 'UNKNOWN'} | {user?.email}
              </p>
            </div>

            <Link 
              href="/order/new" 
              className="inline-flex items-center justify-center gap-2 bg-primary text-background px-6 py-3 rounded-xl font-bold tracking-wide hover:scale-105 transition-transform shadow-[0_0_20px_rgba(56,189,248,0.3)] shrink-0"
            >
              <Plus className="w-5 h-5" />
              НОВАЯ МИССИЯ
            </Link>
          </motion.div>

          {/* Сводка (Телеметрия) */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
          >
            {[
              { label: 'ОБЩЕЕ ЧИСЛО ЗАДАЧ', value: stats.total, icon: Package, border: 'border-white/10' },
              { label: 'АКТИВНЫЕ ПОЛЕТЫ', value: stats.inTransit, icon: Navigation, border: 'border-primary/30', glow: 'neon-glow' },
              { label: 'УСПЕШНО ЗАВЕРШЕНО', value: stats.delivered, icon: CheckCircle, border: 'border-success/30' },
            ].map((s, i) => (
              <motion.div 
                key={s.label} 
                variants={itemVariants}
                className={`glass-card rounded-2xl p-6 border ${s.border} ${s.glow || ''} relative overflow-hidden group`}
              >
                <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <s.icon className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-surface/80 border border-white/5">
                    <s.icon className={`w-6 h-6 ${i === 1 ? 'text-primary' : i === 2 ? 'text-success' : 'text-slate-300'}`} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="text-4xl font-black text-white mb-1 tracking-tighter">{s.value}</div>
                  <div className="text-slate-500 font-mono text-[11px] tracking-widest">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Журнал полетов (Заказы) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/5 bg-surface/50 flex items-center gap-3">
              <Terminal className="w-5 h-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white tracking-wide">Бортовой журнал</h2>
            </div>

            {orders.length === 0 ? (
              <div className="py-24 text-center px-6">
                <div className="w-20 h-20 mx-auto bg-surface/50 border border-white/5 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-400 text-lg mb-2">Журнал полетов пуст</p>
                <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                  Система не обнаружила истории транзакций. Инициируйте свою первую миссию по доставке.
                </p>
                <Link 
                  href="/order/new" 
                  className="inline-flex items-center gap-2 border border-primary/50 text-primary hover:bg-primary/10 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  ЗАПУСТИТЬ ПРОТОКОЛ
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {orders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/order/${order.id}`}
                    className="block p-6 hover:bg-white/[0.02] transition-colors group relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-primary/50 transition-colors" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      
                      {/* Инфо и Статус */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-md tracking-widest ${(statusConfig[order.status] || statusConfig['unknown']).styles}`}>
                            {(statusConfig[order.status] || statusConfig['unknown']).label}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs font-mono text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(order.created_at).toLocaleString('ru-RU', { 
                              day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                          <span className="text-[10px] font-mono text-slate-600 bg-surface px-2 py-0.5 rounded">
                            ID: {order.id.split('-')[0]}
                          </span>
                        </div>
                        
                        {/* Маршрут */}
                        <div className="flex items-center gap-4 text-sm mt-4 md:mt-2">
                          <div className="flex-1 bg-surface/50 border border-white/5 rounded-lg px-3 py-2">
                            <span className="block text-[10px] font-mono text-slate-500 mb-0.5">A (ОТПРАВЛЕНИЕ)</span>
                            <span className="text-slate-200 truncate block max-w-[200px] md:max-w-xs" title={order.from_address}>
                              {order.from_address}
                            </span>
                          </div>
                          <ArrowRight className="w-5 h-5 text-slate-600 shrink-0" />
                          <div className="flex-1 bg-surface/50 border border-white/5 rounded-lg px-3 py-2">
                            <span className="block text-[10px] font-mono text-slate-500 mb-0.5">B (НАЗНАЧЕНИЕ)</span>
                            <span className="text-slate-200 truncate block max-w-[200px] md:max-w-xs" title={order.to_address}>
                              {order.to_address}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Цена и Вес */}
                      <div className="flex flex-row md:flex-col items-end justify-between md:justify-center border-t border-white/5 md:border-t-0 pt-4 md:pt-0 md:pl-6 md:border-l">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white group-hover:text-primary transition-colors">
                            {order.price ? `${order.price.toLocaleString('ru-RU')} ₸` : '—'}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center justify-end gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            МАССА: {order.weight.toFixed(2)} КГ
                          </div>
                        </div>
                      </div>

                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}