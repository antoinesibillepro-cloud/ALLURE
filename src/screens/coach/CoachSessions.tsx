import { useState } from 'react'
import { Card, SectionLabel, BtnPrimary, BtnSecondary } from '../../components/ui'
import { useApp } from '../../context/AppContext'
import { useQuery } from '../../lib/useQuery'
import { fetchGroups, type GroupWithMembers } from '../../lib/queries/groups'
import { createSession } from '../../lib/queries/sessions'

const SESSION_TYPES = ['Fractionné VMA', 'Seuil lactique', 'Endurance fondamentale', 'Sortie longue', 'Côtes', 'Récupération active']

export default function CoachSessions() {
  const { profile } = useApp()
  const [tab, setTab] = useState<'create' | 'library'>('create')
  const [sessionType, setSessionType] = useState('Fractionné VMA')
  const [duration, setDuration] = useState(55)
  const [distance, setDistance] = useState(12)
  const [vmaPercent, setVmaPercent] = useState(88)
  const [description, setDescription] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10))
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishedOk, setPublishedOk] = useState(false)

  const { data: groups, loading: groupsLoading } = useQuery<GroupWithMembers[]>(
    () => (profile ? fetchGroups(profile.club_id) : Promise.resolve([])),
    [profile?.club_id],
  )

  const activeGroup = groups?.find((g) => g.id === selectedGroupId) ?? groups?.[0] ?? null
  const effectiveGroupId = selectedGroupId || activeGroup?.id || ''

  async function handlePublish(status: 'draft' | 'published') {
    if (!profile || !effectiveGroupId) return
    setPublishing(true)
    setPublishError(null)
    setPublishedOk(false)
    try {
      await createSession(profile.club_id, profile.id, {
        title: sessionType,
        type: sessionType,
        description,
        duration_min: duration,
        distance_km: distance,
        vma_percent: vmaPercent,
        scheduled_at: new Date(scheduledDate).toISOString(),
        group_ids: [effectiveGroupId],
        status,
      })
      setPublishedOk(true)
      setDescription('')
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Erreur lors de la publication')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto md:max-w-3xl">
      <div className="flex items-center justify-between pt-1">
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-1)' }}>Séances</h1>
        <div className="flex gap-1 p-1 rounded-[12px]" style={{ background: 'var(--card)', boxShadow: 'var(--card-shadow)' }}>
          {(['create', 'library'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all capitalize"
              style={{ background: tab === t ? '#F2C400' : 'transparent', color: tab === t ? '#0E0E0D' : 'var(--text-2)' }}>
              {t === 'create' ? 'Créer' : 'Bibliothèque'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'create' && (
        <>
          {/* Session editor */}
          <Card>
            <SectionLabel>Nouvelle séance</SectionLabel>

            {/* Type selector */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Type</label>
              <div className="flex flex-wrap gap-2">
                {SESSION_TYPES.map((t) => (
                  <button key={t} onClick={() => setSessionType(t)}
                    className="px-3 py-1.5 rounded-[12px] text-xs font-semibold transition-all"
                    style={{
                      background: sessionType === t ? 'rgba(242,196,0,0.15)' : 'var(--surface2)',
                      color: sessionType === t ? '#F2C400' : 'var(--text-2)',
                      border: sessionType === t ? '1px solid rgba(242,196,0,0.3)' : '1px solid transparent',
                    }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeric fields */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Durée', value: duration, set: setDuration, unit: 'min', min: 10, max: 180, step: 5 },
                { label: 'Distance', value: distance, set: setDistance, unit: 'km', min: 1, max: 40, step: 1 },
                { label: '%VMA', value: vmaPercent, set: setVmaPercent, unit: '%', min: 60, max: 105, step: 1 },
              ].map(({ label, value, set, unit, min, max, step }) => (
                <div key={label} className="rounded-[12px] p-3" style={{ background: 'var(--surface2)' }}>
                  <p className="text-[8px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => set(Math.max(min, value - step))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--surface3)', color: 'var(--text-2)' }}>−</button>
                    <span className="flex-1 text-center text-xl font-black" style={{ color: 'var(--text-1)' }}>{value}</span>
                    <button onClick={() => set(Math.min(max, value + step))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ background: 'var(--surface3)', color: 'var(--text-2)' }}>+</button>
                  </div>
                  <p className="text-[9px] text-center mt-1" style={{ color: 'var(--text-2)' }}>{unit}</p>
                </div>
              ))}
            </div>

            {/* Content textarea */}
            <div className="mb-4">
              <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Contenu détaillé</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Éch. 15 min · 10 × 400m récup 90s · RAC 10 min..."
                className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
            </div>

            {/* Group + date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Groupe destinataire</label>
                <select value={effectiveGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}
                  disabled={groupsLoading || !groups?.length}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none appearance-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }}>
                  {!groups?.length && <option value="">Aucun groupe — crée-en un d'abord</option>}
                  {groups?.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest mb-2 block" style={{ color: 'var(--text-2)' }}>Date de publication</label>
                <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full rounded-[12px] px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'var(--surface2)', color: 'var(--text-1)' }} />
              </div>
            </div>
          </Card>

          {/* %VMA auto-calculator — using the real VMA of each athlete in the selected group */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Allures calculées — {vmaPercent}% VMA</SectionLabel>
              <span className="text-[10px] px-2 py-1 rounded-full text-[#F2C400]"
                style={{ background: 'rgba(242,196,0,0.12)' }}>{activeGroup?.name ?? '—'}</span>
            </div>
            {!activeGroup?.members.length ? (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-2)' }}>
                Aucun athlète avec une VMA renseignée dans ce groupe pour l'instant.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-xs min-w-[320px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Athlète', 'VMA', 'Allure 400m', 'Allure km'].map((h, i) => (
                        <th key={h} className={`pb-2 font-medium text-[10px] uppercase tracking-wider ${i === 0 ? 'text-left pr-3' : 'text-center px-2'}`}
                          style={{ color: 'var(--text-2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeGroup.members.filter((m) => m.vma).map((row) => {
                      const vma = row.vma!
                      const pace400 = Math.round((400 / (vma * vmaPercent / 100 / 3.6)))
                      const min400 = Math.floor(pace400 / 60)
                      const sec400 = pace400 % 60
                      const paceKm = Math.round((1000 / (vma * vmaPercent / 100 / 3.6)))
                      const minKm = Math.floor(paceKm / 60)
                      const secKm = paceKm % 60
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td className="py-2.5 pr-3 font-semibold" style={{ color: 'var(--text-1)' }}>{row.name}</td>
                          <td className="py-2.5 px-2 text-center" style={{ color: 'var(--text-2)' }}>{vma}</td>
                          <td className="py-2.5 px-2 text-center font-bold text-[#F2C400]">{min400}'{String(sec400).padStart(2,'0')}"</td>
                          <td className="py-2.5 px-2 text-center font-bold" style={{ color: 'var(--text-1)' }}>{minKm}'{String(secKm).padStart(2,'0')}"/km</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {publishError && (
            <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(228,87,74,0.12)', color: '#E4574A' }}>{publishError}</p>
          )}
          {publishedOk && (
            <p className="text-xs rounded-[10px] px-3 py-2" style={{ background: 'rgba(94,186,101,0.12)', color: '#5EBA65' }}>Séance enregistrée.</p>
          )}

          <div className="flex gap-3">
            <BtnPrimary className="flex-1" disabled={publishing || !effectiveGroupId} onClick={() => handlePublish('published')}>
              {publishing ? 'Publication…' : 'Publier la séance'}
            </BtnPrimary>
            <BtnSecondary onClick={() => handlePublish('draft')}>Sauvegarder en brouillon</BtnSecondary>
          </div>
        </>
      )}

      {tab === 'library' && (
        <Card>
          <p className="text-sm text-center py-6" style={{ color: 'var(--text-2)' }}>
            La bibliothèque de séances types arrive dans une prochaine version.
          </p>
        </Card>
      )}
    </div>
  )
}
