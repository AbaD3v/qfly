import { useState, useRef, useEffect } from 'react'
import { MapPin, Loader2, Search, X } from 'lucide-react'

interface AddressInputProps {
  label: string
  placeholder: string
  markerColor?: 'primary' | 'accent'
  onSelect: (data: { address: string; lat: number; lon: number } | null) => void
}

interface Suggestion {
  id: string
  name: string
  full_name: string
  purpose_name?: string
  point?: { lat: number; lon: number }
}

// Через next.config.js rewrites — запрос идёт из браузера, ключ подставляет Next.js
async function geocodeById(objectId: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(`/2gis/byid?id=${encodeURIComponent(objectId)}`)
    const data = await res.json()
    const point = data.result?.items?.[0]?.point
    if (point) return { lat: point.lat, lon: point.lon }
  } catch (e) {
    console.error('Geocoder error:', e)
  }
  return null
}

export default function AddressInput({ label, placeholder, markerColor = 'primary', onSelect }: AddressInputProps) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Закрываем дропдаун при клике вне компонента
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = (text: string) => {
    setValue(text)
    setSelected(false)
    onSelect(null)

    clearTimeout(debounceRef.current)

    if (text.length < 2) {
      setSuggestions([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        // Через rewrite — браузерный запрос, ключ скрыт в next.config.js
        const res = await fetch(`/2gis/items?q=${encodeURIComponent(text)}`)
        const data = await res.json()
        setSuggestions(data.result?.items || [])
      } catch (e) {
        console.error('Suggest API error:', e)
        setSuggestions([])
      }
      setLoading(false)
    }, 250)
  }

  const handleSelect = async (item: Suggestion) => {
    const address = item.full_name || item.name
    setValue(address)
    setSuggestions([])
    setSelected(true)
    setLoading(true)

    // Если в suggest уже есть точка — используем её, иначе geocoder
    let coords = item.point || null
    if (!coords && item.id) {
      coords = await geocodeById(item.id)
    }

    if (coords) {
      onSelect({ address, lat: coords.lat, lon: coords.lon })
    } else {
      onSelect(null)
    }
    setLoading(false)
  }

  const handleClear = () => {
    setValue('')
    setSuggestions([])
    setSelected(false)
    onSelect(null)
  }

  const dotColor = markerColor === 'accent' ? 'bg-accent' : 'bg-primary'
  const borderColor = markerColor === 'accent' ? 'focus:border-accent/50 focus:ring-accent/20' : 'focus:border-primary/50 focus:ring-primary/20'
  const glowColor = markerColor === 'accent' ? 'shadow-[0_8px_32px_rgba(244,63,94,0.15)]' : 'shadow-[0_8px_32px_rgba(56,189,248,0.15)]'

  return (
    <div ref={wrapperRef} className="relative w-full">
      <label className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1.5 uppercase tracking-[0.2em] ml-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
        {label}
      </label>

      <div className="relative">
        {/* Иконка слева */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : selected ? (
            <MapPin className={`w-4 h-4 ${markerColor === 'accent' ? 'text-accent' : 'text-primary'}`} />
          ) : (
            <Search className="w-4 h-4 text-slate-500" />
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(e) => fetchSuggestions(e.target.value)}
          placeholder={placeholder}
          className={`w-full bg-background/40 border ${selected ? (markerColor === 'accent' ? 'border-accent/40' : 'border-primary/40') : 'border-white/10'} rounded-xl pl-11 pr-10 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 transition-all font-mono text-sm ${borderColor} ${selected ? glowColor : ''}`}
        />

        {/* Кнопка очистки */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Дропдаун с результатами */}
      {suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-[#080f1e]/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
          {/* Заголовок дропдауна */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Результаты поиска</span>
            <span className="text-[9px] font-mono text-slate-600">{suggestions.length} объектов</span>
          </div>

          {suggestions.map((item, i) => (
            <button
              key={item.id || i}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 font-medium group-hover:text-white transition-colors truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono uppercase tracking-tight truncate mt-0.5">
                    {item.full_name}
                  </div>
                  {item.purpose_name && (
                    <div className={`text-[9px] font-mono mt-0.5 ${markerColor === 'accent' ? 'text-accent/50' : 'text-primary/50'}`}>
                      {item.purpose_name}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
