import { useState, useRef, useEffect } from 'react'

// ── Animated ring ─────────────────────────────────────────────────────────────
function Ring({ value, max, size = 72, color = '#F2C400' }: { value: number; max: number; size?: number; color?: string }) {
  const R = size / 2 - 6
  const circ = 2 * Math.PI * R
  const [dash, setDash] = useState(0)
  useEffect(() => { setTimeout(() => setDash(max > 0 ? (value / max) * circ : 0), 180) }, [value, max, circ])
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={R} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)', transform: 'rotate(-90deg)', transformOrigin: `${size/2}px ${size/2}px` }} />
    </svg>
  )
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────
function MiniBar({ values, labels, color }: { values: number[]; labels: string[]; color: string }) {
  const [animated, setAnimated] = useState(false)
  useEffect(() => { setTimeout(() => setAnimated(true), 200) }, [])
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1.5 h-16">
      {values.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div className="w-full rounded-t-lg transition-all duration-700 ease-out"
            style={{ height: animated ? `${(v / max) * 52}px` : '2px', background: v > 0 ? color : 'rgba(255,255,255,0.12)', minHeight: 2 }} />
          <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Countdown ring trio ───────────────────────────────────────────────────────
function CountdownUnit({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative">
        <Ring value={value} max={label === 'j' ? 60 : 60} size={56} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black text-white">{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
    </div>
  )
}

// ── FeedbackSlide ─────────────────────────────────────────────────────────────
function FeedbackSlide() {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  if (sent) return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <div className="text-3xl">🙏</div>
      <p className="text-white font-bold text-lg">Merci pour ton retour !</p>
      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Ça aide vraiment à améliorer l'appli.</p>
    </div>
  )
  return (
    <div className="mt-5">
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Ce qui ne marche pas, ce qui manque, une idée..."
        rows={4}
        className="w-full rounded-2xl p-4 text-sm outline-none resize-none"
        style={{ background: 'rgba(255,255,255,0.07)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' }} />
      <button onClick={() => { if (text.trim()) setSent(true) }}
        className="mt-3 px-7 py-3 rounded-full font-black text-sm transition-all active:scale-95"
        style={{ background: text.trim() ? '#F2C400' : 'rgba(255,255,255,0.1)', color: text.trim() ? '#0E0E0D' : 'rgba(255,255,255,0.35)' }}>
        Envoyer →
      </button>
    </div>
  )
}

// ── slide definitions ─────────────────────────────────────────────────────────
const WEEK_KM = [12, 14, 0, 18, 10, 9, 4]
const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

interface SlideProps { active: boolean }

function Slide1({ active }: SlideProps) {
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#F2C400' }}>AUJOURD&apos;HUI</p>
      <h2 className="text-[40px] font-black leading-tight text-white">Fractionné<br />10×400m</h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>88% VMA · 55 min · 12 km prévus</p>

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          {active && <Ring value={5} max={7} size={72} color="#F2C400" />}
          {!active && <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" /></svg>}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-white">5/7</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Séances cette semaine</p>
          <div className="flex gap-1.5">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: i <= 5 ? '#F2C400' : 'rgba(255,255,255,0.12)' }}>
                {i <= 5 && <svg width="7" height="5" viewBox="0 0 7 5" fill="none"><path d="M1 2.5L2.5 4L6 1" stroke="#0E0E0D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 px-4 py-3 rounded-2xl flex items-center gap-3"
        style={{ background: 'rgba(242,196,0,0.1)', border: '1px solid rgba(242,196,0,0.2)' }}>
        <div className="w-2 h-2 rounded-full bg-[#F2C400]" />
        <span className="text-sm font-semibold text-white">Séance prévue cet après-midi</span>
        <span className="ml-auto text-xs font-bold text-[#F2C400]">16:00 →</span>
      </div>
    </div>
  )
}

function Slide2({ active }: SlideProps) {
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#5B91D8' }}>CETTE SEMAINE</p>
      <h2 className="text-[40px] font-black leading-tight text-white">67 km<br /><span className="text-[28px]">parcourus</span></h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>5h42 d&apos;entraînement · 5 séances</p>

      <div className="mt-6">
        {active && <MiniBar values={WEEK_KM} labels={WEEK_DAYS} color="#5B91D8" />}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { val: '84%', label: 'Objectif km', color: '#5EBA65' },
          { val: '342', label: 'min totales', color: '#F2C400' },
          { val: '680', label: 'm dénivelé', color: '#7B6FD6' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl px-3 py-2.5 flex flex-col gap-0.5"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <span className="text-lg font-black" style={{ color: s.color }}>{s.val}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide3({ active }: SlideProps) {
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#E4574A' }}>PROCHAINE ÉCHÉANCE</p>
      <h2 className="text-[36px] font-black leading-tight text-white">5000 m<br /><span style={{ color: '#E4574A' }}>dans 47 j</span></h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Objectif : 14&apos;30 · 26 sept 2026</p>

      <div className="mt-6 flex gap-4 items-center">
        {active && (
          <>
            <CountdownUnit value={47} label="j" color="#E4574A" />
            <CountdownUnit value={14} label="h" color="#F97316" />
            <CountdownUnit value={30} label="min" color="#F2C400" />
          </>
        )}
        <div className="flex-1 pl-2">
          <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>POIDS ACTUEL</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black text-white">55</span>
            <span className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>kg</span>
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>dernier relevé · 10 août</p>
        </div>
      </div>

      <div className="mt-4 px-4 py-3 rounded-2xl"
        style={{ background: 'rgba(228,87,74,0.1)', border: '1px solid rgba(228,87,74,0.25)' }}>
        <p className="text-xs font-bold text-[#E4574A] mb-1">PLAN EN COURS</p>
        <p className="text-sm text-white">Préparation 5000m · Semaine 3/12</p>
      </div>
    </div>
  )
}

function Slide4() {
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#5EBA65' }}>APPLI EN TEST</p>
      <h2 className="text-[36px] font-black leading-tight text-white">Un bug ?<br />Un souci ?</h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
        L&apos;appli est encore en phase de test. Si quelque chose ne fonctionne pas, s&apos;affiche mal ou semble bizarre, dis-le ici ;)
      </p>
      <FeedbackSlide />
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────
const SLIDE_COLORS = ['#F2C400', '#5B91D8', '#E4574A', '#5EBA65']

interface Props { onClose: () => void }

export default function WeeklyRecapModal({ onClose }: Props) {
  const [slide, setSlide] = useState(0)
  const [visible, setVisible] = useState(false)
  const touchX = useRef<number | null>(null)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function close() { setVisible(false); setTimeout(onClose, 380) }
  function prev() { setSlide(s => Math.max(0, s - 1)) }
  function next() { setSlide(s => Math.min(3, s + 1)) }

  function onTouchStart(e: React.TouchEvent) { touchX.current = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    if (dx < -50) next(); else if (dx > 50) prev()
    touchX.current = null
  }

  const accent = SLIDE_COLORS[slide]

  return (
    <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden"
      style={{
        background: '#0B0B0A',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.42s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>

      {/* Gradient glow behind content */}
      <div className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{ background: `radial-gradient(ellipse 60% 50% at 70% 20%, ${accent}18 0%, transparent 70%)` }} />

      {/* Ghost circles */}
      <div className="absolute top-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: '50%' }}>
        <div className="absolute rounded-full border transition-all duration-700"
          style={{ width: 340, height: 340, top: -120, left: '50%', transform: 'translateX(-50%) translateX(-70px)', borderColor: `${accent}15` }} />
        <div className="absolute rounded-full border transition-all duration-700"
          style={{ width: 240, height: 240, top: -40, left: '50%', transform: 'translateX(-50%) translateX(80px)', borderColor: `${accent}10` }} />
        <div className="absolute rounded-full transition-all duration-700"
          style={{ width: 180, height: 180, top: 60, left: '50%', transform: 'translateX(-50%) translateX(-20px)', background: `${accent}06` }} />
      </div>

      {/* Close */}
      <button onClick={close}
        className="absolute top-14 left-5 w-9 h-9 rounded-full flex items-center justify-center z-20 transition-all active:scale-90"
        style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2 2L10 10M10 2L2 10" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Slide number */}
      <div className="absolute top-14 right-5 z-20">
        <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>{slide + 1} / 4</span>
      </div>

      {/* Slides container */}
      <div className="flex-1 flex flex-col justify-end px-7 pb-28 pt-24 overflow-hidden">
        <div className="overflow-hidden">
          <div className="flex" style={{ transform: `translateX(${-slide * 100}%)`, transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)', width: '400%' }}>
            <div style={{ width: '25%' }}><Slide1 active={slide === 0} /></div>
            <div style={{ width: '25%' }}><Slide2 active={slide === 1} /></div>
            <div style={{ width: '25%' }}><Slide3 active={slide === 2} /></div>
            <div style={{ width: '25%' }}><Slide4 /></div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-2">
        {[0,1,2,3].map(i => (
          <button key={i} onClick={() => setSlide(i)}
            className="rounded-full transition-all duration-350"
            style={{ width: i === slide ? 22 : 6, height: 6, background: i === slide ? accent : 'rgba(255,255,255,0.2)' }} />
        ))}
      </div>

      {/* Desktop nav arrows */}
      {slide > 0 && (
        <button onClick={prev} className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M8.5 10.5L5 7L8.5 3.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
      {slide < 3 && (
        <button onClick={next} className="hidden md:flex absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5.5 3.5L9 7L5.5 10.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}

    </div>
  )
}
