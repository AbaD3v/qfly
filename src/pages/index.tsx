import Head from 'next/head'
import Link from 'next/link'
import { motion, Variants } from 'framer-motion'
import { 
  Navigation, 
  MapPin, 
  Weight, 
  Timer, 
  Info, 
  Route, 
  PlaneTakeoff, 
  PackageCheck,
  ChevronRight,
  Crosshair
} from 'lucide-react'

// Анимации
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
}

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 }
  }
}

export default function Home() {
  return (
    <>
      <Head>
        <title>Q'fly — Быстрая доставка дронами в Астане</title>
        <meta name="description" content="Воздушная доставка посылок до 30 кг в радиусе 15 км. Без пробок и задержек." />
      </Head>

      <div className="min-h-screen bg-background bg-grid-pattern overflow-hidden selection:bg-primary/30 selection:text-primary">
        
        {/* HERO SECTION */}
        <section className="relative min-h-screen flex items-center pt-20 pb-16">
          {/* Свечение на фоне */}
          <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10 w-full">
            
            {/* Левая часть: Текст */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-surface/80 border border-white/10 backdrop-blur-md text-slate-300 text-xs font-medium px-4 py-2 rounded-full mb-6">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                РАБОТАЕМ В АСТАНЕ · ЗОНА ПОКРЫТИЯ ДО 15 КМ
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter mb-6">
                ДОСТАВКА <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                  БЕЗ ПРОБОК
                </span>
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg lg:text-xl text-slate-400 mb-10 max-w-lg font-light leading-relaxed">
                Первый сервис воздушной курьерской доставки. Доставляем посылки до 30 кг за считанные минуты, минуя светофоры и городской трафик.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4">
                <Link 
                  href="/auth/register" 
                  className="relative group flex items-center justify-center gap-3 bg-primary text-background px-8 py-4 rounded-xl font-bold tracking-wide overflow-hidden transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(56,189,248,0.3)] hover:shadow-[0_0_30px_rgba(56,189,248,0.5)]"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                  <span className="relative">ОФОРМИТЬ ДОСТАВКУ</span>
                  <ChevronRight className="w-5 h-5 relative group-hover:translate-x-1 transition-transform" />
                </Link>
                
                <Link 
                  href="/about" 
                  className="flex items-center justify-center gap-3 bg-surface/50 border border-white/10 text-white px-8 py-4 rounded-xl font-medium hover:bg-surface hover:border-white/30 transition-all backdrop-blur-sm"
                >
                  <Info className="w-5 h-5 text-slate-400" />
                  О СЕРВИСЕ
                </Link>
              </motion.div>
            </motion.div>

            {/* Правая часть: UI Радар дрона */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative w-80 h-80 md:w-96 md:h-96 flex items-center justify-center">
                {/* Радарные круги (оставил для красоты, но сделал мягче) */}
                <div className="absolute inset-0 border border-primary/20 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-4 border border-dashed border-primary/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                <div className="absolute inset-16 border border-white/5 rounded-full" />
                
                {/* Перекрестие */}
                <Crosshair className="absolute w-full h-full text-primary/5 stroke-[0.5]" />

                {/* Дрон */}
                <motion.div 
                  animate={{ y: [-10, 10, -10], rotateZ: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 glass-card p-6 rounded-2xl border-primary/30 shadow-[0_0_30px_rgba(56,189,248,0.2)]"
                >
                  <Navigation className="w-16 h-16 text-primary transform rotate-45" />
                  <div className="absolute -bottom-3 -right-3 bg-background border border-primary/50 text-primary text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-widest">
                    Борт онлайн
                  </div>
                </motion.div>

                {/* Индикаторы */}
                <motion.div 
                  className="absolute top-10 right-0 glass-card px-3 py-1.5 rounded-lg border-success/30 flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <div className="w-1.5 h-1.5 bg-success rounded-full" />
                  <span className="text-xs font-medium text-success">GPS АКТИВЕН</span>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ПРЕИМУЩЕСТВА (Статистика) */}
        <section className="py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {[
                { value: '≤ 2', unit: 'КГ', label: 'МАКСИМАЛЬНЫЙ ВЕС', icon: Weight },
                { value: '15', unit: 'КМ', label: 'ЗОНА ДОСТАВКИ', icon: MapPin },
                { value: '~15', unit: 'МИН', label: 'СРЕДНЕЕ ВРЕМЯ', icon: Timer },
              ].map((s, i) => (
                <motion.div key={i} variants={fadeUp} className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <s.icon className="w-24 h-24 text-primary" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-5xl font-black text-white tracking-tighter">{s.value}</span>
                      <span className="text-primary font-bold text-sm ml-1">{s.unit}</span>
                    </div>
                    <div className="text-slate-400 font-medium text-xs tracking-widest uppercase">{s.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ПРОЦЕСС РАБОТЫ */}
        <section className="py-24 relative z-10 bg-surface/30 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">КАК ЭТО РАБОТАЕТ</h2>
              <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
            </div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-4 gap-8 relative"
            >
              {/* Линия связи между шагами */}
              <div className="hidden md:block absolute top-12 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

              {[
                { step: '01', icon: MapPin, title: 'Оформление', desc: 'Укажите адреса и вес посылки в нашем приложении.' },
                { step: '02', icon: Route, title: 'Маршрутизация', desc: 'Система подберет дрон и построит оптимальный маршрут.' },
                { step: '03', icon: PlaneTakeoff, title: 'Полет', desc: 'Дрон автономно и безопасно доставит груз по воздуху.' },
                { step: '04', icon: PackageCheck, title: 'Вручение', desc: 'Посылка аккуратно опускается получателю в точке назначения.' },
              ].map((item) => (
                <motion.div key={item.step} variants={fadeUp} className="relative z-10 text-center">
                  <div className="w-24 h-24 mx-auto bg-background border border-white/10 rounded-2xl flex items-center justify-center mb-6 relative group transition-colors hover:border-primary/50 hover:bg-surface shadow-lg">
                    <div className="absolute -top-3 -right-3 bg-primary text-background font-bold text-xs px-2.5 py-1 rounded-lg shadow-lg">
                      {item.step}
                    </div>
                    <item.icon className="w-10 h-10 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="font-bold text-white mb-2 text-lg">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed max-w-[200px] mx-auto">{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="py-32 relative z-10">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-[2.5rem] p-12 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/5" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
              
              <div className="relative z-10">
                <h2 className="text-4xl font-black text-white mb-4">ГОТОВЫ ОТПРАВИТЬ ПОСЫЛКУ?</h2>
                <p className="text-slate-400 mb-10 text-lg font-light">
                  Зарегистрируйтесь в системе Q'fly, чтобы получить доступ к быстрой курьерской доставке нового поколения.
                </p>
                <Link 
                  href="/auth/register" 
                  className="inline-flex items-center gap-3 bg-white text-background px-10 py-5 rounded-2xl font-bold tracking-widest hover:scale-105 transition-transform shadow-xl shadow-white/10"
                >
                  ЗАРЕГИСТРИРОВАТЬСЯ
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 border-t border-white/5 bg-background relative z-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <span className="text-background font-bold text-xs">Q</span>
              </div>
              <span className="text-white font-bold tracking-widest">Q'FLY</span>
            </div>
            <div className="text-slate-500 text-xs font-medium">
              © {new Date().getFullYear()} Q'FLY LOGISTICS. АСТАНА, КАЗАХСТАН.
            </div>
          </div>
        </footer>

      </div>
    </>
  )
}