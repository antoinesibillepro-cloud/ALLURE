import { useState } from "react";

// ─── Data constants ──────────────────────────────────────────────────────────

const GROUPS = ["Hommes ES/SE", "Hommes CA/JU", "Femmes CA→SE", "Coach"];

interface Athlete {
  id: number;
  name: string;
  initials: string;
  vma: number;
  pace: string;
  group: string;
  kmWeek: number;
}

const ATHLETES: Athlete[] = [
  { id: 1, name: "Antoine Sibille",  initials: "AS", vma: 21, pace: "3:22/km", group: "Hommes ES/SE", kmWeek: 0 },
  { id: 2, name: "Stephane SIBILLE", initials: "SS", vma: 17, pace: "4:09/km", group: "Hommes ES/SE", kmWeek: 0 },
  { id: 3, name: "Sophie Bernard",   initials: "SB", vma: 19, pace: "3:45/km", group: "Femmes CA→SE", kmWeek: 12 },
  { id: 4, name: "Lucas Martin",     initials: "LM", vma: 18, pace: "3:52/km", group: "Hommes CA/JU", kmWeek: 8 },
];

interface SessionChip {
  time: "MATIN" | "AP.-MIDI" | "SOIR";
  label: string;
  color: string;
  km?: number;
  group: string;
}

const DAY_SESSIONS: Record<number, SessionChip[]> = {
  1: [{ time: "MATIN",    label: "Mornin Run",       color: "#5EBA65", group: "Hommes ES/SE" }],
  2: [{ time: "MATIN",    label: "Mornin Run",       color: "#5EBA65", group: "Hommes ES/SE" }],
  3: [{ time: "MATIN",    label: "Footing récup",    color: "#5EBA65", group: "Hommes ES/SE" }],
  4: [{ time: "AP.-MIDI", label: "10x300",            color: "#F2C400", group: "Hommes ES/SE" }],
  5: [{ time: "AP.-MIDI", label: "Footing 50'",       color: "#5EBA65", km: 10, group: "Hommes ES/SE" }],
  6: [{ time: "MATIN",    label: "3X2000",            color: "#F2C400", group: "Hommes ES/SE" }],
  7: [{ time: "MATIN",    label: "Footing / Récup",  color: "#5EBA65", group: "Hommes ES/SE" }],
  8: [{ time: "MATIN",    label: "Footing",           color: "#5EBA65", group: "Hommes ES/SE" }],
  9: [{ time: "MATIN",    label: "Sortie longue",     color: "#5B91D8", group: "Hommes ES/SE" }],
};

const WEEK_KM_DATA = [12, 45, 38, 67, 52, 71, 48, 63, 79, 55, 43, 0];
const WEEK_LABELS  = ["S21","S22","S23","S24","S25","S26","S27","S28","S29","S30","S31","S32"];

const MONTHS = [
  "août 7","sept. —","oct. —","nov. —","déc. —",
  "janv. —","févr. —","mars —","avr. —","mai —","juin —","juil. —",
];

const DAY_HEADERS = ["LU","MA","ME","JE","VE","SA","DI"];

// August 2026 starts on Saturday (index 5 in 0=LU…6=DI)
const AUG_2026_START_DOW = 5; // SA

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function IconX({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function IconChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IconBell() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1a4 4 0 014 4v3l1 1H2l1-1V5a4 4 0 014-4z" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 12a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M9.5 1.5l3 3L4 13H1v-3L9.5 1.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 3h12M5 3V2h4v1M2 3l1 9h8l1-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Session Edit Modal ──────────────────────────────────────────────────────

interface ModalProps {
  day: number | null;
  onClose: () => void;
}

function SessionModal({ day, onClose }: ModalProps) {
  const session = day ? DAY_SESSIONS[day] : undefined;
  const chip = session?.[0];
  const [title, setTitle] = useState(chip?.label ?? "");
  const [athletes] = useState(["Antoine Sibille", "Stephane SIBILLE"]);
  const [content, setContent] = useState("");
  const [km, setKm] = useState("");

  const dayLabel = day
    ? new Date(2026, 7, day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <span style={{ color: "var(--text-2)" }}>
              <IconEdit />
            </span>
            <span className="font-semibold" style={{ color: "var(--text-1)" }}>
              {dayLabel && dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1)} · {chip?.time ?? "Matin"} · Hommes ES/SE
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors"
            style={{ color: "var(--text-2)" }}
          >
            <IconX size={16} />
          </button>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-2)" }}>
                Thème
              </label>
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              >
                <span className="text-sm">Endurance</span>
                <IconChevronDown />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-2)" }}>
                Titre affiché
              </label>
              <input
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-2)" }}>
                Créneau
              </label>
              <div
                className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              >
                <span className="text-sm">Matin</span>
                <IconChevronDown />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-2)" }}>
                Date
              </label>
              <input
                type="text"
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                defaultValue={`${String(day ?? "").padStart(2,"0")}/08/2026`}
              />
            </div>
          </div>

          {/* Athletes group */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                Groupe 1 — objectif (800/1500 m…)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {athletes.map(a => (
                <span
                  key={a}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "#F2C400", color: "#000" }}
                >
                  {a}
                  <button className="opacity-60 hover:opacity-100">
                    <IconX size={11} />
                  </button>
                </span>
              ))}
              <button
                className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                style={{ background: "var(--surface3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                +
              </button>
            </div>
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ background: "var(--surface3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                📋 Charger <IconChevronDown size={11} />
              </button>
              <button
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ background: "var(--surface3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
              >
                💾 Enregistrer cette composition
              </button>
            </div>
          </div>

          {/* Content textarea */}
          <div>
            <textarea
              className="w-full rounded-xl px-3 py-3 text-sm outline-none resize-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)", minHeight: "90px" }}
              placeholder={"Contenu de la séance...\n@Prénom : variante individuelle"}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          {/* KM */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-2)" }}>
              KM prévus
            </label>
            <input
              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              placeholder="Ex : 12"
              value={km}
              onChange={e => setKm(e.target.value)}
            />
          </div>

          {/* Chrono objectives */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-2)" }}>
              Objectifs de chrono
            </label>
            <button
              className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 transition-colors"
              style={{ color: "#F2C400", border: "1px dashed #F2C400", background: "transparent" }}
            >
              <span className="text-base leading-none">+</span> Ajouter une distance
            </button>
          </div>

          {/* Add work group */}
          <button
            className="flex items-center gap-1.5 text-sm rounded-lg px-3 py-2 transition-colors w-full justify-center"
            style={{ color: "var(--text-2)", border: "1px dashed var(--border)", background: "transparent" }}
          >
            + Ajouter un groupe de travail
          </button>

          {/* Rest */}
          <div className="flex items-center gap-3">
            <span className="text-sm" style={{ color: "var(--text-2)" }}>😴 Repos</span>
            <button
              className="rounded-lg px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--surface3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
            >
              +
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 space-y-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-2)" }}>
            ✓ Les 2 athlètes assignés recevront leur séance à la publication.
          </p>
          <div className="flex items-center gap-3">
            <button
              className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-opacity hover:opacity-90"
              style={{ background: "#F2C400", color: "#000" }}
            >
              Publier → notifier 2 athlètes
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--surface2)", color: "var(--text-1)", border: "1px solid var(--border)" }}
            >
              Enregistrer le brouillon
            </button>
            <button
              className="rounded-xl px-3 py-2.5 text-sm transition-colors"
              style={{ color: "#EF4444" }}
            >
              <IconTrash />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Page ───────────────────────────────────────────────────────────

interface CalendarPageProps {
  selectedGroup: string;
  setSelectedGroup: (g: string) => void;
}

function CalendarPage({ selectedGroup, setSelectedGroup }: CalendarPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [dayFilter, setDayFilter] = useState("Tous");
  const [calView] = useState<"Mois" | "Semaine">("Mois");

  const today = 10;
  const totalDays = 31;

  // Build calendar grid (31 days of August 2026, starting Saturday)
  const leadingBlanks = AUG_2026_START_DOW; // 5 blanks before day 1
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);

  function openModal(day: number) {
    setSelectedDay(day);
    setShowModal(true);
  }

  const dayFilterOpts = ["Tous", "LU", "MA", "ME", "JE", "VE", "SA", "DI"];
  const realisationsAthletes = ATHLETES.filter(a => a.group === selectedGroup || selectedGroup === "Coach");

  return (
    <>
      {showModal && (
        <SessionModal
          day={selectedDay}
          onClose={() => { setShowModal(false); setSelectedDay(null); }}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Sub-header */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-1 transition-colors hover:opacity-70" style={{ color: "var(--text-2)" }}>
              <IconChevronLeft />
            </button>
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Saison 2026/2027 — août 2026
            </span>
            <button className="rounded-lg p-1 transition-colors hover:opacity-70" style={{ color: "var(--text-2)" }}>
              <IconChevronRight />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--surface2)", color: "var(--text-1)", border: "1px solid var(--border)" }}
            >
              Aujourd'hui
            </button>
            <div
              className="flex rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              {(["Mois", "Semaine"] as const).map(v => (
                <button
                  key={v}
                  className="px-3 py-1.5 text-sm font-semibold transition-colors"
                  style={{
                    background: calView === v ? "#F2C400" : "var(--surface2)",
                    color: calView === v ? "#000" : "var(--text-2)",
                  }}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Group tabs */}
        <div
          className="flex items-center gap-2 px-6 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {GROUPS.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors"
              style={{
                background: selectedGroup === g ? "#F2C400" : "transparent",
                color: selectedGroup === g ? "#000" : "var(--text-2)",
                border: selectedGroup === g ? "none" : "1px solid var(--border)",
              }}
            >
              {g}
              {selectedGroup === g && (
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#000" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Month timeline */}
        <div
          className="flex items-center gap-2 px-6 py-3 overflow-x-auto"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          {MONTHS.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: selectedMonth === i ? "#F2C400" : "var(--surface2)",
                color: selectedMonth === i ? "#000" : "var(--text-2)",
                border: selectedMonth === i ? "none" : "1px solid var(--border)",
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_HEADERS.map(h => (
              <div
                key={h}
                className="text-center text-[11px] font-bold uppercase tracking-widest py-1.5"
                style={{ color: "var(--text-2)" }}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7" style={{ border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden" }}>
            {cells.map((day, idx) => {
              const session = day ? DAY_SESSIONS[day] : undefined;
              const chip = session?.[0];
              const isToday = day === today;
              const isSelected = day === selectedDay;
              const hasSession = !!chip;
              const isGroupSession = chip?.group === selectedGroup || selectedGroup === "Coach";

              return (
                <div
                  key={idx}
                  onClick={() => day && openModal(day)}
                  className="relative group cursor-pointer transition-colors"
                  style={{
                    minHeight: "120px",
                    borderRight: (idx + 1) % 7 === 0 ? "none" : "1px solid var(--border)",
                    borderBottom: idx < cells.length - 7 ? "1px solid var(--border)" : "none",
                    background: day ? (isSelected ? "var(--surface2)" : "var(--card)") : "var(--surface2)",
                    outline: isToday ? "2px solid #F2C400" : "none",
                    outlineOffset: "-2px",
                    padding: "8px",
                  }}
                >
                  {day && (
                    <>
                      {/* Day number + km badge */}
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className="text-sm font-semibold leading-none"
                          style={{ color: isToday ? "#F2C400" : "var(--text-2)" }}
                        >
                          {day}
                        </span>
                        {chip?.km && (
                          <span
                            className="text-[9px] rounded-full px-1.5 py-0.5 font-semibold"
                            style={{ background: "var(--surface3)", color: "var(--text-2)" }}
                          >
                            {chip.km} km
                          </span>
                        )}
                      </div>

                      {/* Session chip */}
                      {hasSession && isGroupSession && (
                        <div
                          className="rounded-r-md px-2 py-1 mb-1"
                          style={{ borderLeft: `3px solid ${chip.color}`, background: `${chip.color}18` }}
                        >
                          <div
                            className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
                            style={{ color: chip.color }}
                          >
                            {chip.time}
                          </div>
                          <div className="text-[11px] font-semibold leading-tight" style={{ color: "var(--text-1)" }}>
                            {chip.label}
                          </div>
                        </div>
                      )}

                      {/* + button on hover */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: "var(--surface3)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                        >
                          +
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer stats bar */}
          <div
            className="mt-4 rounded-xl px-5 py-3 flex items-center gap-6"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              7 séances planifiées
            </span>
            <span style={{ color: "var(--border)" }}>·</span>
            <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              10 km prévus sur le mois
            </span>
          </div>

          {/* Réalisations section */}
          <div className="mt-6">
            <h2 className="text-base font-bold mb-4" style={{ color: "var(--text-1)" }}>
              Réalisations
            </h2>

            {/* Controls */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Day filter pills */}
              <div className="flex gap-1">
                {dayFilterOpts.map(f => (
                  <button
                    key={f}
                    onClick={() => setDayFilter(f)}
                    className="rounded-full px-3 py-1 text-xs font-semibold transition-colors"
                    style={{
                      background: dayFilter === f ? "#F2C400" : "var(--surface2)",
                      color: dayFilter === f ? "#000" : "var(--text-2)",
                      border: dayFilter === f ? "none" : "1px solid var(--border)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Session dropdown */}
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 cursor-pointer"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              >
                <span className="text-xs font-semibold">9 août · matin — Sortie longue</span>
                <IconChevronDown size={12} />
              </div>

              {/* Notification badge */}
              <button
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ background: "#F2C40022", color: "#F2C400", border: "1px solid #F2C40044" }}
              >
                <IconBell />
                Rappel (1)
              </button>
            </div>

            {/* Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)" }}
            >
              {/* Table header */}
              <div
                className="grid text-[10px] font-bold uppercase tracking-widest px-4 py-2.5"
                style={{
                  gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.7fr 1fr",
                  background: "var(--surface2)",
                  color: "var(--text-2)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span>Athlète</span>
                <span>Groupe</span>
                <span>Prévu</span>
                <span>Réalisé</span>
                <span>Chronos</span>
                <span>RPE</span>
                <span>Sensations</span>
              </div>

              {/* Rows */}
              {realisationsAthletes.map((athlete, i) => {
                const rpe = i === 0 ? 8 : i === 1 ? 6 : 7;
                const dotColor = rpe >= 8 ? "#F2C400" : rpe >= 5 ? "#5EBA65" : "#888";
                return (
                  <div
                    key={athlete.id}
                    className="grid items-center px-4 py-3 transition-colors hover:opacity-80 cursor-pointer"
                    style={{
                      gridTemplateColumns: "2fr 1.5fr 1fr 1fr 1fr 0.7fr 1fr",
                      borderBottom: i < realisationsAthletes.length - 1 ? "1px solid var(--border)" : "none",
                    }}
                  >
                    <span className="text-sm font-semibold transition-colors hover:text-[#F2C400]" style={{ color: "#F2C400" }}>
                      {athlete.name}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-2)" }}>{athlete.group}</span>
                    <span className="text-xs" style={{ color: "var(--text-2)" }}>—</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
                      {athlete.kmWeek > 0 ? `${athlete.kmWeek} km` : "—"}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-2)" }}>—</span>
                    <span className="text-xs font-bold" style={{ color: "var(--text-1)" }}>{rpe}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: dotColor }}
                      />
                      <span className="text-[11px]" style={{ color: "var(--text-2)" }}>
                        {rpe >= 8 ? "RPE élevé" : "Saisie"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-3">
              {[
                { dot: "#5EBA65", label: "séance saisie" },
                { dot: "#F2C400", label: "RPE élevé — à surveiller" },
                { dot: "#555", label: "pas encore saisi" },
              ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-2)" }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Athletes Page ───────────────────────────────────────────────────────────

function AthletesPage() {
  const byGroup = GROUPS.slice(0, 3).map(g => ({
    group: g,
    athletes: ATHLETES.filter(a => a.group === g),
  })).filter(g => g.athletes.length > 0);

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
        👥 Mes athlètes
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--text-2)" }}>
        Touche un athlète pour voir ses séances, ses réalisations et ses statistiques.
      </p>

      {byGroup.map(({ group, athletes }) => (
        <div key={group} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--text-2)" }}>
              Athlètes {group} · {athletes.length} athlètes
            </span>
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {athletes.map(a => (
              <div
                key={a.id}
                className="rounded-2xl p-4 cursor-pointer transition-all hover:scale-[1.02]"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: "#F2C400", color: "#000" }}
                  >
                    {a.initials}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{a.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-2)" }}>VMA {a.vma} · {a.pace}</div>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-bold" style={{ color: "var(--text-1)" }}>{a.kmWeek}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-2)" }}>km cette semaine</div>
                  </div>
                  <div
                    className="text-[10px] font-bold uppercase rounded-full px-2 py-0.5"
                    style={{ background: "var(--surface2)", color: "var(--text-2)" }}
                  >
                    {a.group}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Stats Page ──────────────────────────────────────────────────────────────

function StatsPage() {
  const [statsGroup, setStatsGroup] = useState("Athlètes Hommes Espoir / Senior");
  const [statsAthlete, setStatsAthlete] = useState("Antoine Sibille");
  const [chartView, setChartView] = useState<"Par semaine" | "Par mois">("Par semaine");

  const maxKm = Math.max(...WEEK_KM_DATA, 1);

  const kpis = [
    { label: "KM CETTE SEMAINE",    value: "0 km",   sub: "92 km ce mois-ci",   border: "#F2C400" },
    { label: "KM COURSE · SAISON",  value: "92 km",  sub: "10 km prévus",        border: "#5B91D8" },
    { label: "SÉANCES RÉALISÉES",   value: "100%",   sub: "▲ 5/5 prévues",       border: "#5EBA65" },
    { label: "VÉLO · SAISON",       value: "25 km",  sub: "en complément",        border: "#A78BFA" },
    { label: "NATATION · SAISON",   value: "2 km",   sub: "2 000 m",             border: "#2DD4BF" },
  ];

  // Build SVG area chart
  const svgW = 800;
  const svgH = 200;
  const padL = 40;
  const padR = 16;
  const padT = 20;
  const padB = 32;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;
  const n = WEEK_KM_DATA.length;

  function xOf(i: number) {
    return padL + (i / (n - 1)) * chartW;
  }
  function yOf(v: number) {
    return padT + chartH - (v / 80) * chartH;
  }

  const pts = WEEK_KM_DATA.map((v, i) => `${xOf(i)},${yOf(v)}`).join(" ");
  const areaPath =
    `M${xOf(0)},${yOf(WEEK_KM_DATA[0])} ` +
    WEEK_KM_DATA.slice(1).map((v, i) => `L${xOf(i + 1)},${yOf(v)}`).join(" ") +
    ` L${xOf(n - 1)},${padT + chartH} L${xOf(0)},${padT + chartH} Z`;

  const gridYs = [0, 20, 40, 60, 80];

  return (
    <div className="px-8 py-8 max-w-5xl mx-auto">
      {/* Controls row */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        >
          <span className="text-sm font-semibold">{statsGroup}</span>
          <IconChevronDown />
        </div>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer"
          style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text-1)" }}
        >
          <span className="text-sm font-semibold">{statsAthlete}</span>
          <span
            className="text-[10px] rounded-full px-1.5 py-0.5 font-bold"
            style={{ background: "#F2C400", color: "#000" }}
          >
            2
          </span>
          <IconChevronDown />
        </div>
        <div className="flex-1" />
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: "var(--surface2)", color: "var(--text-2)", border: "1px solid var(--border)" }}
        >
          Saison 2026 / 2027
        </span>
        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border)" }}
        >
          {(["Par semaine", "Par mois"] as const).map(v => (
            <button
              key={v}
              onClick={() => setChartView(v)}
              className="px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: chartView === v ? "#F2C400" : "var(--surface2)",
                color: chartView === v ? "#000" : "var(--text-2)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderTop: `3px solid ${kpi.border}`,
            }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-2)" }}>
              {kpi.label}
            </div>
            <div className="text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
              {kpi.value}
            </div>
            <div className="text-xs" style={{ color: kpi.label === "SÉANCES RÉALISÉES" ? "#5EBA65" : "var(--text-2)" }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Area chart */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="mb-4">
          <div className="text-base font-bold" style={{ color: "var(--text-1)" }}>
            Kilométrage par semaine
          </div>
          <div className="text-xs" style={{ color: "var(--text-2)" }}>
            Km course par semaine · 12 dernières semaines
          </div>
        </div>

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F2C400" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#F2C400" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridYs.map(g => (
            <g key={g}>
              <line
                x1={padL} y1={yOf(g)} x2={svgW - padR} y2={yOf(g)}
                stroke="var(--border)" strokeWidth="1"
              />
              <text
                x={padL - 8} y={yOf(g) + 4}
                textAnchor="end" fontSize="10" fill="var(--text-2)"
              >
                {g}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Area line */}
          <polyline
            points={pts}
            fill="none"
            stroke="#F2C400"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {WEEK_KM_DATA.map((v, i) => (
            <circle key={i} cx={xOf(i)} cy={yOf(v)} r="4" fill="#F2C400" />
          ))}

          {/* X labels */}
          {WEEK_LABELS.map((l, i) => (
            <text
              key={l}
              x={xOf(i)} y={svgH - 4}
              textAnchor="middle" fontSize="10" fill="var(--text-2)"
            >
              {l}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ─── Messages Page ───────────────────────────────────────────────────────────

function MessagesPage() {
  const [msgTab, setMsgTab] = useState<"Discussions" | "Annonces">("Discussions");
  const [search, setSearch] = useState("");

  return (
    <div className="px-8 py-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-1)" }}>
        💬 Messagerie
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-2)" }}>
        Discute avec un groupe ou un athlète en particulier, ou diffuse une info officielle.
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(["Discussions", "Annonces"] as const).map(t => (
          <button
            key={t}
            onClick={() => setMsgTab(t)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              background: msgTab === t ? "#F2C400" : "var(--surface2)",
              color: msgTab === t ? "#000" : "var(--text-2)",
              border: msgTab === t ? "none" : "1px solid var(--border)",
            }}
          >
            {t === "Discussions" ? "💬" : "📢"} {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div
        className="flex items-center gap-2 rounded-full px-4 py-2.5 mb-5"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--text-2)" }}><IconSearch /></span>
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "var(--text-1)" }}
          placeholder="Trouver un athlète..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Athlete bubbles */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-1">
        {ATHLETES.map(a => (
          <div key={a.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: "#F2C400", color: "#000" }}
            >
              {a.initials}
            </div>
            <span className="text-[11px] text-center max-w-[52px] leading-tight" style={{ color: "var(--text-2)" }}>
              {a.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Groupes */}
      <div className="mb-4">
        <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-2)" }}>
          Groupes
        </div>
        <div className="space-y-2">
          {GROUPS.map(g => (
            <div
              key={g}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors hover:opacity-80"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ background: "var(--surface2)", color: "var(--text-2)" }}
                >
                  {g.slice(0, 2)}
                </div>
                <span className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{g}</span>
              </div>
              <span className="text-xs" style={{ color: "var(--text-2)" }}>Aucun message</span>
            </div>
          ))}
        </div>
      </div>

      {/* Athlètes */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-2)" }}>
          Athlètes (2)
        </div>
        <div className="space-y-2">
          {ATHLETES.slice(0, 2).map((a, i) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors hover:opacity-80"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: "#F2C400", color: "#000" }}
                >
                  {a.initials}
                </div>
                <div>
                  <div className="font-semibold text-sm" style={{ color: "var(--text-1)" }}>{a.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-2)" }}>
                    {i === 0
                      ? "Pense à saisir ta séance du 9 août..."
                      : "Aucun message récent"}
                  </div>
                </div>
              </div>
              {i === 0 && (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#F2C400" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Root component ──────────────────────────────────────────────────────────

interface Props {
  cScreen: string;
  setCScreen: (s: string) => void;
}

export default function CoachDesktopApp({ cScreen, setCScreen }: Props) {
  const [selectedGroup, setSelectedGroup] = useState("Hommes ES/SE");

  const navItems = [
    { key: "dashboard", label: "Calendrier", icon: "📅" },
    { key: "groups",    label: "Athlètes",   icon: "👥" },
    { key: "clubstats", label: "Stats",       icon: "📊" },
    { key: "messaging", label: "Messages",    icon: "💬" },
  ];

  function renderScreen() {
    switch (cScreen) {
      case "groups":    return <AthletesPage />;
      case "clubstats": return <StatsPage />;
      case "messaging": return <MessagesPage />;
      default:
        return (
          <CalendarPage
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
          />
        );
    }
  }

  return (
    <div
      className="hidden lg:flex min-h-screen"
      style={{ background: "var(--bg)" }}
    >
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 flex-shrink-0 py-6 px-4"
        style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center gap-2 px-2 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
            style={{ background: "#F2C400", color: "#000" }}
          >
            M
          </div>
          <span className="font-black text-sm tracking-tight" style={{ color: "var(--text-1)" }}>
            MOUSTATHLETIC
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map(item => {
            const active = cScreen === item.key || (item.key === "dashboard" && !["groups","clubstats","messaging"].includes(cScreen));
            return (
              <button
                key={item.key}
                onClick={() => setCScreen(item.key)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-left transition-colors"
                style={{
                  background: active ? "#F2C400" : "transparent",
                  color: active ? "#000" : "var(--text-2)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Coach avatar at bottom */}
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-4"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{ background: "#5B91D8", color: "#fff" }}
          >
            CO
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate" style={{ color: "var(--text-1)" }}>Coach</div>
            <div className="text-[10px] truncate" style={{ color: "var(--text-2)" }}>Entraîneur</div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-y-auto">
        {renderScreen()}
      </main>
    </div>
  );
}
