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
  AlertTriangle
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
        setError('Неверный email или пароль. Пожалуйста, проверьте данные.')
        setLoading(false)
        return
      }

      if (data.session) {
        const next = router.query.next as string | undefined
        router.push(next && next.startsWith('/') ? next : '/dashboard')
      } else {
        setError('Не удалось войти в аккаунт. Попробуйте позже.')
        setLoading(false)
      }
    } catch {
      setError('Ошибка связи с сервером. Проверьте подключение к интернету.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Вход в аккаунт — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern flex items-center justify-center px-6 relative overflow-hidden selection:bg-primary/30">
        
        {/* Мягкое свечение на фоне */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-md relative z-10"
        >
          {/* Форма */}
          <div className="glass-card rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden shadow-2xl border-white/5">
            {/* Блик на стекле */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            <motion.div variants={itemVariants} className="text-center mb-10">
              <Link href="/" className="inline-flex items-center gap-2 group mb-6">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-[0_0_20px_rgba(56,189,248,0.3)]">
                  <span className="text-background font-black text-2xl">Q</span>
                </div>
              </Link>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                С возвращением
              </h1>
              <p className="text-slate-400 text-sm mt-2">
                Войдите, чтобы управлять своими доставками
              </p>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm"
              >
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <motion.div variants={itemVariants} className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Ваш email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
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
                  placeholder="Пароль"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-sm"
                />
              </motion.div>

              <motion.button
                variants={itemVariants}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-background py-4 rounded-xl font-bold tracking-wide hover:bg-primary/90 transition-all shadow-lg hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Вход...
                  </>
                ) : (
                  <>
                    Войти в аккаунт
                    <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform ml-1" />
                  </>
                )}
              </motion.button>
            </form>

            <motion.p variants={itemVariants} className="text-center text-slate-400 text-sm mt-8">
              Нет аккаунта?{' '}
              <Link href="/auth/register" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Зарегистрироваться
              </Link>
            </motion.p>

          </div>
        </motion.div>
      </div>
    </>
  )
}