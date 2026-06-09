import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#0e4d8a'

const emptyForm = {
  note_date: new Date().toISOString().split('T')[0],
  motivo: '',
  hallazgos: '',
  anestesia_tipo: '',
  anestesia_tecnica: '',
  anestesia_cantidad: '',
  diagnostico_sesion: '',
  tratamiento_realizado: '',
  materiales: '',
  indicaciones: '',
  proxima_fase: '',
}

function CollapsibleNote({ n, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const dName = n.author
    ? `${n.author.prefix ? n.author.prefix + ' ' : ''}${n.author.first_name} ${n.author.last_name}`
    : 'Odontólogo'
  const fecha = new Date(n.note_date).toLocaleDateString('es-CR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const createdAt = n.created_at ? new Date(n.created_at) : new Date(n.note_date)
  const canEdit = (Date.now() - createdAt.getTime()) < 24 * 60 * 60 * 1000

  const data = n.note_data || {}

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const lbl = { fontSize:11, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.6px', display:'block', marginBottom:3 }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, marginBottom:8, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', cursor:'pointer' }}
        onClick={() => setExpanded(x => !x)}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:COLOR }}>{dName}</div>
          <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{fecha}</div>
          {data.diagnostico_sesion && (
            <div style={{ fontSize:12, color:'#555', marginTop:4 }}>{data.diagnostico_sesion}</div>
          )}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(n) }}
              style={{ padding:'3px 10px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:12, color:'#666', background:'#fff' }}>
              Editar
            </button>
          )}
          {canEdit && (
            <button onClick={e => { e.stopPropagation(); onDelete(n.id) }}
              style={{ padding:'3px 10px', border:'1px solid #D85A30', borderRadius:8, cursor:'pointer', fontSize:12, color:'#D85A30', background:'#fff' }}>
              Eliminar
            </button>
          )}
          {!canEdit && <span style={{ fontSize:11, color:'#bbb', fontStyle:'italic' }}>Bloqueada</span>}
          <span style={{ fontSize:12, color:'#bbb', marginLeft:2 }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ background:'#f8f8f8', borderTop:'0.5px solid #eee', padding:'14px 16px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {data.motivo && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Motivo de consulta</label>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.5 }}>{data.motivo}</div>
              </div>
            )}
            {data.hallazgos && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Hallazgos clínicos</label>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.5 }}>{data.hallazgos}</div>
              </div>
            )}
            {(data.anestesia_tipo || data.anestesia_tecnica || data.anestesia_cantidad) && (
              <div style={{ gridColumn:'1/-1', background:'#fff', border:'0.5px solid #e0e8f4', borderRadius:8, padding:'10px 12px' }}>
                <label style={lbl}>Anestesia</label>
                <div style={{ fontSize:13, color:'#333' }}>
                  {[data.anestesia_tipo, data.anestesia_tecnica, data.anestesia_cantidad && data.anestesia_cantidad + ' carpules'].filter(Boolean).join(' · ')}
                </div>
              </div>
            )}
            {data.diagnostico_sesion && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Diagnóstico de sesión</label>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.5 }}>{data.diagnostico_sesion}</div>
              </div>
            )}
            {data.tratamiento_realizado && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Tratamiento realizado</label>
                <div style={{ fontSize:13, color:'#333', lineHeight:1.5 }}>{data.tratamiento_realizado}</div>
              </div>
            )}
            {data.materiales && (
              <div>
                <label style={lbl}>Materiales utilizados</label>
                <div style={{ fontSize:13, color:'#333' }}>{data.materiales}</div>
              </div>
            )}
            {data.indicaciones && (
              <div>
                <label style={lbl}>Indicaciones postoperatorias</label>
                <div style={{ fontSize:13, color:'#333' }}>{data.indicaciones}</div>
              </div>
            )}
            {data.proxima_fase && (
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Próxima fase</label>
                <div style={{ fontSize:13, color:COLOR, fontWeight:500 }}>{data.proxima_fase}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OdontologiaNoteForm({ patientId, profile }) {
  const [notes, setNotes] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
  const inpM = { ...inp, minHeight:80, resize:'vertical' }
  const lbl = { fontSize:12, fontWeight:600, color:'#555', marginBottom:4, display:'block' }
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => { if (patientId) load() }, [patientId])

  async function load() {
    const { data } = await supabase.from('clinical_notes')
      .select('*, author:recorded_by(first_name, last_name, prefix)')
      .eq('patient_id', patientId)
      .eq('module_type', 'odontologia')
      .order('note_date', { ascending: false })
    setNotes(data || [])
    setLoaded(true)
  }

  async function save() {
    if (!form.motivo.trim() && !form.tratamiento_realizado.trim() && !form.diagnostico_sesion.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      patient_id: patientId,
      module_type: 'odontologia',
      note_text: [form.motivo, form.diagnostico_sesion, form.tratamiento_realizado].filter(Boolean).join(' — '),
      note_date: form.note_date,
      recorded_by: user.id,
      note_data: form,
    }
    if (editingId) await supabase.from('clinical_notes').update(payload).eq('id', editingId)
    else await supabase.from('clinical_notes').insert(payload)
    setForm(emptyForm); setEditingId(null); setShowForm(false)
    await load(); setSaving(false)
  }

  async function deleteNote(id) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    await supabase.from('clinical_notes').delete().eq('id', id)
    await load()
  }

  function startEdit(note) {
    setForm(note.note_data || emptyForm)
    setEditingId(note.id)
    setShowForm(true)
  }

  const ANESTESIA_TIPOS = ['Lidocaína 2% c/epinefrina','Mepivacaína 3%','Articaína 4% c/epinefrina','Bupivacaína 0.5%']
  const ANESTESIA_TECNICAS = ['Infiltrativa','Bloqueo nervio alveolar inferior','Bloqueo nervio mentoniano','Bloqueo nervio palatino','Bloqueo nervio nasopalatino','Intraligamentaria','Intrapulpar']

  return (
    <div>
      {!showForm && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
          <button onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null) }}
            style={{ padding:'7px 16px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500 }}>
            + Nueva nota
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:16, marginBottom:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{editingId ? 'Editar nota' : 'Nueva nota clínica'}</div>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa', lineHeight:1 }}>×</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={lbl}>Fecha</label>
              <input type="date" style={inp} value={form.note_date} onChange={f('note_date')} />
            </div>
            <div />

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Motivo de consulta</label>
              <input type="text" style={inp} value={form.motivo} onChange={f('motivo')} placeholder="Ej: Dolor pieza 36, control post-extracción..." />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Hallazgos clínicos</label>
              <textarea style={inpM} value={form.hallazgos} onChange={f('hallazgos')} placeholder="Exploración clínica, hallazgos al examen..." />
            </div>

            <div style={{ gridColumn:'1/-1', background:'#f4f8ff', border:'0.5px solid #dce8f8', borderRadius:10, padding:'12px 14px' }}>
              <div style={{ fontSize:12, fontWeight:600, color:COLOR, marginBottom:10 }}>Anestesia</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Tipo</label>
                  <select style={inp} value={form.anestesia_tipo} onChange={f('anestesia_tipo')}>
                    <option value="">Seleccionar...</option>
                    {ANESTESIA_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    <option value="Otra">Otra</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Técnica</label>
                  <select style={inp} value={form.anestesia_tecnica} onChange={f('anestesia_tecnica')}>
                    <option value="">Seleccionar...</option>
                    {ANESTESIA_TECNICAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Cantidad (carpules)</label>
                  <input type="number" style={inp} value={form.anestesia_cantidad} onChange={f('anestesia_cantidad')} placeholder="1.5" step="0.5" min="0" />
                </div>
              </div>
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Diagnóstico de sesión</label>
              <textarea style={inpM} value={form.diagnostico_sesion} onChange={f('diagnostico_sesion')} placeholder="Diagnóstico clínico de esta sesión..." />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Tratamiento realizado</label>
              <textarea style={{ ...inpM, minHeight:100 }} value={form.tratamiento_realizado} onChange={f('tratamiento_realizado')} placeholder="Procedimiento realizado en esta sesión..." />
            </div>

            <div>
              <label style={lbl}>Materiales utilizados</label>
              <textarea style={inpM} value={form.materiales} onChange={f('materiales')} placeholder="Ej: Resina compuesta A2, adhesivo..." />
            </div>

            <div>
              <label style={lbl}>Indicaciones postoperatorias</label>
              <textarea style={inpM} value={form.indicaciones} onChange={f('indicaciones')} placeholder="Indicaciones para el paciente..." />
            </div>

            <div style={{ gridColumn:'1/-1' }}>
              <label style={lbl}>Próxima fase / cita</label>
              <input type="text" style={inp} value={form.proxima_fase} onChange={f('proxima_fase')} placeholder="Ej: Cementado corona, extracción pieza 18..." />
            </div>
          </div>

          <div style={{ display:'flex', gap:8, marginTop:14, justifyContent:'flex-end' }}>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm) }}
              style={{ padding:'8px 14px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              style={{ padding:'8px 22px', background:COLOR, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando...' : editingId ? 'Actualizar nota' : 'Guardar nota'}
            </button>
          </div>
        </div>
      )}

      {!loaded ? (
        <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : notes.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin notas registradas.</div>
      ) : notes.map(n => (
        <CollapsibleNote key={n.id} n={n} onEdit={startEdit} onDelete={deleteNote} />
      ))}
    </div>
  )
}
