import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ContratoServicioTab from './ContratoServicioTab'

function SigPad({ label, value, onChange }) {
  const ref = useRef()
  const drawing = useRef(false)
  const ctx = useRef()

  useEffect(() => {
    const canvas = ref.current
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 500
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
      <canvas ref={ref}
        style={{ width:'100%', height:120, border:'1px solid #ddd', borderRadius:8, cursor:'crosshair', touchAction:'none', background:'#fafafa' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" onClick={clear} style={{ marginTop:4, background:'none', border:'none', fontSize:12, color:'#999', cursor:'pointer' }}>Limpiar</button>
      {value && <div style={{ fontSize:11, color:'var(--clinic-primary, #1D9E75)', marginTop:2 }}>✓ Firma registrada</div>}
    </div>
  )
}

const EFECTOS_ADVERSOS = [
  { group: 'Locales', items: [
    'Dolor o molestia en el sitio de aplicación',
    'Eritema (enrojecimiento)',
    'Edema (inflamación)',
    'Equimosis (moretones)',
    'Prurito (picazón)',
    'Induración o nódulos',
    'Infección local',
  ]},
  { group: 'Sistémicos', items: [
    'Reacción alérgica',
    'Mareo o lipotimia',
    'Náuseas',
    'Cefalea',
  ]},
  { group: 'Resultado', items: [
    'Efecto mayor al esperado',
    'Efecto menor al esperado por incumplimiento de indicaciones postprocedimiento',
    'Asimetría o resultado no esperado',
    'Migración del producto',
    'Necrosis tisular (raro)',
  ]},
]

export default function ConsentimientosTab({ patient, profile }) {
  const [consents, setConsents] = useState([])
  const [clinic, setClinic] = useState(null)
  const [branch, setBranch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ procedure_type:'', sessions:'', body_area:'' })
  const [selectedEffects, setSelectedEffects] = useState([])
  const [doctorSig, setDoctorSig] = useState('')
  const [patientSig, setPatientSig] = useState('')

  useEffect(() => { loadAll() }, [patient.id])

  async function loadAll() {
    setLoading(true)
    const [{ data: c }, { data: b }, { data: cs }] = await Promise.all([
      supabase.from('clinics').select('name, legal_name, legal_id, address').eq('id', profile.clinic_id).single(),
      supabase.from('branches').select('address').eq('clinic_id', profile.clinic_id).limit(1).single(),
      supabase.from('informed_consents').select('*, doctor:signed_by(first_name, last_name, prefix, medical_code)').eq('patient_id', patient.id).order('created_at', { ascending: false })
    ])
    setClinic(c)
    setBranch(b)
    setConsents(cs || [])
    setLoading(false)
  }

  function resetForm() {
    setForm({ procedure_type:'', sessions:'', body_area:'' })
    setSelectedEffects([])
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
      adverse_effects: selectedEffects.join('\n'),
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

  async function handleDeleteConsent(c) {
    if (!window.confirm('¿Eliminar este consentimiento?')) return
    await supabase.from('informed_consents').delete().eq('id', c.id)
    setConsents(cs => cs.filter(x => x.id !== c.id))
  }

  function handlePrint(c) {
    const win = window.open('', '_blank')
    const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
    const pId = patient.id_number || ''
    const prefix = c.doctor?.prefix ? c.doctor.prefix + ' ' : ''
    const dName = c.doctor ? `${prefix}${c.doctor.first_name} ${c.doctor.last_name}` : ''
    const dCode = c.doctor?.medical_code ? `Cód. profesional: ${c.doctor.medical_code}` : ''
    const fecha = new Date(c.signed_at).toLocaleString('es-CR', { dateStyle:'full', timeStyle:'short' })
    win.document.write(`
      <html><head><title>Consentimiento Informado</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; font-size: 13px; color: #222; line-height: 1.7; }
        .header { text-align:center; margin-bottom:6px; }
        .header h1 { font-size:16px; margin:0 0 2px; }
        .header p { font-size:12px; margin:0; color:#444; }
        .title { text-align:center; font-size:15px; font-weight:bold; margin:20px 0 6px; letter-spacing:1px; text-transform:uppercase; border-top:2px solid #222; border-bottom:2px solid #222; padding:6px 0; }
        .section { margin:16px 0; }
        .section p { margin:6px 0; }
        .label { font-weight:bold; }
        .data-table { width:100%; border-collapse:collapse; margin:10px 0; }
        .data-table td { padding:5px 8px; border:1px solid #ccc; font-size:13px; }
        .data-table td:first-child { font-weight:bold; width:200px; background:#f9f9f9; }
        .sig-row { display:flex; justify-content:space-between; margin-top:50px; gap:40px; }
        .sig-box { flex:1; text-align:center; }
        .sig-box img { max-width:180px; max-height:80px; display:block; margin:0 auto 6px; }
        .sig-line { border-top:1px solid #333; padding-top:8px; font-size:12px; margin-top:4px; }
        .sig-box p { margin:2px 0; font-size:12px; }
        hr { border:none; border-top:1px solid #ccc; margin:14px 0; }
        .footer { margin-top:30px; font-size:11px; color:#666; text-align:center; }
      </style></head><body>
      <div class="header">
        <h1>${clinic?.legal_name || clinic?.name || ''}</h1>
        <p>Cédula Jurídica: ${clinic?.legal_id || ''}</p>
        <p>${branch?.address || clinic?.address || ''}</p>
      </div>
      <div class="title">Consentimiento Informado</div>
      <div class="section">
        <p>Yo, <strong>${pName}</strong>${pId ? `, portador(a) de la identificación número <strong>${pId}</strong>,` : ','} en pleno uso de mis facultades mentales y de forma libre y voluntaria, declaro haber recibido información clara, suficiente y comprensible sobre el procedimiento médico que se detalla a continuación, incluyendo su naturaleza, beneficios esperados, riesgos y posibles efectos adversos.</p>
        <p>El procedimiento será realizado por: <strong>${dName}</strong>${dCode ? ` — ${dCode}` : ''}.</p>
      </div>
      <div class="section">
        <p><span class="label">Detalles del procedimiento:</span></p>
        <table class="data-table">
          <tr><td>Procedimiento a realizar</td><td>${c.procedure_type}</td></tr>
          ${c.sessions ? `<tr><td>Cantidad de sesiones</td><td>${c.sessions}</td></tr>` : ''}
          ${c.body_area ? `<tr><td>Área de aplicación</td><td>${c.body_area}</td></tr>` : ''}
        </table>
      </div>
      ${c.adverse_effects ? `
      <div class="section">
        <p><span class="label">Efectos adversos informados al paciente:</span></p>
        <p style="margin-left:12px">${(c.adverse_effects || '').split('\n').filter(Boolean).join(', ')}</p>
      </div>` : ''}
      <div class="section">
        <p>Habiendo comprendido la información anterior, <strong>otorgo mi consentimiento</strong> para que se realice el procedimiento descrito, y declaro haber tenido la oportunidad de formular preguntas, las cuales fueron respondidas de manera satisfactoria.</p>
        <p>Entiendo que puedo revocar este consentimiento en cualquier momento antes de que se inicie el procedimiento.</p>
      </div>
      <hr/>
      <div class="section">
        <p>Firmado en: <strong>${c.branch_address || ''}</strong></p>
        <p>Fecha y hora: <strong>${fecha}</strong></p>
      </div>
      <div class="sig-row">
        <div class="sig-box">
          ${c.doctor_signature ? `<img src="${c.doctor_signature}" alt="Firma profesional"/>` : '<div style="height:80px"></div>'}
          <div class="sig-line">
            <p><strong>${dName}</strong></p>
            ${dCode ? `<p>${dCode}</p>` : ''}
            <p>Profesional tratante</p>
          </div>
        </div>
        <div class="sig-box">
          ${c.patient_signature ? `<img src="${c.patient_signature}" alt="Firma paciente"/>` : '<div style="height:80px"></div>'}
          <div class="sig-line">
            <p><strong>${pName}</strong></p>
            ${pId ? `<p>ID: ${pId}</p>` : ''}
            <p>Paciente</p>
          </div>
        </div>
      </div>
      <div class="footer">
        <p>Este documento forma parte del expediente clínico del paciente y tiene carácter legal.</p>
        <p>${clinic?.legal_name || clinic?.name || ''} — ${clinic?.legal_id || ''}</p>
      </div>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()

  const s = {
    wrap: { padding:'16px 0' },
    toolbar: { display:'flex', justifyContent:'flex-end', marginBottom:14 },
    btn: { background:'var(--clinic-primary, #1D9E75)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' },
    empty: { textAlign:'center', color:'#aaa', fontSize:14, padding:'40px 0' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', color:'#333', verticalAlign:'middle' },
    iconBtn: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    deleteBtn: { background:'none', border:'1px solid #fde0e0', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#d9534f' },
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
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:12, background: c.status === 'signed' ? '#E1F5EE' : '#f0f0f0', color: c.status === 'signed' ? 'var(--clinic-primary, #0F6E56)' : '#888' }}>
                    {c.status === 'signed' ? 'Firmado' : 'Pendiente'}
                  </span>
                </td>
                <td style={s.td}>
                  <button style={s.iconBtn} onClick={() => handlePrint(c)}>Imprimir</button>
                  <button style={s.deleteBtn} onClick={() => handleDeleteConsent(c)}>Eliminar</button>
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
            <div style={{ border:'0.5px solid #e0e0e0', borderRadius:8, padding:'12px 14px', marginBottom:14, background:'#fafafa' }}>
              {EFECTOS_ADVERSOS.map(group => (
                <div key={group.group} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, fontWeight:500, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{group.group}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 12px' }}>
                    {group.items.map(item => (
                      <label key={item} style={{ display:'flex', alignItems:'flex-start', gap:6, cursor:'pointer', fontSize:12, color:'#333', lineHeight:1.4 }}>
                        <input type="checkbox" checked={selectedEffects.includes(item)}
                          onChange={e => setSelectedEffects(prev => e.target.checked ? [...prev, item] : prev.filter(x => x !== item))}
                          style={{ marginTop:2, accentColor:'var(--clinic-primary, #1D9E75)', flexShrink:0 }} />
                        {item}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {selectedEffects.length > 0 && (
                <div style={{ marginTop:8, fontSize:11, color:'var(--clinic-primary, #1D9E75)' }}>{selectedEffects.length} efecto{selectedEffects.length > 1 ? 's' : ''} seleccionado{selectedEffects.length > 1 ? 's' : ''}</div>
              )}
            </div>

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
      <ContratoServicioTab patient={patient} profile={profile} clinic={clinic} />
    </div>
  )
}
