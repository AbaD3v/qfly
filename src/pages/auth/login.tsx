import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { motion, Variants } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  LogIn, 
  Loader2, 
  AlertTriangle,
  Terminal
} from 'lucide-react'

// Анимационные пресеты со строгой типизацией
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
}

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (signInError) {
        setError('В ДОСТУПЕ ОТКАЗАНО: Неверный email или код доступа.')
        setLoading(false)
        return
      }

      if (data.session) {
        const next = router.query.next as string | undefined
        router.push(next && next.startsWith('/') ? next : '/dashboard')
      } else {
        setError('ОШИБКА СЕССИИ: Не удалось установить защищенное соединение.')
        setLoading(false)
      }
    } catch {
      setError('КРИТИЧЕСКАЯ ОШИБКА: Потеря связи с сервером аутентификации.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Авторизация — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center px-6 relative overflow-hidden">
        
        {/* Аварийное свечение на фоне */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-md relative z-10"
        >
          {/* Форма / Терминал */}
          <div className="glass-card rounded-[2rem] p-8 md:p-10 relative overflow-hidden">
            {/* Блик на стекле */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

            <motion.div variants={itemVariants} className="text-center mb-10">
              <Link href="/" className="inline-flex items-center gap-2 group mb-6">
                <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-[0_0_15px_rgba(56,189,248,0.2)]">
                  <span className="text-primary font-bold text-xl">Q</span>
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-white tracking-wide flex items-center justify-center gap-2">
                <Terminal className="w-5 h-5 text-primary" />
                ВХОД В СИСТЕМУ
              </h1>
              <p className="text-slate-500 font-mono text-xs mt-2 tracking-widest">
                ВВЕДИТЕ ДАННЫЕ ОПЕРАТОРА
              </p>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="font-mono text-xs leading-relaxed">{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="СИСТЕМНЫЙ EMAIL"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="КОД ДОСТУПА"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-mono text-sm"
                />
              </motion.div>

              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-background py-4 rounded-xl font-bold tracking-widest text-sm hover:bg-primary/90 transition-all shadow-[0_0_20px_rgba(56,189,248,0.3)] disabled:opacity-50 disabled:cursor-not-allowed group mt-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    ПОДКЛЮЧЕНИЕ...
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    УСТАНОВИТЬ СОЕДИНЕНИЕ
                  </>
                )}
              </motion.button>
            </form>

            <motion.p variants={itemVariants} className="text-center text-slate-500 font-mono text-xs mt-8">
              НЕТ ДОПУСКА?{' '}
              <Link href="/auth/register" className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary">
                ИНИЦИАЛИЗАЦИЯ ПРОФИЛЯ
              </Link>
            </motion.p>

          </div>
        </motion.div>
      </div>
    </>
  )
}