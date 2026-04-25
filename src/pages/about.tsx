import Head from 'next/head'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { motion, Variants } from 'framer-motion'
import { 
  Zap, 
  Weight, 
  Crosshair, 
  ShieldCheck, 
  AlertTriangle, 
  Map, 
  Clock, 
  Terminal,
  Loader2,
  XOctagon
} from 'lucide-react'

// Строго типизированные анимации
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

// В начале файла About.tsx измени импорт:
const InfrastructureMap = dynamic(() => import('@/components/InfrastructureMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] glass-card rounded-3xl flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <span className="text-primary font-mono text-xs tracking-widest">ИНИЦИАЛИЗАЦИЯ ГЛОБАЛЬНОЙ СЕТИ...</span>
    </div>
  ),
})

// Внутри return функции About заменить:
// <InfrastructureMap />

const ZONES = [
  {
    label: 'ЗОНА А (БАЗОВАЯ)',
    range: 'ДО 2 КМ',
    price: '800 ₸',
    color: 'border-white/10',
    indicator: 'bg-slate-400',
    time: '~10 МИН',
  },
  {
    label: 'ЗОНА Б (РАСШИРЕННАЯ)',
    range: '2.0 – 3.5 КМ',
    price: '1 200 ₸',
    color: 'border-primary/30',
    indicator: 'bg-primary',
    time: '~15 МИН',
  },
  {
    label: 'ЗОНА В (МАКСИМУМ)',
    range: '3.5 – 4.0 КМ',
    price: '1 500 ₸',
    color: 'border-accent/40',
    indicator: 'bg-accent',
    time: '~20 МИН',
  },
]

export default function About() {
  return (
    <>
      <Head><title>Параметры сети — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pt-24 pb-20 overflow-hidden">

        {/* Hero Section */}
        <section className="relative mb-16">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-surface/50 border border-white/10 text-slate-300 text-xs font-mono px-4 py-1.5 rounded-full mb-6"
            >
              <Map className="w-4 h-4 text-primary" />
              ИНФРАСТРУКТУРА СЕТИ
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
            >
              Архитектура доставки <span className="text-primary">Q'fly</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400 font-light max-w-2xl mx-auto"
            >
              Покрываем радиус до 4 км от центрального хаба в Астане. Воздушный коридор гарантирует прибытие груза без задержек.
            </motion.p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 relative z-10">

          {/* Интерактивный радар (Карта) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-3">
                  <Crosshair className="w-6 h-6 text-primary" />
                  Тактическая карта покрытия
                </h2>
                <p className="text-slate-400 font-mono text-sm mt-1 border-l-2 border-primary/50 pl-3">
                  АКТИВНЫЕ ЗОНЫ ДОСТУПНОСТИ БОРТОВ
                </p>
              </div>
            </div>
            
            <div className="glass-card rounded-3xl overflow-hidden border-white/10 p-2">
              <div className="rounded-2xl overflow-hidden relative">
                {/* Эффект скан-линии поверх карты */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,transparent_0%,rgba(56,189,248,0.05)_50%,transparent_100%)] h-[200%] animate-[scan_6s_linear_infinite]" />
                <InfrastructureMap/>
              </div>
            </div>
          </motion.div>

          {/* Легенда зон */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20"
          >
            {ZONES.map((zone) => (
              <motion.div 
                key={zone.label} 
                variants={itemVariants}
                className={`bg-surface/40 border ${zone.color} rounded-2xl p-6 relative overflow-hidden group hover:bg-surface/60 transition-colors`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${zone.indicator} shadow-[0_0_10px_currentColor]`} />
                  <div className="font-bold text-white text-sm tracking-widest">{zone.label}</div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-mono">РАДИУС</span>
                    <span className="text-slate-200 font-mono">{zone.range}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-mono">БАЗОВАЯ СТАВКА</span>
                    <span className="text-primary font-bold">{zone.price}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono">РАСЧЕТНОЕ ВРЕМЯ</span>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {zone.time}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Технические характеристики */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20"
          >
            {[
              {
                icon: Zap,
                title: 'ПРЯМАЯ ТРАЕКТОРИЯ',
                desc: 'Полет осуществляется по вектору без учета наземного трафика. Среднее время выполнения миссии составляет 15 минут.',
              },
              {
                icon: Weight,
                title: 'ПОЛЕЗНАЯ НАГРУЗКА',
                desc: 'Конструкция дрона рассчитана на транспортировку грузов до 2 кг. Идеально для документов, медикаментов и малогабаритной электроники.',
              },
              {
                icon: Crosshair,
                title: 'ТОЧНОЕ ПОЗИЦИОНИРОВАНИЕ',
                desc: 'Системы GPS и ГЛОНАСС обеспечивают погрешность сброса не более 1 метра от заданных оператором координат.',
              },
              {
                icon: ShieldCheck,
                title: 'БЕЗОПАСНОСТЬ ПОЛЕТОВ',
                desc: 'Маршруты пролегают в согласованных зонах воздушного пространства. Каждый борт оснащен системой парашютного спасения.',
              },
            ].map((f) => (
              <motion.div key={f.title} variants={itemVariants} className="glass-card rounded-2xl p-6 flex gap-5">
                <div className="p-3 bg-surface/80 border border-white/10 rounded-xl h-fit">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-2 tracking-wide">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Ограничения (Красная зона) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-2xl p-8 mb-20 border border-accent/30 bg-accent/5 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
            <div className="absolute -right-10 -top-10 opacity-5 pointer-events-none">
              <AlertTriangle className="w-64 h-64 text-accent" />
            </div>

            <h3 className="font-bold text-accent mb-6 flex items-center gap-3 text-lg tracking-widest">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              КРИТИЧЕСКИЕ ОГРАНИЧЕНИЯ (ЗАПРЕЩЕНО К ПЕРЕВОЗКЕ)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {[
                'ХРУПКИЕ ПРЕДМЕТЫ БЕЗ УПАКОВКИ',
                'ОПАСНЫЕ И ГОРЮЧИЕ ВЕЩЕСТВА',
                'ЖИВЫЕ ОРГАНИЗМЫ / ЖИВОТНЫЕ',
                'ПРЕДМЕТЫ МАССОЙ СВЫШЕ 2.0 КГ',
                'СКОРОПОРТЯЩИЕСЯ ПРОДУКТЫ',
                'ЦЕННОСТИ БЕЗ ОБЪЯВЛЕННОЙ СТРАХОВКИ',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-mono text-accent/80 bg-accent/10 border border-accent/20 rounded-lg px-4 py-2.5">
                  <XOctagon className="w-4 h-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-[2rem] p-10 text-center border-primary/20 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary/5" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-3">Готовы к запуску?</h2>
              <p className="text-slate-400 mb-8">Интеграция в систему и первая тестовая миссия займут менее двух минут.</p>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 bg-white text-background px-8 py-4 rounded-xl font-bold tracking-widest hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Terminal className="w-5 h-5" />
                ПОЛУЧИТЬ ДОСТУП В ТЕРМИНАЛ
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}