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
  ListOrdered,
  Loader2,
  Inbox,
  MapPin,
  Weight
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

// Конфигурация статусов (Чистый, современный стиль без тяжелого неона)
const statusConfig: Record<string, { label: string, styles: string }> = {
  pending: { 
    label: 'ОЖИДАЕТ', 
    styles: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' 
  },
  loading: {
    label: 'ПОГРУЗКА',
    styles: 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  },
  in_transit: { 
    label: 'В ПУТИ', 
    styles: 'text-primary bg-primary/10 border-primary/20' 
  },
  arrived: {
    label: 'ОЖИДАЕТ ПОЛУЧЕНИЯ',
    styles: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  },
  delivered: { 
    label: 'ДОСТАВЛЕН', 
    styles: 'text-success bg-success/10 border-success/20' 
  },
  cancelled: { 
    label: 'ОТМЕНЕН', 
    styles: 'text-red-500 bg-red-500/10 border-red-500/20' 
  },
  unknown: {
    label: 'ОБРАБОТКА',
    styles: 'text-slate-400 bg-slate-800/50 border-slate-600'
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
          <span className="text-slate-400 text-sm font-medium">Загрузка данных...</span>
        </div>
      </div>
    )
  }

  const stats = {
    total: orders.length,
    inTransit: orders.filter(o => o.status === 'in_transit' || o.status === 'loading').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
  }

  return (
    <>
      <Head><title>Мои заказы — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pb-20 pt-24 selection:bg-primary/30">
        <div className="max-w-5xl mx-auto px-6">

          {/* Заголовок профиля */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
                Личный кабинет
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Добро пожаловать, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'Клиент'}</span>
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                {user?.email}
              </p>
            </div>

            <Link 
              href="/order/new" 
              className="inline-flex items-center justify-center gap-2 bg-primary text-background px-6 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 shrink-0"
            >
              <Plus className="w-5 h-5" />
              Оформить доставку
            </Link>
          </motion.div>

          {/* Сводка */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12"
          >
            {[
              { label: 'ВСЕГО ЗАКАЗОВ', value: stats.total, icon: Package, border: 'border-white/5' },
              { label: 'В ПРОЦЕССЕ', value: stats.inTransit, icon: Navigation, border: 'border-primary/20 bg-primary/5' },
              { label: 'ДОСТАВЛЕНО', value: stats.delivered, icon: CheckCircle, border: 'border-success/20 bg-success/5' },
            ].map((s, i) => (
              <motion.div 
                key={s.label} 
                variants={itemVariants}
                className={`glass-card rounded-3xl p-6 border ${s.border} relative overflow-hidden group`}
              >
                <div className="absolute -right-4 -top-4 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <s.icon className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10 flex items-start justify-between mb-4">
                  <div className="p-3 rounded-2xl bg-surface border border-white/5 shadow-sm">
                    <s.icon className={`w-6 h-6 ${i === 1 ? 'text-primary' : i === 2 ? 'text-success' : 'text-slate-400'}`} />
                  </div>
                </div>
                <div className="relative z-10">
                  <div className="text-4xl font-black text-white mb-1">{s.value}</div>
                  <div className="text-slate-500 text-xs font-bold tracking-widest">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* История заказов */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card rounded-3xl overflow-hidden border-white/5 shadow-xl"
          >
            <div className="px-8 py-6 border-b border-white/5 bg-surface/30 flex items-center gap-3">
              <ListOrdered className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-white">История заказов</h2>
            </div>

            {orders.length === 0 ? (
              <div className="py-24 text-center px-6">
                <div className="w-20 h-20 mx-auto bg-surface border border-white/5 rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <Inbox className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-white font-medium text-lg mb-2">У вас еще нет заказов</p>
                <p className="text-slate-400 text-sm mb-8 max-w-sm mx-auto">
                  Оформите свою первую доставку дроном, и она появится в этом списке.
                </p>
                <Link 
                  href="/order/new" 
                  className="inline-flex items-center gap-2 bg-surface hover:bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all hover:border-primary/50"
                >
                  <Plus className="w-4 h-4 text-primary" />
                  Создать заказ
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {orders.map((order) => {
                  const currentStatus = statusConfig[order.status] || statusConfig['unknown'];
                  
                  return (
                    <Link
                      key={order.id}
                      href={`/order/${order.id}`}
                      className="block p-6 hover:bg-white/[0.02] transition-colors group relative"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        
                        {/* Инфо и Статус */}
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full tracking-widest border ${currentStatus.styles}`}>
                              {currentStatus.label}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(order.created_at).toLocaleString('ru-RU', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono bg-surface px-2 py-1 rounded-md border border-white/5">
                              ID: {order.id.split('-')[0].toUpperCase()}
                            </span>
                          </div>
                          
                          {/* Маршрут (чистый дизайн) */}
                          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 text-sm bg-surface/30 p-4 rounded-2xl border border-white/5">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-500" /></div>
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-widest">Откуда</span>
                                <span className="text-slate-200 font-medium line-clamp-1" title={order.from_address}>
                                  {order.from_address}
                                </span>
                              </div>
                            </div>
                            
                            <ArrowRight className="hidden md:block w-5 h-5 text-slate-600 shrink-0" />
                            <div className="md:hidden w-px h-4 bg-white/10 ml-1.5 my-1" /> {/* Мобильная линия коннектора */}

                            <div className="flex items-start gap-3 flex-1">
                              <div className="mt-0.5"><MapPin className="w-3 h-3 text-primary" /></div>
                              <div>
                                <span className="block text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-widest">Куда</span>
                                <span className="text-slate-200 font-medium line-clamp-1" title={order.to_address}>
                                  {order.to_address}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Цена и Вес */}
                        <div className="flex flex-row md:flex-col items-end justify-between md:justify-center pt-2 md:pt-0">
                          <div className="text-right">
                            <div className="text-2xl font-black text-white group-hover:text-primary transition-colors">
                              {order.price ? `${order.price.toLocaleString('ru-RU')} ₸` : '—'}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-medium flex items-center justify-end gap-1.5">
                              <Weight className="w-3.5 h-3.5 text-slate-500" />
                              Вес: {order.weight.toFixed(1)} кг
                            </div>
                          </div>
                        </div>

                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}