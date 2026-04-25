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
  Save,
  ShieldCheck
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
      setError('Не удалось сохранить данные. Пожалуйста, попробуйте еще раз.')
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
          <span className="text-slate-400 text-sm font-medium">Загрузка профиля...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head><title>Настройки профиля — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pb-20 pt-24 selection:bg-primary/30">
        <div className="max-w-2xl mx-auto px-6">
          
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Профиль</h1>
            <p className="text-slate-400 text-sm">Управляйте своими личными данными и контактной информацией</p>
          </motion.div>

          {/* Карточка пользователя */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-5 relative overflow-hidden border-white/5"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
            
            <div className="w-20 h-20 shrink-0 rounded-2xl bg-surface border border-white/5 flex items-center justify-center text-primary shadow-sm">
              <User className="w-10 h-10" />
            </div>
            
            <div className="flex-1 mt-1">
              <p className="font-bold text-white text-xl mb-1">
                {form.full_name || 'Имя не указано'}
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-500" />
                  {email}
                </span>
                {form.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-500" />
                    {form.phone}
                  </span>
                )}
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-green-500 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
              <ShieldCheck className="w-4 h-4" />
              Аккаунт подтвержден
            </div>
          </motion.div>

          {/* Уведомления */}
          <div className="mb-6">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                >
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0, scale: 0.95 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl flex items-center gap-3 backdrop-blur-sm"
                >
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  Изменения успешно сохранены
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
            className="glass-card rounded-[2rem] p-8 space-y-6 border-white/5 shadow-xl"
          >
            <h2 className="font-bold text-white/90 text-lg flex items-center gap-2 border-b border-white/5 pb-4">
              Личные данные
            </h2>

            <div className="space-y-5">
              <div className="relative group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Полное имя
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="full_name"
                    type="text"
                    placeholder="Алибек Сейткали"
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Номер телефона
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+7 777 000 00 00"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="relative group">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Домашний адрес
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" />
                  <input
                    name="address"
                    type="text"
                    placeholder="Астана, ул. Достык 1"
                    value={form.address}
                    onChange={handleChange}
                    className="w-full bg-surface/50 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="relative opacity-60 pointer-events-none">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Email (Логин)
                </label>
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

            <div className="pt-4 border-t border-white/5">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary text-background hover:bg-primary/90 hover:scale-[1.02] py-4 rounded-xl font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-primary/20"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Сохранить изменения
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {/* Danger zone */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Выйти из аккаунта
            </button>
          </motion.div>
          
        </div>
      </div>
    </>
  )
}