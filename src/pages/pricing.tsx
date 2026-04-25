import Head from 'next/head'
import Link from 'next/link'
import { motion, Variants } from 'framer-motion' // <-- Добавили Variants
import { 
  Check, 
  Zap, 
  MapPin, 
  Clock, 
  Weight, 
  ArrowRight, 
  Terminal,
  Info,
  Rocket
} from 'lucide-react'

// Явно указываем тип Variants для анимаций
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 24 } 
  }
}

const PLANS = [
  {
    name: 'СТАНДАРТ',
    price: '800',
    unit: '₸ / вылет',
    zone: 'до 2 км',
    time: '~10 мин',
    weight: 'до 2 кг',
    color: 'border-white/10',
    glow: '',
    icon: <Terminal className="w-5 h-5 text-slate-400" />,
    badge: null,
    features: [
      'Доставка в зоне А (Базовая)',
      'Стандартный трекинг',
      'Уведомление в терминал',
      'Базовая история логов',
    ],
  },
  {
    name: 'ЭКСПРЕСС',
    price: '1 200',
    unit: '₸ / вылет',
    zone: 'до 3.5 км',
    time: '~15 мин',
    weight: 'до 2 кг',
    color: 'border-primary/50',
    glow: 'neon-glow',
    icon: <Zap className="w-5 h-5 text-primary" />,
    badge: 'ПРИОРИТЕТНЫЙ',
    features: [
      'Зоны доставки А и Б',
      'Real-time радар дрона',
      'SMS-оповещение',
      'Развернутые логи',
      'Приоритет в очереди',
    ],
  },
  {
    name: 'МАКСИМУМ',
    price: '1 500',
    unit: '₸ / вылет',
    zone: 'до 4 км',
    time: '~20 мин',
    weight: 'до 2 кг',
    color: 'border-accent/40',
    glow: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
    icon: <Rocket className="w-5 h-5 text-accent" />,
    badge: null,
    features: [
      'Полный радиус (Все зоны)',
      'Real-time радар + камера',
      'Мгновенные оповещения',
      'Полная телеметрия',
      'Приоритет + страховкa',
      'Поддержка 24/7 (VIP канал)',
    ],
  },
]

const FAQ = [
  {
    q: 'АЛГОРИТМ РАСЧЕТА СТОИМОСТИ',
    a: 'Система учитывает удаленность точки сброса от базы и массу полезной нагрузки. Базовая ставка зависит от зоны, к ней плюсуется коэффициент веса.',
  },
  {
    q: 'ПРОТОКОЛ ОТМЕНЫ МИССИИ',
    a: 'Допускается ручная отмена до получения статуса "В пути". После отрыва дрона от площадки прерывание миссии невозможно.',
  },
  {
    q: 'СБОЙ ДОСТАВКИ И КОМПЕНСАЦИИ',
    a: 'При невозможности завершить маршрут по техническим причинам дрона, система автоматически инициирует 100% возврат средств на баланс оператора.',
  },
  {
    q: 'РАСЧЕТНОЕ ВРЕМЯ ПОЛЕТА',
    a: 'Крейсерская скорость дрона обеспечивает доставку за 10–20 минут. На полетные характеристики могут влиять метеоусловия в Астане (ветер >15 м/с).',
  },
]

export default function Pricing() {
  return (
    <>
      <Head><title>Тарифные планы — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pb-24">
        
        {/* Hero Section */}
        <section className="pt-32 pb-16 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-4 py-1.5 rounded-full mb-6"
            >
              <Zap className="w-4 h-4" />
              ПРОЗРАЧНАЯ ТАРИФИКАЦИЯ
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
            >
              Конфигурации доступа <span className="text-primary">Q'fly</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto"
            >
              Никаких скрытых сборов. Выделяйте бюджет только за фактическое использование полетного времени флота.
            </motion.p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6">
          {/* Plans Grid */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-20"
          >
            {PLANS.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                className={`glass-card rounded-3xl border ${plan.color} ${plan.glow} p-8 relative flex flex-col transition-all duration-300 hover:-translate-y-2 ${index === 1 ? 'md:-translate-y-4 bg-surface/80' : ''}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-background text-xs font-bold px-4 py-1 rounded-full tracking-widest shadow-[0_0_10px_rgba(56,189,248,0.5)]">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-background/50 border border-white/5">
                    {plan.icon}
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-widest">{plan.name}</h2>
                </div>

                <div className="mb-8">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl lg:text-5xl font-black text-white">{plan.price}</span>
                    <span className="text-slate-400 text-sm mb-1.5 font-mono">{plan.unit}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {[
                    { label: 'РАДИУС', value: plan.zone, icon: MapPin },
                    { label: 'ВРЕМЯ', value: plan.time, icon: Clock },
                    { label: 'МАССА', value: plan.weight, icon: Weight },
                  ].map((info) => (
                    <div key={info.label} className="bg-background/40 border border-white/5 rounded-xl p-3 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <info.icon className="w-3 h-3" />
                        {info.label}
                      </div>
                      <div className="text-sm font-semibold text-slate-200">{info.value}</div>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-10 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-slate-300">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${index === 1 ? 'text-primary' : 'text-slate-500'}`} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`block w-full text-center py-4 rounded-xl font-bold tracking-widest transition-all group ${
                    plan.badge
                      ? 'bg-primary text-background hover:bg-primary/90 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/40'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    ЗАПУСК ПРОТОКОЛА
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* Data Grid Calculator */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl p-8 lg:p-10 mb-20 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-accent/80" />
            
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Матрица стоимости полезной нагрузки</h2>
              <p className="text-slate-400 font-mono text-sm border-l-2 border-slate-600 pl-3">
                <span className="text-accent">Формула:</span> Итог = База + (500 ₸ × Масса в кг)
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-mono text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 text-slate-500 text-xs tracking-widest">
                    <th className="py-4 px-6">МАССА (КГ)</th>
                    <th className="py-4 px-6 text-slate-300">ЗОНА A (ДО 2 КМ)</th>
                    <th className="py-4 px-6 text-primary">ЗОНА Б (ДО 3.5 КМ)</th>
                    <th className="py-4 px-6 text-accent">ЗОНА В (ДО 4 КМ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[0.5, 1.0, 1.5, 2.0].map((w) => (
                    <tr key={w} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-6 font-semibold text-slate-300 group-hover:text-white">
                        {w.toFixed(1)} КГ
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {800 + Math.round(w * 500)} ₸
                      </td>
                      <td className="py-4 px-6 text-primary/80">
                        {1200 + Math.round(w * 500)} ₸
                      </td>
                      <td className="py-4 px-6 text-accent/80">
                        {1500 + Math.round(w * 500)} ₸
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Technical FAQ */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-20"
          >
            <h2 className="text-2xl font-bold text-white mb-8 tracking-tight flex items-center gap-3">
              <Terminal className="w-6 h-6 text-primary" />
              База знаний
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FAQ.map((item) => (
                <div key={item.q} className="bg-surface/40 border border-white/5 rounded-2xl p-6 hover:bg-surface/60 transition-colors">
                  <div className="flex items-start gap-3 mb-3">
                    <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    <h3 className="font-semibold text-slate-200 font-mono text-sm tracking-wide">{item.q}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed pl-8">{item.a}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative rounded-3xl p-10 text-center overflow-hidden border border-primary/20"
          >
            {/* Анимированный фон для CTA */}
            <div className="absolute inset-0 bg-primary/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">Готовы к первому запуску?</h2>
              <p className="text-slate-300 mb-8 max-w-xl mx-auto">
                Создание профиля оператора бесплатно. Вы оплачиваете только успешные миссии по доставке.
              </p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-3 bg-white text-background px-8 py-4 rounded-xl font-bold tracking-wide hover:scale-105 transition-transform"
              >
                СОЗДАТЬ АККАУНТ
                <Rocket className="w-5 h-5" />
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}