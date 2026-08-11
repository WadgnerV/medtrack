import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'skin-analysis'
const BLUE = '#1a3a5c'
const CLINIC = 'var(--clinic-primary, #1D9E75)'

export default function AnalisisFacialTab({ patient, profile }) {
  const clinicId = profile.active_clinic_id || profile.clinic_id
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [whiteFile, setWhiteFile] = useState(null)
  const [woodFile, setWoodFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const whiteRef = useRef()
  const woodRef = useRef()

  useEffect(() => { loadAnalyses() }, [patient.id])

  async function loadAnalyses() {
    setLoading(true)
    const { data } = await supabase
      .from('skin_analyses')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setAnalyses(data || [])
    setLoading(false)
  }

  async function uploadImage(file, label) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    // Ruta exigida por la RLS del bucket: <clinic_id>/<patient_id>/<archivo>
    const path = `${clinicId}/${patient.id}/${Date.now()}_${label}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file)
    if (error) throw error
    return path
  }

  async function handleSave() {
    if (!whiteFile) { alert('Subí al menos la foto con luz blanca.'); return }
    setSaving(true)
    try {
      const whitePath = await uploadImage(whiteFile, 'white')
      const woodPath = woodFile ? await uploadImage(woodFile, 'wood') : null
      const { error } = await supabase.from('skin_analyses').insert({
        patient_id: patient.id,
        clinic_id: clinicId,
        doctor_id: profile.id,
        source: 'clinical',
        status: 'pending',
        white_image_path: whitePath,
        wood_image_path: woodPath,
      })
      if (error) throw error
      setWhiteFile(null); setWoodFile(null); setCreating(false)
      if (whiteRef.current) whiteRef.current.value = ''
      if (woodRef.current) woodRef.current.value = ''
      await loadAnalyses()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el análisis.')
    }
    setSaving(false)
  }

  async function openImage(path) {
    if (!path) return
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleDelete(a) {
    if (!window.confirm('¿Eliminar este análisis y sus imágenes?')) return
    const paths = [a.white_image_path, a.wood_image_path].filter(Boolean)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    await supabase.from('skin_analyses').delete().eq('id', a.id)
    setAnalyses(list => list.filter(x => x.id !== a.id))
  }

  function fmtDate(s) {
    if (!s) return ''
    return new Date(s).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  const STATUS = {
    pending:   { label: 'Pendiente de análisis', bg: '#FBF1D8', fg: '#8A5E06' },
    analyzing: { label: 'Analizando',            bg: '#E1F1F4', fg: '#0A7183' },
    ready:     { label: 'Listo para validar',    bg: '#E1F1F4', fg: '#0A7183' },
    validated: { label: 'Validado',              bg: '#E7F5EF', fg: '#1C6E4F' },
    error:     { label: 'Error',                 bg: '#F7E7E4', fg: '#8C3A32' },
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: BLUE }}>
            Análisis facial fotográfico
          </h2>
          <div style={{ fontSize: 12, color: '#8aab9a', marginTop: 4 }}>
            {`${patient?.profile?.first_name || ''} ${patient?.profile?.last_name || ''}`.trim()} · Expediente clínico
          </div>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)}
            style={{ marginLeft: 'auto', background: CLINIC, color: '#fff', border: 'none',
              borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo análisis
          </button>
        )}
      </div>

      {creating && (
        <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e2ede9',
          borderRadius: 12, padding: 20 }}>
          <div style={{ fontWeight: 700, color: BLUE, fontSize: 14, marginBottom: 4 }}>Nuevo análisis clínico</div>
          <div style={{ fontSize: 12.5, color: '#6b8f7e', marginBottom: 16 }}>
            Subí la foto con luz blanca (obligatoria) y, si la tenés, la de lámpara de Wood.
          </div>

          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8aab9a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Luz blanca *</div>
              <input ref={whiteRef} type="file" accept="image/*" onChange={e => setWhiteFile(e.target.files[0] || null)}
                style={{ fontSize: 12.5 }} />
              {whiteFile && <div style={{ fontSize: 11.5, color: '#1C6E4F', marginTop: 6 }}>✓ {whiteFile.name}</div>}
            </div>
            <div style={{ flex: '1 1 220px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#8aab9a', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Lámpara de Wood</div>
              <input ref={woodRef} type="file" accept="image/*" onChange={e => setWoodFile(e.target.files[0] || null)}
                style={{ fontSize: 12.5 }} />
              {woodFile && <div style={{ fontSize: 11.5, color: '#1C6E4F', marginTop: 6 }}>✓ {woodFile.name}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={handleSave} disabled={saving || !whiteFile}
              style={{ background: CLINIC, color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 18px', fontSize: 13, fontWeight: 600,
                cursor: saving || !whiteFile ? 'not-allowed' : 'pointer', opacity: saving || !whiteFile ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar análisis'}
            </button>
            <button onClick={() => { setCreating(false); setWhiteFile(null); setWoodFile(null) }} disabled={saving}
              style={{ background: 'transparent', color: '#6b8f7e', border: '1px solid #e2ede9',
                borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e2ede9', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e9f2ef', fontWeight: 700, color: BLUE, fontSize: 14 }}>
          Análisis realizados
        </div>
        {loading ? (
          <div style={{ padding: 20, fontSize: 13, color: '#6b8f7e' }}>Cargando…</div>
        ) : analyses.length === 0 ? (
          <div style={{ padding: 20, fontSize: 13, color: '#6b8f7e' }}>Todavía no hay análisis registrados.</div>
        ) : analyses.map((a, i) => {
          const st = STATUS[a.status] || STATUS.pending
          return (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px',
              borderBottom: i < analyses.length - 1 ? '1px solid #f0f5f3' : 'none' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: CLINIC, fontWeight: 600, marginBottom: 3 }}>
                  {fmtDate(a.created_at)}{a.source === 'self' ? ' · Autoanálisis' : ' · Clínico'}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px', background: st.bg, color: st.fg }}>{st.label}</span>
                  {typeof a.skin_score === 'number' &&
                    <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 10px', background: '#E7F5EF', color: '#1C6E4F' }}>Skin Score {a.skin_score}</span>}
                </div>
              </div>
              <button onClick={() => openImage(a.white_image_path)} style={linkBtn}>Luz blanca</button>
              {a.wood_image_path && <button onClick={() => openImage(a.wood_image_path)} style={linkBtn}>Wood</button>}
              <button onClick={() => handleDelete(a)} style={{ ...linkBtn, color: '#B4544B' }}>Eliminar</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const linkBtn = {
  background: 'transparent', border: 'none', color: '#0A7183',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
}
