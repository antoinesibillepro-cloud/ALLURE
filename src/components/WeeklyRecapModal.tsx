import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

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
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(242,196,0,0.15)' }}>
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M2 11L7 15L18 4" stroke="#F2C400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
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
const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

interface SlideProps { active: boolean }

export interface RecapData {
  todaySession: { title: string; vmaPercent: number | null; durationMin: number | null; distanceKm: number | null } | null
  sessionsDone: number
  sessionsPlanned: number
  weekKmDone: number
  weekKmPlanned: number
  weekKmByDay: number[]
  weekMinutesDone: number
  nextComp: { title: string; eventDate: string | null; distanceKm: number | null; targetTime: string | null } | null
  currentWeightKg: number | null
}

function Slide1({ active, data }: SlideProps & { data: RecapData }) {
  const { todaySession, sessionsDone, sessionsPlanned } = data
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#F2C400' }}>AUJOURD&apos;HUI</p>
      {todaySession ? (
        <>
          <h2 className="text-[40px] font-black leading-tight text-white">{todaySession.title}</h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {todaySession.vmaPercent ? `${todaySession.vmaPercent}% VMA · ` : ''}{todaySession.durationMin ? `${todaySession.durationMin} min · ` : ''}{todaySession.distanceKm ? `${todaySession.distanceKm} km prévus` : ''}
          </p>
        </>
      ) : (
        <h2 className="text-[32px] font-black leading-tight text-white">Aucune séance<br />aujourd&apos;hui</h2>
      )}

      <div className="mt-6 flex items-center gap-4">
        <div className="relative">
          {active && <Ring value={sessionsDone} max={Math.max(sessionsPlanned, 1)} size={72} color="#F2C400" />}
          {!active && <svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" /></svg>}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-black text-white">{sessionsDone}/{sessionsPlanned}</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Séances cette semaine</p>
        </div>
      </div>
    </div>
  )
}

function Slide2({ active, data }: SlideProps & { data: RecapData }) {
  const { weekKmDone, weekKmPlanned, weekKmByDay, weekMinutesDone, sessionsDone } = data
  const pctObjectif = weekKmPlanned > 0 ? Math.round((weekKmDone / weekKmPlanned) * 100) : 0
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#5B91D8' }}>CETTE SEMAINE</p>
      <h2 className="text-[40px] font-black leading-tight text-white">{Math.round(weekKmDone)} km<br /><span className="text-[28px]">parcourus</span></h2>
      <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>{Math.round(weekMinutesDone / 60)}h{String(weekMinutesDone % 60).padStart(2, '0')} d&apos;entraînement · {sessionsDone} séance{sessionsDone > 1 ? 's' : ''}</p>

      <div className="mt-6">
        {active && <MiniBar values={weekKmByDay} labels={WEEK_DAYS} color="#5B91D8" />}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {[
          { val: `${pctObjectif}%`, label: 'Objectif km', color: '#5EBA65' },
          { val: `${weekMinutesDone}`, label: 'min totales', color: '#F2C400' },
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

function Slide3({ active, data }: SlideProps & { data: RecapData }) {
  const { nextComp, currentWeightKg } = data
  const daysLeft = nextComp?.eventDate ? Math.max(0, Math.ceil((new Date(nextComp.eventDate).getTime() - Date.now()) / 86400000)) : null
  return (
    <div className="flex flex-col justify-end min-h-[340px]">
      <p className="text-xs font-bold tracking-[0.15em] mb-3" style={{ color: '#E4574A' }}>PROCHAINE ÉCHÉANCE</p>
      {nextComp ? (
        <>
          <h2 className="text-[36px] font-black leading-tight text-white">{nextComp.title}<br />{daysLeft !== null && <span style={{ color: '#E4574A' }}>dans {daysLeft} j</span>}</h2>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {nextComp.targetTime ? `Objectif : ${nextComp.targetTime} · ` : ''}{nextComp.eventDate ? new Date(nextComp.eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>
        </>
      ) : (
        <h2 className="text-[32px] font-black leading-tight text-white">Aucune compétition<br />programmée</h2>
      )}

      <div className="mt-6 flex gap-4 items-center">
        {active && daysLeft !== null && (
          <CountdownUnit value={daysLeft} label="jours" color="#E4574A" />
        )}
        <div className="flex-1 pl-2">
          <p className="text-xs font-bold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>POIDS ACTUEL</p>
          {currentWeightKg ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-black text-white">{currentWeightKg}</span>
              <span className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>kg</span>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Non renseigné</p>
          )}
        </div>
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

interface Props { onClose: () => void; data: RecapData }

export default function WeeklyRecapModal({ onClose, data }: Props) {
  const [slide, setSlide] = useState(0)
  const [visible, setVisible] = useState(false)
  const touchX = useRef<number | null>(null)
  const touchY = useRef<number | null>(null)

  useEffect(() => { requestAnimationFrame(() => setVisible(true)) }, [])

  function close() { setVisible(false); setTimeout(onClose, 380) }
  function prev() { setSlide(s => Math.max(0, s - 1)) }
  function next() { setSlide(s => Math.min(3, s + 1)) }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX
    touchY.current = e.touches[0].clientY
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current === null || touchY.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    const dy = e.changedTouches[0].clientY - touchY.current
    // Ignore mostly-vertical gestures so a scroll attempt doesn't accidentally flip slides.
    if (Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < -60) next(); else if (dx > 60) prev()
    }
    touchX.current = null
    touchY.current = null
  }

  const accent = SLIDE_COLORS[slide]

  return createPortal(
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
          <div className="flex" style={{ transform: `translateX(${-slide * 25}%)`, transition: 'transform 0.42s cubic-bezier(0.4,0,0.2,1)', width: '400%' }}>
            <div style={{ width: '25%' }}><Slide1 active={slide === 0} data={data} /></div>
            <div style={{ width: '25%' }}><Slide2 active={slide === 1} data={data} /></div>
            <div style={{ width: '25%' }}><Slide3 active={slide === 2} data={data} /></div>
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

    </div>,
    document.body,
  )
}
