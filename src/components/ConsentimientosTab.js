import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ConsentimientosTab({ patient, profile }) {
  const [consents, setConsents] = useState([])
  const [clinic, setClinic] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({ procedure_type:'', sessions:'', body_area:'', adverse_effects:'' })
  const doctorSigRef = useRef()
  const patientSigRef = useRef()
  const [doctorSig, setDoctorSig] = useState('')
  const [patientSig, setPatientSig] = useState('')

  useEffect(() => { loadAll() }, [patient.id])

  async function loadAll() {
    setLoading(true)
    const [{ data: c }, { data: b }, { data: cs }] = await Promise.all([
      supabase.from('clinics').select('name, legal_name, legal_id, address').eq('id', profile.clinic_id).single(),
      supabase.from('branches').select('address').eq('clinic_id', profile.clinic_id).limit(1).single(),
      supabase.from('informed_consents').select('*, doctor:signed_by(first_name, last_name)').eq('patient_id', patient.id).order('created_at', { ascending: false })
    ])
    setClinic(c)
    setBranch(b)
    setConsents(cs || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ procedure_type:'', sessions:'', body_area:'', adverse_effects:'' })
    setDoctorSig('')
    setPatientSig('')
  }

  async function handleSave() {
    if (!form.procedure_type || !doctorSig || !patientSig) {
      alert('Complete el procedimiento y ambas firmas.')
      return
    }
    setSaving(true)
    await supabase.from('informed_consents').insert({
      patient_id: patient.id,
      clinic_id: profile.clinic_id,
      signed_by: profile.id,
      procedure_type: form.procedure_type,
      sessions: form.sessions ? parseInt(form.sessions) : null,
      body_area: form.body_area,
      adverse_effects: form.adverse_effects,
      branch_address: branch?.address || '',
      doctor_signature: doctorSig,
      patient_signature: patientSig,
      status: 'signed',
    })
    await loadAll()
    setModal(false)
    resetForm()
    setSaving(false)
  }

  function handlePrint(c) {
    const win = window.open('', '_blank')
    const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
    const dName = c.doctor ? `${c.doctor.first_name} ${c.doctor.last_name}` : ''
    const fecha = new Date(c.signed_at).toLocaleString('es-CR', { dateStyle:'full', timeStyle:'short' })
    win.document.write(`
      <html><head><title>Consentimiento Informado</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 750px; margin: 40px auto; font-size: 13px; color: #222; line-height: 1.6; }
        h2 { text-align:center; font-size:15px; margin-bottom:2px; }
        h3 { text-align:center; font-size:13px; font-weight:normal; margin-top:0; }
        .section { margin: 18px 0; }
        .label { font-weight:bold; }
        .sig-row { display:flex; justify-content:space-between; margin-top:40px; gap:40px; }
        .sig-box { flex:1; text-align:center; border-top:1px solid #333; padding-top:8px; font-size:12px; }
        img { max-width:180px; max-height:80px; display:block; margin:0 auto 6px; }
        hr { border:none; border-top:1px solid #ccc; margin:18px 0; }
      </style></head><body>
      <h2>${clinic?.legal_name || clinic?.name || ''}</h2>
      <h3>Cédula Jurídica / ID: ${clinic?.legal_id || ''}</h3>
      <h3>${branch?.address || clinic?.address || ''}</h3>
      <hr/>
      <h2>CONSENTIMIENTO INFORMADO</h2>
      <div class="section">
        <p>Yo, <strong>${pName}</strong>, en pleno uso de mis facultades mentales, declaro haber sido informado/a de manera clara y comprensible sobre el procedimiento que se describe a continuación, sus alcances, riesgos y efectos adversos posibles, y manifiesto mi conformidad para que sea realizado.</p>
      </div>
      <div class="section">
        <p><span class="label">Procedimiento a realizar:</span> ${c.procedure_type}</p>
        ${c.sessions ? `<p><span class="label">Cantidad de sesiones:</span> ${c.sessions}</p>` : ''}
        ${c.body_area ? `<p><span class="label">Área de aplicación:</span> ${c.body_area}</p>` : ''}
        ${c.adverse_effects ? `<p><span class="label">Efectos adversos informados:</span><br/>${c.adverse_effects}</p>` : ''}
      </div>
      <div class="section">
        <p>El/la paciente declara haber recibido explicación sobre los posibles efectos adversos mencionados, y acepta voluntariamente someterse al procedimiento descrito.</p>
        <p>Este consentimiento fue firmado en: <strong>${c.branch_address || ''}</strong></p>
        <p>Fecha y hora: <strong>${fecha}</strong></p>
      </div>
      <div class="sig-row">
        <div class="sig-box">
          ${c.doctor_signature ? `<img src="${c.doctor_signature}" alt="Firma médico"/>` : ''}
          <p>${dName}</p>
          <p>Profesional tratante</p>
        </div>
        <div class="sig-box">
          ${c.patient_signature ? `<img src="${c.patient_signature}" alt="Firma paciente"/>` : ''}
          <p>${pName}</p>
          <p>Paciente</p>
        </div>
      </div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  function SigPad({ label, value, onChange }) {
    const ref = useRef()
    const drawing = useRef(false)
    const ctx = useRef()

    useEffect(() => {
      const canvas = ref.current
      canvas.width = canvas.offsetWidth
      canvas.height = 120
      ctx.current = canvas.getContext('2d')
      ctx.current.strokeStyle = '#1a1a1a'
      ctx.current.lineWidth = 2
      ctx.current.lineCap = 'round'
    }, [])

    function getPos(e) {
      const r = ref.current.getBoundingClientRect()
      const src = e.touches ? e.touches[0] : e
      return { x: src.clientX - r.left, y: src.clientY - r.top }
    }

    function start(e) { e.preventDefault(); drawing.current = true; const p = getPos(e); ctx.current.beginPath(); ctx.current.moveTo(p.x, p.y) }
    function move(e) { e.preventDefault(); if (!drawing.current) return; const p = getPos(e); ctx.current.lineTo(p.x, p.y); ctx.current.stroke() }
    function end(e) { e.preventDefault(); drawing.current = false; onChange(ref.current.toDataURL()) }
    function clear() { ctx.current.clearRect(0, 0, ref.current.width, ref.current.height); onChange('') }

    return (
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'#333' }}>{label}</div>
        <canvas ref={ref} style={{ width:'100%', height:120, border:'1px solid #ddd', borderRadius:8, cursor:'crosshair', touchAction:'none', background:'#fafafa' }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
        <button onClick={clear} style={{ marginTop:4, background:'none', border:'none', fontSize:12, color:'#999', cursor:'pointer' }}>Limpiar</button>
        {value && <div style={{ fontSize:11, color:'#1D9E75', marginTop:2 }}>✓ Firma registrada</div>}
      </div>
    )
  }

  const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()

  const s = {
    wrap: { padding:'16px 0' },
    toolbar: { display:'flex', justifyContent:'flex-end', marginBottom:14 },
    btn: { background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' },
    empty: { textAlign:'center', color:'#aaa', fontSize:14, padding:'40px 0' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', color:'#333', verticalAlign:'middle' },
    iconBtn: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
    modalBox: { background:'#fff', borderRadius:14, padding:28, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' },
    label: { fontSize:13, fontWeight:500, color:'#333', marginBottom:4, display:'block' },
    input: { width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:14 },
    textarea: { width:'100%', padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:14, minHeight:80, resize:'vertical' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        <button style={s.btn} onClick={() => { resetForm(); setModal(true) }}>+ Nuevo consentimiento</button>
      </div>

      {loading ? (
        <div style={s.empty}>Cargando...</div>
      ) : consents.length === 0 ? (
        <div style={s.empty}>No hay consentimientos registrados para este paciente.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Procedimiento</th>
              <th style={s.th}>Área</th>
              <th style={s.th}>Sesiones</th>
              <th style={s.th}>Fecha</th>
              <th style={s.th}>Estado</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {consents.map(c => (
              <tr key={c.id}>
                <td style={s.td}>{c.procedure_type}</td>
                <td style={s.td}>{c.body_area || '—'}</td>
                <td style={s.td}>{c.sessions || '—'}</td>
                <td style={s.td}>{new Date(c.signed_at).toLocaleDateString('es-CR')}</td>
                <td style={s.td}>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:12, background: c.status === 'signed' ? '#E1F5EE' : '#f0f0f0', color: c.status === 'signed' ? '#0F6E56' : '#888' }}>
                    {c.status === 'signed' ? 'Firmado' : 'Pendiente'}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={s.iconBtn} onClick={() => handlePrint(c)}>Imprimir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) { setModal(false); resetForm() } }}>
          <div style={s.modalBox}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:18, color:'#1a1a1a' }}>Nuevo consentimiento informado</div>

            <label style={s.label}>Tipo de procedimiento *</label>
            <input style={s.input} value={form.procedure_type} onChange={e => setForm(f => ({...f, procedure_type: e.target.value}))} placeholder="Ej: Aplicación de toxina botulínica" />

            <label style={s.label}>Cantidad de sesiones</label>
            <input style={s.input} type="number" min="1" value={form.sessions} onChange={e => setForm(f => ({...f, sessions: e.target.value}))} placeholder="Ej: 3" />

            <label style={s.label}>Área de aplicación</label>
            <input style={s.input} value={form.body_area} onChange={e => setForm(f => ({...f, body_area: e.target.value}))} placeholder="Ej: Frente y entrecejo" />

            <label style={s.label}>Efectos adversos informados</label>
            <textarea style={s.textarea} value={form.adverse_effects} onChange={e => setForm(f => ({...f, adverse_effects: e.target.value}))} placeholder="Describa los efectos adversos explicados al paciente..." />

            <div style={{ background:'#f8f8f8', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#666', marginBottom:16 }}>
              📍 {branch?.address || clinic?.address || 'Sin dirección registrada'} · {new Date().toLocaleString('es-CR', { dateStyle:'full', timeStyle:'short' })}
            </div>

            <SigPad label="Firma del profesional tratante *" value={doctorSig} onChange={setDoctorSig} />
            <SigPad label={`Firma del paciente (${pName}) *`} value={patientSig} onChange={setPatientSig} />

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button style={{ ...s.iconBtn, padding:'8px 16px' }} onClick={() => { setModal(false); resetForm() }}>Cancelar</button>
              <button style={{ ...s.btn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar y firmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
