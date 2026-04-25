import Head from 'next/head'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  HelpCircle, 
  Package, 
  CreditCard, 
  ShieldCheck,
  Phone,
  Clock,
  MapPin
} from 'lucide-react'

// Обновленные тексты FAQ для клиентов
const FAQS = [
  {
    category: 'ДОСТАВКА',
    icon: Package,
    items: [
      {
        q: 'Сколько времени занимает доставка?',
        a: 'В среднем от 10 до 25 минут, в зависимости от расстояния. Благодаря полету по прямой, дроны не стоят в пробках и на светофорах.',
      },
      {
        q: 'Какой максимальный вес посылки?',
        a: 'Текущий флот позволяет перевозить посылки весом до 2 кг. Этого достаточно для доставки документов, ключей, небольших товаров или медикаментов.',
      },
      {
        q: 'В каких районах работает Q\'fly?',
        a: 'Мы доставляем грузы в радиусе до 15 км по Астане. Зона покрытия постоянно расширяется. Проверить свой адрес можно при оформлении заказа.',
      },
      {
        q: 'Что происходит при плохой погоде?',
        a: 'Безопасность — наш приоритет. При сильном ветре, ливне или снегопаде полеты временно приостанавливаются. В таких случаях мы предложим перенести доставку или вернем деньги.',
      },
    ],
  },
  {
    category: 'КАК ЗАКАЗАТЬ',
    icon: MapPin,
    items: [
      {
        q: 'Как оформить доставку?',
        a: 'Войдите в личный кабинет, нажмите "Создать заказ", укажите адрес отправителя, получателя и примерный вес посылки. Система сразу покажет точную стоимость.',
      },
      {
        q: 'Можно ли отменить заказ?',
        a: 'Да, вы можете бесплатно отменить заказ до того момента, как дрон вылетит на погрузку. После начала полета отмена невозможна.',
      },
      {
        q: 'Как отследить свою посылку?',
        a: 'Сразу после запуска дрона в личном кабинете появится интерактивная карта. Вы сможете в реальном времени видеть, где находится дрон и через сколько минут он прилетит.',
      },
      {
        q: 'Как происходит передача посылки?',
        a: 'По прибытии дрон зависнет на безопасной высоте и плавно опустит посылку на тросе в указанную точку (например, во двор или на специальную площадку).',
      },
    ],
  },
  {
    category: 'ОПЛАТА И ТАРИФЫ',
    icon: CreditCard,
    items: [
      {
        q: 'Из чего складывается стоимость?',
        a: 'Цена зависит от расстояния и веса посылки. Базовый тариф начинается от 800 ₸. Вы всегда видите итоговую сумму до подтверждения заказа.',
      },
      {
        q: 'Как я могу оплатить доставку?',
        a: 'Оплата списывается автоматически с привязанной банковской карты (Visa, Mastercard) после успешного подтверждения заказа в личном кабинете.',
      },
      {
        q: 'Есть ли скидки для постоянных клиентов?',
        a: 'Да, в ближайшее время мы запустим подписку Q\'fly Pass, которая даст бесплатную доставку или фиксированные скидки на регулярные заказы.',
      },
    ],
  },
  {
    category: 'БЕЗОПАСНОСТЬ',
    icon: ShieldCheck,
    items: [
      {
        q: 'Что запрещено отправлять дроном?',
        a: 'Мы не перевозим взрывчатые и горючие вещества, животных, оружие, а также очень хрупкие предметы без надежной упаковки.',
      },
      {
        q: 'Это безопасно для людей внизу?',
        a: 'Абсолютно. Дроны летают по безопасным коридорам, оснащены датчиками предотвращения столкновений и резервными парашютными системами.',
      },
      {
        q: 'Кто несет ответственность за потерю груза?',
        a: 'Все посылки застрахованы на время полета. В случае форс-мажора (что бывает крайне редко) мы полностью компенсируем стоимость доставки и утерянного груза.',
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
        open ? 'bg-surface border-primary/30' : 'bg-surface/30 border-white/5 hover:border-white/20'
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none group"
      >
        <span className={`font-bold transition-colors ${open ? 'text-primary' : 'text-slate-200 group-hover:text-white'}`}>
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
              <p className="text-slate-400 text-sm leading-relaxed pl-3 border-l-[3px] border-primary/30">
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
      <Head><title>Вопросы и ответы — Q'fly</title></Head>

      <div className="min-h-screen bg-background bg-grid-pattern pt-24 pb-20">

        {/* Hero Section */}
        <section className="relative mb-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-32 bg-primary/10 blur-[80px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 bg-surface border border-white/10 text-slate-300 text-sm font-medium px-4 py-2 rounded-full mb-6 shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              Поддержка
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight"
            >
              Частые вопросы
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-400"
            >
              Всё, что нужно знать о воздушной доставке Q'fly
            </motion.p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-6 relative z-10">
          
          {/* FAQ Секции */}
          <div className="space-y-12">
            {FAQS.map((section) => (
              <motion.div 
                key={section.category}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-2.5 bg-surface border border-white/5 rounded-xl shadow-sm">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {section.category}
                  </h2>
                  <div className="flex-1 h-px bg-white/5 ml-4" />
                </div>
                
                <div className="space-y-3 pl-0 md:pl-[3.25rem]">
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
            className="mt-20 relative glass-card rounded-[2rem] p-8 md:p-12 text-center overflow-hidden border-white/5 shadow-xl"
          >
            <div className="absolute inset-0 bg-primary/5" />
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Phone className="w-32 h-32" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">Не нашли ответ на свой вопрос?</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Служба поддержки Q'fly работает круглосуточно. Напишите нам, и мы поможем решить любую проблему.
              </p>
              <a
                href="mailto:support@qfly.kz"
                className="inline-flex items-center gap-3 bg-white text-background px-8 py-4 rounded-xl font-bold hover:scale-105 transition-transform shadow-md"
              >
                <Clock className="w-5 h-5" />
                НАПИСАТЬ В ПОДДЕРЖКУ
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </>
  )
}