import Head from 'next/head'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  Terminal, 
  Mail, 
  HelpCircle, 
  Package, 
  CreditCard, 
  ShieldAlert,
  Radio
} from 'lucide-react'

const FAQS = [
  {
    category: 'ДОСТАВКА',
    icon: Package,
    items: [
      {
        q: 'Каково расчетное время подлета?',
        a: 'В среднем 10–20 минут в зависимости от расстояния. Зона А (до 2 км) — около 10 минут, Зона В (до 4 км) — около 20 минут.',
      },
      {
        q: 'Каковы лимиты полезной нагрузки?',
        a: 'Максимальный вес — 2 кг. Это позволяет безопасно транспортировать документы, еду, небольшие товары и медикаменты.',
      },
      {
        q: 'Каков радиус действия системы?',
        a: 'Флот покрывает радиус до 4 км от точки запуска в Астане. Точные границы зон можно изучить на радаре в разделе "База знаний".',
      },
      {
        q: 'Как влияют метеоусловия на вылеты?',
        a: 'При критических погодных условиях (шквальный ветер, ливень, снегопад) полеты автоматически блокируются системой. В таком случае миссия отменяется с полным возвратом средств.',
      },
    ],
  },
  {
    category: 'ТРАНЗАКЦИИ',
    icon: Terminal,
    items: [
      {
        q: 'Как инициировать миссию доставки?',
        a: 'Авторизуйтесь в терминале, выберите "Новый заказ", введите координаты и массу. Бортовой компьютер автоматически рассчитает бюджет вылета.',
      },
      {
        q: 'Допускается ли прерывание миссии?',
        a: 'Да, операцию можно отменить до присвоения статуса "В пути". После отрыва дрона от базы отмена протокола невозможна.',
      },
      {
        q: 'Как получить доступ к телеметрии?',
        a: 'В личном кабинете кликните на активный заказ — откроется радар с трансляцией статуса и местоположения в реальном времени.',
      },
      {
        q: 'Протокол при сбое доставки?',
        a: 'При техническом сбое по вине флота инициируется 100% возврат средств. Связь с диспетчером доступна через личный профиль.',
      },
    ],
  },
  {
    category: 'БЮДЖЕТ',
    icon: CreditCard,
    items: [
      {
        q: 'Алгоритм тарификации?',
        a: 'Базовая ставка привязана к зоне (800–1500 ₸). Дополнительно применяется весовой коэффициент: 500 ₸ за каждый килограмм нагрузки.',
      },
      {
        q: 'Поддерживаемые шлюзы оплаты?',
        a: 'Оплата производится через защищенный шлюз в личном кабинете при формировании заявки. Принимаются карты стандартов Visa и Mastercard.',
      },
      {
        q: 'Предусмотрены ли уровни допуска со скидками?',
        a: 'В разработке находится программа лояльности. Активные операторы получат специальные тарифные сетки.',
      },
    ],
  },
  {
    category: 'БЕЗОПАСНОСТЬ',
    icon: ShieldAlert,
    items: [
      {
        q: 'Перечень запрещенного груза?',
        a: 'К транспортировке не допускаются: взрывоопасные и токсичные вещества, живые организмы, незакрепленные хрупкие предметы, скоропортящиеся продукты без термобокса.',
      },
      {
        q: 'Степень надежности автопилота?',
        a: 'Полеты осуществляются строго в согласованных воздушных коридорах РК. Аппараты оснащены дублирующими системами навигации и предотвращения столкновений.',
      },
      {
        q: 'Защита личных данных?',
        a: 'Координаты и данные профиля шифруются по стандарту AES-256. Передача информации третьим лицам исключена архитектурой системы.',
      },
    ],
  },
]

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${
        open ? 'bg-surface/60 border-primary/30' : 'bg-surface/30 border-white/5 hover:border-white/20'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none group"
      >
        <span className={`font-medium tracking-wide transition-colors ${open ? 'text-primary' : 'text-slate-200 group-hover:text-white'}`}>
          {q}
        </span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${open ? 'bg-primary/10' : 'bg-white/5 group-hover:bg-white/10'}`}>
          <ChevronDown 
            className={`w-4 h-4 transition-transform duration-300 ${open ? 'rotate-180 text-primary' : 'text-slate-400'}`} 
          />
        </div>
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-5 pt-1 border-t border-white/5">
              <p className="text-slate-400 text-sm leading-relaxed pl-2 border-l-2 border-primary/30">
                {a}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function FAQ() {
  return (
    <>
      <Head><title>База знаний — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pt-24 pb-20">

        {/* Hero Section */}
        <section className="relative mb-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-32 bg-primary/20 blur-[80px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-mono px-4 py-1.5 rounded-full mb-6"
            >
              <HelpCircle className="w-4 h-4" />
              ИНФОРМАЦИОННЫЙ ЦЕНТР
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight"
            >
              Справочник оператора
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400"
            >
              Регламенты, протоколы и техническая документация системы Q'fly
            </motion.p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          
          {/* FAQ Секции */}
          <div className="space-y-12">
            {FAQS.map((section, secIndex) => (
              <motion.div 
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-background border border-white/10 rounded-lg">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
                    <span className="text-slate-600 font-mono text-sm">[{String(secIndex + 1).padStart(2, '0')}]</span>
                    {section.category}
                  </h2>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-white/10 to-transparent ml-4" />
                </div>
                
                <div className="space-y-3 pl-2 md:pl-11">
                  {section.items.map((item, i) => (
                    <FaqItem key={item.q} q={item.q} a={item.a} index={i} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Блок поддержки */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 relative glass-card rounded-3xl p-8 md:p-12 text-center overflow-hidden border-primary/20"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Radio className="w-32 h-32" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3 tracking-wide">Требуется помощь диспетчера?</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                Если вы не нашли нужный протокол, установите прямую связь с центром управления полетами.
              </p>
              <a
                href="mailto:support@qfly.kz"
                className="inline-flex items-center gap-3 bg-white text-background px-8 py-4 rounded-xl font-bold tracking-wide hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                <Mail className="w-5 h-5" />
                ЗАПРОСИТЬ СВЯЗЬ (support@qfly.kz)
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}