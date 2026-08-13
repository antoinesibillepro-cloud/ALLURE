import { useEffect, useRef, useState } from 'react'
import { searchClub, KIND_LABEL, type SearchResult, type SearchKind } from '../lib/queries/search'
import { Skeleton } from './Skeleton'

const KIND_COLOR: Record<SearchKind, string> = {
  athlete: '#5B91D8', group: '#7B6FD6', session: '#F2C400', race: '#5EBA65',
}

/**
 * Club-wide search box for the desktop topbar. Debounces input, shows a
 * results popover, and hands the picked result back to the caller to navigate.
 */
export default function GlobalSearch({ clubId, onPick }: {
  clubId: string
  onPick: (result: SearchResult) => void
}) {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounced search — avoids a request per keystroke.
  useEffect(() => {
    if (term.trim().length < 2) { setResults([]); setLoading(false); return }
    setLoading(true)
    const t = setTimeout(() => {
      searchClub(clubId, term)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(t)
  }, [term, clubId])

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  // Cmd/Ctrl-K focuses the box, Escape closes it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function pick(r: SearchResult) {
    onPick(r)
    setOpen(false)
    setTerm('')
    inputRef.current?.blur()
  }

  const showPanel = open && term.trim().length >= 2

  return (
    <div ref={boxRef} className="relative shrink-0">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-full w-52 transition-all"
        style={{
          background: 'var(--surface2)',
          color: 'var(--text-2)',
          boxShadow: open ? '0 0 0 2px rgba(242,196,0,0.35)' : 'none',
        }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M10 10L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => { setTerm(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher..."
          className="bg-transparent text-sm outline-none w-full"
          style={{ color: 'var(--text-1)' }}
        />
        {term ? (
          <button onClick={() => { setTerm(''); inputRef.current?.focus() }} className="shrink-0" style={{ color: 'var(--text-2)' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <kbd className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
            style={{ background: 'var(--surface3)', color: 'var(--text-2)' }}>⌘K</kbd>
        )}
      </div>

      {showPanel && (
        <div className="pop-in absolute top-full mt-2 left-0 w-[340px] rounded-2xl overflow-hidden z-50"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}>
          {loading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton w={28} h={28} r={8} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton w="60%" h={11} />
                    <Skeleton w="35%" h={9} />
                  </div>
                </div>
              ))}
            </div>
          ) : !results.length ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>Aucun résultat</p>
          ) : (
            <div className="max-h-[380px] overflow-y-auto py-1">
              {results.map((r, i) => (
                <button key={`${r.kind}-${r.id}`} onClick={() => pick(r)}
                  className="row-in row-press w-full flex items-center gap-3 px-3 py-2.5 text-left"
                  style={{ animationDelay: `${Math.min(i * 25, 200)}ms` }}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black uppercase"
                    style={{ background: `${KIND_COLOR[r.kind]}22`, color: KIND_COLOR[r.kind] }}>
                    {KIND_LABEL[r.kind].slice(0, 2)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate" style={{ color: 'var(--text-1)' }}>{r.title}</span>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--text-2)' }}>{r.subtitle}</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider shrink-0"
                    style={{ color: KIND_COLOR[r.kind] }}>{KIND_LABEL[r.kind]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
