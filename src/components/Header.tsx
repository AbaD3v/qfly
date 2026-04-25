import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { motion, Variants } from 'framer-motion'
import { 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Terminal, 
  Map, 
  CreditCard 
} from 'lucide-react'

// Анимация выезда хедера при загрузке
const headerVariants: Variants = {
  hidden: { y: -100, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 30 } }
}

export default function Header() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [scrolled, setScrolled] = useState(false)

  const isTransparentPage = router.pathname === '/'

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isTransparentPage) return
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [isTransparentPage])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Стилизация активной ссылки (Неоновое свечение)
  const isActive = (path: string) =>
    router.pathname.startsWith(path) && path !== '/' || router.pathname === path
      ? 'text-primary font-bold drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]'
      : 'text-slate-400 hover:text-white'

  // Логика фона: если главная и не скроллили -> прозрачный. Иначе -> стекло.
  const navBg = isTransparentPage && !scrolled
    ? 'bg-transparent border-transparent'
    : 'bg-background/80 backdrop-blur-lg border-b border-white/5 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'

  return (
    <motion.nav 
      variants={headerVariants}
      initial="hidden"
      animate="show"
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* Логотип */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <span className="text-primary font-bold text-xl">Q</span>
          </div>
          <span className="text-xl font-black text-white tracking-widest hidden sm:block">
            Q'FLY
          </span>
        </Link>

        {/* Навигация */}
        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest">
            <Link href="/about" className={`flex items-center gap-2 transition-all ${isActive('/about')}`}>
              <Map className="w-4 h-4" />
              ИНФРАСТРУКТУРА
            </Link>
            <Link href="/pricing" className={`flex items-center gap-2 transition-all ${isActive('/pricing')}`}>
              <CreditCard className="w-4 h-4" />
              ТАРИФЫ
            </Link>
          </div>

          <div className="h-6 w-px bg-white/10 hidden md:block" /> {/* Разделитель */}

          {user ? (
            <div className="flex items-center gap-4 md:gap-6 font-mono text-xs tracking-widest">
              <Link href="/dashboard" className={`hidden md:flex items-center gap-2 transition-all ${isActive('/dashboard')}`}>
                <Terminal className="w-4 h-4" />
                ТЕРМИНАЛ
              </Link>
              
              <Link href="/profile" className={`hidden sm:flex items-center gap-2 transition-all ${isActive('/profile')}`}>
                <UserIcon className="w-4 h-4" />
                ПРОФИЛЬ
              </Link>
              
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-accent transition-colors flex items-center gap-2"
                title="Отключиться от сети"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">ВЫХОД</span>
              </button>

              <Link 
                href="/order/new" 
                className="flex items-center gap-2 bg-primary text-background px-4 py-2.5 rounded-lg font-bold hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:block">ЗАПУСК</span>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-4 md:gap-6 font-mono text-xs tracking-widest">
              <Link href="/auth/login" className={`transition-all ${isActive('/auth/login')}`}>
                ВХОД
              </Link>
              <Link
                href="/auth/register"
                className="bg-white text-background px-5 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:scale-105"
              >
                ПОЛУЧИТЬ ДОСТУП
              </Link>
            </div>
          )}
        </div>
        
      </div>
    </motion.nav>
  )
}