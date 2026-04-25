import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  LogOut, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Save
} from 'lucide-react'

export default function Profile() {
  const router = useRouter()
  const [form, setForm] = useState({ full_name: '', phone: '', address: '' })
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (data) {
          setForm({
            full_name: data.full_name || '',
            phone: data.phone || '',
            address: data.address || '',
          })
        }
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: form.full_name,
        phone: form.phone,
        address: form.address,
      })

    if (updateError) {
      setError('Ошибка связи с сервером. Повторите попытку.')
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <span className="text-primary/70 font-mono text-sm tracking-widest">СИНХРОНИЗАЦИЯ...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>Профиль оператора — Q'fly</title></Head>

      {/* Основной контейнер с сеткой на фоне */}
      <div className="min-h-screen bg-background bg-grid-pattern pb-20">
        <div className="max-w-2xl mx-auto px-6 pt-24">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Личный терминал</h1>
            <p className="text-slate-400 font-mono text-sm">ID: {email.split('@')[0] || 'GUEST_MODE'}</p>
          </motion.div>

          {/* Карточка пользователя */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 mb-6 flex items-center gap-5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary neon-glow" />
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <User className="w-8 h-8" />
            </div>
            <div>
              <p className="font-semibold text-white text-lg">
                {form.full_name || 'Позывной не задан'}
              </p>
              <p className="text-primary/80 font-mono text-sm">{email}</p>
            </div>
          </motion.div>

          {/* Уведомления */}
          <div className="h-14 mb-4">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-accent/10 border border-accent/30 text-accent text-sm px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-success/10 border border-success/30 text-success text-sm px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  Протокол обновлен: данные сохранены
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Форма */}
          <motion.form 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleSubmit} 
            className="glass-card rounded-2xl p-6 space-y-6"
          >
            <h2 className="font-semibold text-white/90 text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Конфигурация профиля
            </h2>

            <div className="space-y-4">
              <div className="relative group">
                <label className="block text-xs font-mono text-slate-400 mb-1.5">ПОЛНОЕ ИМЯ</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="full_name"
                    type="text"
                    placeholder="Алибек Сейткали"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-xs font-mono text-slate-400 mb-1.5">ТЕЛЕФОН СВЯЗИ</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+7 777 000 00 00"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-xs font-mono text-slate-400 mb-1.5">
                  БАЗОВЫЙ АДРЕС (АСТАНА)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="address"
                    type="text"
                    placeholder="ул. Достык 1"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-white/5 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="relative opacity-70">
                <label className="block text-xs font-mono text-slate-400 mb-1.5">СИСТЕМНЫЙ EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-surface/30 border border-transparent rounded-xl pl-12 pr-4 py-3 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:neon-glow py-3.5 rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  ПРИМЕНЕНИЕ...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  СОХРАНИТЬ КОНФИГУРАЦИЮ
                </>
              )}
            </button>
          </motion.form>

          {/* Danger zone */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 glass-card rounded-2xl p-6 border-red-500/10"
          >
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-accent/20 text-accent/80 hover:text-accent hover:bg-accent/10 py-3.5 rounded-xl font-medium transition-all"
            >
              <LogOut className="w-5 h-5" />
              ОТКЛЮЧИТЬСЯ ОТ СЕТИ
            </button>
          </motion.div>
        </div>
      </div>
    </>
  )
}