import Head from 'next/head'
import Link from 'next/link'
import { motion, Variants } from 'framer-motion'
import { 
  Navigation, 
  Home, 
  Terminal, 
  WifiOff, 
  AlertTriangle 
} from 'lucide-react'

// Типизированные варианты для появления элементов
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.15 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function NotFound() {
  return (
    <>
      <Head><title>Сбой связи (404) | Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern flex flex-col items-center justify-center px-6 text-center relative overflow-hidden">
        
        {/* Фоновое аварийное свечение */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] pointer-events-none animate-pulse-slow" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-center"
        >
          {/* Индикатор потери сигнала */}
          <motion.div variants={itemVariants} className="flex items-center gap-2 text-accent bg-accent/10 border border-accent/20 px-4 py-1.5 rounded-full font-mono text-xs mb-8 tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <WifiOff className="w-4 h-4" />
            СИГНАЛ ПРЕРВАН
          </motion.div>

          {/* Анимированный "потерянный" дрон */}
          <motion.div 
            variants={itemVariants}
            className="relative w-40 h-40 mb-12 flex items-center justify-center"
          >
            {/* Круги "поиска" радара */}
            <div className="absolute inset-0 border border-accent/20 rounded-full animate-[ping_3s_linear_infinite]" />
            <div className="absolute inset-4 border border-dashed border-slate-700 rounded-full animate-[spin_10s_linear_infinite]" />
            
            <motion.div
              animate={{ 
                y: [-15, 15, -15], 
                rotateZ: [-10, 10, -10],
                x: [-5, 5, -5]
              }}
              transition={{ 
                duration: 5, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative z-10 glass-card p-5 rounded-2xl border-accent/30 shadow-[0_0_30px_rgba(244,63,94,0.1)]"
            >
              <Navigation className="w-12 h-12 text-slate-500 transform rotate-45" />
              <AlertTriangle className="absolute -bottom-2 -right-2 w-6 h-6 text-accent fill-background" />
            </motion.div>
          </motion.div>

          {/* Текстовый блок */}
          <motion.div variants={itemVariants} className="mb-2 relative">
            <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter">
              404
            </h1>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="text-2xl font-bold text-white mb-4 tracking-wide">
            КООРДИНАТЫ НЕ НАЙДЕНЫ
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-slate-400 max-w-md mb-10 font-mono text-sm leading-relaxed">
            Запрашиваемый сектор пространства отсутствует в базе данных системы. Возможно, борт отклонился от курса или страница была удалена.
          </motion.p>

          {/* Кнопки возврата */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 bg-primary text-background px-8 py-3.5 rounded-xl font-bold tracking-wide hover:scale-105 transition-transform shadow-[0_0_20px_rgba(56,189,248,0.2)]"
            >
              <Home className="w-5 h-5" />
              НА БАЗУ
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 bg-surface/50 border border-white/10 text-white px-8 py-3.5 rounded-xl font-medium tracking-wide hover:bg-surface hover:border-white/30 transition-all backdrop-blur-sm"
            >
              <Terminal className="w-5 h-5 text-slate-400" />
              В ТЕРМИНАЛ
            </Link>
          </motion.div>
        </motion.div>

      </div>
    </>
  )
}