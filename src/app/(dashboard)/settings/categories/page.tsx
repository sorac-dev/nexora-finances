"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopNav } from "@/src/components/layout/top-nav";
import { Button } from "@/src/components/ui/button";
import { CardSkeleton } from "@/src/components/ui/skeleton";
import { Icon, ICON_GROUPS, DEFAULT_ICON } from "@/src/components/ui/icon";
import { toast } from "sonner";

interface Cat {
  id: string; name: string; icon: string; color: string; type: "expense" | "income"; isDefault: boolean;
}

const COLORS = ["#FF9F43","#5AC8FA","#BF5AF2","#FF6B81","#34C759","#FFD60A","#0A84FF","#8B5CF6","#30D5C8","#8E8E93","#FF375F","#5E5CE6"];

export default function CategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fName, setFName] = useState("");
  const [fIcon, setFIcon] = useState(DEFAULT_ICON);
  const [fColor, setFColor] = useState("#8E8E93");
  const [fType, setFType] = useState<"expense" | "income">("expense");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await fetch("/api/categories"); if (r.ok) setCats(await r.json()); }
    catch { toast.error("Error al cargar"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function startCreate() {
    setEditId(null); setFName(""); setFIcon(DEFAULT_ICON); setFColor("#8E8E93"); setFType("expense"); setEditing(true);
  }
  function startEdit(c: Cat) {
    setEditId(c.id); setFName(c.name); setFIcon(c.icon); setFColor(c.color); setFType(c.type); setEditing(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!fName.trim()) return toast.error("Elige un nombre");
    setSaving(true);
    const p = { name: fName.trim(), icon: fIcon, color: fColor, type: fType };
    try {
      if (editId) {
        const r = await fetch(`/api/categories/${editId}`, { method:"PUT", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
        if (!r.ok) { toast.error("No se puede editar una categoría por defecto"); return; }
        const u = await r.json();
        setCats((prev) => prev.map((c) => (c.id === editId ? { ...c, ...u } : c)));
        toast.success("Categoría actualizada");
      } else {
        const r = await fetch("/api/categories", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(p) });
        if (!r.ok) throw new Error(""); const c = await r.json();
        setCats((prev) => [...prev, c]);
        toast.success("Categoría creada");
      }
      setEditing(false); setEditId(null);
    } catch { toast.error("Error al guardar"); }
    finally { setSaving(false); }
  }

  async function handleDelete(c: Cat) {
    setDeleting(c.id);
    try {
      const r = await fetch(`/api/categories/${c.id}`, { method:"DELETE" });
      if (r.status === 403) { toast.error("No se pueden eliminar categorías por defecto"); return; }
      if (!r.ok) throw new Error("");
      setCats((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(`"${c.name}" eliminada`);
    } catch { toast.error("Error al eliminar"); }
    finally { setDeleting(null); }
  }

  const expenseCats = cats.filter((c) => c.type === "expense");
  const incomeCats = cats.filter((c) => c.type === "income");

  return (
    <>
      <TopNav title="Categorías" backHref="/settings" />

      {loading ? <CardSkeleton /> : (
        <>
          <div className="eyebrow">Gastos</div>
          <div className="glass-card" style={{ padding: "10px 12px" }}>
            {expenseCats.map((c) => (
              <div key={c.id} className="list-row">
                <div className="icon-circ" style={{ background:`${c.color}22` }}>
                  <Icon name={c.icon} size={20} color={c.color} />
                </div>
                <div className="col" style={{ flex:1 }}>
                  <span className="txt-strong" style={{ fontSize:14 }}>{c.name}</span>
                </div>
                {c.isDefault ? (
                  <span className="txt-dim" style={{ fontSize:10, marginRight:6 }}>Default</span>
                ) : (
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => startEdit(c)} className="top-nav-btn" style={{ width:30, height:30, borderRadius:10 }} title="Editar">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => handleDelete(c)} className="top-nav-btn"
                      style={{ width:30, height:30, borderRadius:10, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.25)" }}
                      disabled={deleting === c.id}>
                      <Icon name="Trash2" size={14} color="#FF6B6B" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="eyebrow" style={{ marginTop:16 }}>Ingresos</div>
          <div className="glass-card" style={{ padding: "10px 12px" }}>
            {incomeCats.map((c) => (
              <div key={c.id} className="list-row">
                <div className="icon-circ" style={{ background:`${c.color}22` }}>
                  <Icon name={c.icon} size={20} color={c.color} />
                </div>
                <div className="col" style={{ flex:1 }}>
                  <span className="txt-strong" style={{ fontSize:14 }}>{c.name}</span>
                </div>
                {c.isDefault ? (
                  <span className="txt-dim" style={{ fontSize:10, marginRight:6 }}>Default</span>
                ) : (
                  <div style={{ display:"flex", gap:4 }}>
                    <button onClick={() => startEdit(c)} className="top-nav-btn" style={{ width:30, height:30, borderRadius:10 }}>
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => handleDelete(c)} className="top-nav-btn"
                      style={{ width:30, height:30, borderRadius:10, background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.25)" }}
                      disabled={deleting === c.id}>
                      <Icon name="Trash2" size={14} color="#FF6B6B" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop:16 }}>
        <Button variant="secondary" onClick={startCreate}>+ Agregar categoría</Button>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {editing && (
          <div style={{ position:"fixed", inset:0, zIndex:9995, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}
            onClick={() => setEditing(false)}>
            <motion.div initial={{ y:"100%" }} animate={{ y:0 }} exit={{ y:"100%" }} transition={{ type:"spring", damping:28, stiffness:300 }}
              className="glass-strong" style={{ width:"100%", maxWidth:500, maxHeight:"85dvh", borderRadius:"28px 28px 0 0", padding:"24px 22px 34px", overflowY:"auto" }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width:40, height:5, borderRadius:10, background:"var(--track)", margin:"0 auto 20px" }} />
              <div style={{ textAlign:"center", marginBottom:20 }}>
                <Icon name={fIcon} size={36} color={fColor} />
                <div style={{ fontSize:20, fontWeight:800, marginTop:8 }}>{editId ? "Editar categoría" : "Nueva categoría"}</div>
              </div>

              <form onSubmit={handleSave}>
                <label className="field-label">Nombre</label>
                <input className="nexora-input" placeholder="Ej. Mascotas, Cafetería..." value={fName} onChange={(e) => setFName(e.target.value)} autoFocus />

                <label className="field-label">Tipo</label>
                <div className="segmented">
                  {[{ id:"expense", label:"Gasto" },{ id:"income", label:"Ingreso" }].map((t) => (
                    <div key={t.id} className={`seg ${fType === t.id ? "active" : ""}`} onClick={() => setFType(t.id as typeof fType)}>{t.label}</div>
                  ))}
                </div>

                <label className="field-label">Icono</label>
                {ICON_GROUPS.map((group) => (
                  <div key={group.label} style={{ marginBottom: 10 }}>
                    <div className="txt-faint" style={{ fontSize:10, marginBottom:6 }}>{group.label}</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {group.icons.map((iconName) => (
                        <motion.div key={iconName} whileTap={{ scale:0.85 }} onClick={() => setFIcon(iconName)}
                          style={{
                            width:44, height:44, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center",
                            cursor:"pointer", background: fIcon === iconName ? fColor : "var(--glass)",
                            border: fIcon === iconName ? `2px solid ${fColor}` : "1px solid var(--glass-border-strong)",
                            boxShadow: fIcon === iconName ? `0 0 12px ${fColor}44` : undefined,
                          }}>
                          <Icon name={iconName} size={22} color={fIcon === iconName ? "#fff" : "var(--text-dim)"} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}

                <label className="field-label">Color</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
                  {COLORS.map((c) => (
                    <motion.div key={c} whileTap={{ scale:0.85 }} onClick={() => setFColor(c)}
                      style={{ width:38, height:38, borderRadius:"50%", background:c, cursor:"pointer", border: fColor===c ? "2px solid var(--text)" : "2px solid transparent", boxShadow: fColor===c ? `0 0 0 3px ${c}44` : undefined, position:"relative" }}>
                      {fColor === c && <Icon name="Check" size={18} color="#fff" />}
                    </motion.div>
                  ))}
                </div>

                <Button type="submit" disabled={saving}>{saving ? "Guardando..." : editId ? "Actualizar" : "Crear categoría"}</Button>
                <div style={{ height:8 }} />
                <Button variant="ghost" type="button" onClick={() => setEditing(false)}>Cancelar</Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
