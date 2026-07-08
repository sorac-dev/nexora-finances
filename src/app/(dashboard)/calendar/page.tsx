"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { Icon } from "@/src/components/ui/icon";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { toast } from "sonner";

interface CalendarEvent {
  id?: string; day: number; label: string;
  type: "corte" | "limite" | "tarjeta_corte" | "tarjeta_pago" | "meta";
  details?: string; icon: string; color: string;
  paid?: boolean; statusLabel?: string;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["L","M","X","J","V","S","D"];
const WEEKDAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const TYPE_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  corte: { color: "#FF9F43", icon: "Calendar", label: "Día de corte" },
  limite: { color: "#FF6B6B", icon: "AlertTriangle", label: "Día límite" },
  tarjeta_corte: { color: "#0A84FF", icon: "CreditCard", label: "Corte tarjeta" },
  tarjeta_pago: { color: "#8B5CF6", icon: "Banknote", label: "Pago tarjeta" },
  meta: { color: "#34C759", icon: "Target", label: "Meta" },
};

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDayOffset(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

function daysUntil(dateStr: string): number {
  let d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
  while (d.getTime() < Date.now() - 86400000) d.setMonth(d.getMonth() + 1);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
function daysText(n: number) { if (n <= 0) return "Vencido"; if (n === 1) return "Mañana"; return `En ${n} días`; }

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/calendar?year=${year}&month=${month}`);
      if (r.ok) setEvents(await r.json());
    } catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function prevMonth() { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); setSelectedDay(null); }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); setSelectedDay(null); }
  function goToday() { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(today.getDate()); }

  const totalDays = daysInMonth(year, month);
  const offset = firstDayOffset(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const selectedEvents = selectedDay ? events.filter((e) => e.day === selectedDay) : [];
  const dayEvents = new Map<number, CalendarEvent[]>();
  events.forEach((e) => {
    if (!dayEvents.has(e.day)) dayEvents.set(e.day, []);
    dayEvents.get(e.day)!.push(e);
  });

  const groupedSelected: Record<string, CalendarEvent[]> = {};
  selectedEvents.forEach((e) => { if (!groupedSelected[e.type]) groupedSelected[e.type] = []; groupedSelected[e.type].push(e); });

  return (
    <>
      <TopNav title="Calendario" backHref="/more" />

      <div className="glass-strong" style={{ padding: "16px 18px", borderRadius: 20, marginBottom: 12 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <button type="button" onClick={prevMonth} className="top-nav-btn" style={{ width: 36, height: 36, borderRadius: 12 }}>
            <Icon name="ChevronLeft" size={18} />
          </button>
          <motion.div key={`${year}-${month}`} initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
            style={{ textAlign:"center", cursor:"pointer" }} onClick={goToday}>
            <div style={{ fontSize:20, fontWeight:800 }}>{MONTHS[month]} {year}</div>
            <div className="txt-dim" style={{ fontSize:11 }}>Hoy: {today.getDate()} {MONTHS[today.getMonth()].slice(0,3)}</div>
          </motion.div>
          <button type="button" onClick={nextMonth} className="top-nav-btn" style={{ width: 36, height: 36, borderRadius: 12 }}>
            <Icon name="ChevronRight" size={18} />
          </button>
        </div>

        <div className="cal-grid" style={{ marginBottom: 4 }}>
          {DAY_NAMES.map((d) => <div key={d} style={{ fontSize:12, color:"var(--text-faint)", fontWeight:700, padding:"6px 0", textAlign:"center" }}>{d}</div>)}
        </div>

        <div className="cal-grid">
          {cells.map((cell, i) => {
            if (cell === null) return <div key={`e-${i}`} style={{ aspectRatio:"1" }} />;
            const isToday = cell === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isSelected = cell === selectedDay;
            const dayEvts = dayEvents.get(cell) || [];
            const hasEvents = dayEvts.length > 0;
            return (
              <motion.div key={cell} whileTap={{ scale:0.92 }} onClick={() => setSelectedDay(isSelected ? null : cell)}
                style={{ aspectRatio:"1", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                  borderRadius:14, cursor:"pointer", position:"relative",
                  background: isSelected ? "var(--c-blue)" : isToday ? "rgba(10,132,255,0.1)" : "transparent",
                  color: isSelected ? "#fff" : isToday ? "var(--c-blue)" : "var(--text)",
                  border: isSelected ? "2px solid var(--c-blue)" : isToday ? "1px solid var(--c-blue)" : "1px solid transparent",
                  fontWeight: isSelected || isToday ? 700 : 500, fontSize:14 }}>
                {cell}
                {hasEvents && !isSelected && (
                  <div style={{ display:"flex", gap:2, marginTop:2 }}>
                    {[...new Set(dayEvts.map((e) => e.color))].slice(0, 3).map((c) => <div key={c} style={{ width:5, height:5, borderRadius:"50%", background:c }} />)}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:14, fontSize:11 }}>
        {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
          <div key={key} style={{ display:"flex", alignItems:"center", gap:4 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:cfg.color }} />
            <span style={{ color:"var(--text-dim)" }}>{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="glass-strong" style={{ padding:"16px 18px", borderRadius:20, marginBottom:14 }}>
          <div className="row" style={{ marginBottom: selectedEvents.length > 0 ? 12 : 0 }}>
            <div><div style={{ fontSize:16, fontWeight:800 }}>{WEEKDAYS[new Date(year, month, selectedDay).getDay()]} {selectedDay}</div>
            <div className="txt-dim" style={{ fontSize:12 }}>{MONTHS[month]} {year}</div></div>
            {selectedEvents.length > 0 && <span style={{ fontSize:12, fontWeight:700, color:"var(--c-blue)" }}>{selectedEvents.length} compromiso{selectedEvents.length > 1 ? "s" : ""}</span>}
          </div>
          {loading ? <CardSkeleton /> : selectedEvents.length === 0 ? (
            <div className="txt-dim" style={{ textAlign:"center", padding:"16px 0", fontSize:13 }}>Sin compromisos para este día</div>
          ) : (
            Object.entries(groupedSelected).map(([type, evts]) => {
              const cfg = TYPE_CONFIG[type];
              return (
                <div key={type} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                    <Icon name={cfg.icon} size={14} color={cfg.color} />
                    <span style={{ fontSize:12, fontWeight:700, color:cfg.color }}>{cfg.label}</span>
                  </div>
                  {evts.map((e) => (
                    <div key={e.id} className="list-row" style={{ padding:"8px 0" }}>
                      <div className="icon-circ" style={{ background: `${e.color}18`, width:36, height:36, borderRadius:10 }}>
                        <Icon name={e.paid ? "CheckCircle" : e.icon} size={18} color={e.color} />
                      </div>
                      <div className="col" style={{ flex:1 }}>
                        <span className="txt-strong" style={{ fontSize:13 }}>{e.label}</span>
                        {e.details && (
                          <span style={{ fontSize:11, color: e.color, fontWeight: e.paid ? 600 : 400 }}>
                            {e.details}
                          </span>
                        )}
                      </div>
                      {e.paid && <Icon name="CheckCircle" size={14} color="var(--c-save)" />}
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Upcoming */}
      <div className="eyebrow">Próximos compromisos</div>
      {loading ? <CardSkeleton /> : (
        <div className="glass" style={{ padding:"8px 12px", borderRadius:18, marginBottom:14 }}>
          {events
            .filter((e) => e.day >= today.getDate() || (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())))
            .sort((a, b) => a.day - b.day)
            .slice(0, 10)
            .map((e) => {
              const cfg = TYPE_CONFIG[e.type];
              return (
                <div key={e.id} className="list-row" style={{ padding:"8px 0" }}>
                  <div style={{ width:36, textAlign:"center" }}>
                    <span style={{ fontSize:16, fontWeight:800 }}>{e.day}</span>
                    <div className="txt-faint" style={{ fontSize:9 }}>{MONTHS[month].slice(0,3)}</div>
                  </div>
                  <div className="icon-circ" style={{ background:`${cfg.color}22`, width:36, height:36, borderRadius:10 }}>
                    <Icon name={cfg.icon} size={18} color={cfg.color} />
                  </div>
                  <div className="col" style={{ flex:1 }}>
                    <span className="txt-strong" style={{ fontSize:13 }}>{e.label}</span>
                    <span className="txt-dim" style={{ fontSize:11 }}>{e.details || cfg.label}</span>
                  </div>
                  <span style={{ fontSize:11, fontWeight:700, color:cfg.color, background:`${cfg.color}15`, padding:"3px 8px", borderRadius:8 }}>{cfg.label}</span>
                </div>
              );
            })}
          {events.filter((e) => e.day >= today.getDate()).length === 0 && (
            <div className="txt-dim" style={{ textAlign:"center", padding:"20px 0", fontSize:13 }}>Sin compromisos próximos este mes</div>
          )}
        </div>
      )}
    </>
  );
}
