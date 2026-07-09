import { useState } from 'react'

const MODULE_LABELS = {
  integral: 'Atención Integral',
  metabolica: 'Atención Metabólica',
  estetica: 'Atención Estética',
  fisioterapia: 'Fisioterapia',
  enfermeria: 'Enfermería',
}

const STATUS_LABELS = { active:'Activo', remission:'En remisión', resolved:'Resuelto' }
const BLEEDING_LABELS = { light:'Ligero', moderate:'Moderado', heavy:'Abundante' }
const PAP_LABELS = { normal:'Normal', abnormal:'Anormal', pending:'Pendiente', never:'Nunca realizado' }

export default function PrintNotesModal({ notes, patient, profile, moduleType, antecedents, apnpData, agoData, clinicSettings, measurements, signosVitales, diagnoses, onClose }) {
  const [mode, setMode] = useState('all')
  const [selected, setSelected] = useState([])
  const [incluirAntecedentes, setIncluirAntecedentes] = useState(true)

  // Nueva estructura patient_antecedentes — apnpData es el registro completo
  const antData = apnpData || {}
  const appItems = antData.app_patologias || []
  const aqxItems = antData.aqx_procedimientos || []
  const ahfItems = antData.ahf_familiares || []
  const alergiasMed = antData.apnp_alergia_medicamentos || []
  const alergiasAli = antData.apnp_alergia_alimentos || []

  const notesToPrint = mode === 'all' ? notes
    : mode === 'last' ? notes.slice(0, 1)
    : notes.filter(n => selected.includes(n.id))

  const age = dob => {
    if (!dob) return null
    const d = new Date(dob), n = new Date()
    return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
  }

  const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  const clinicAddress = clinicSettings ? [clinicSettings.address, clinicSettings.district, clinicSettings.canton, clinicSettings.province].filter(Boolean).join(', ') : ''

  function doPrint() {
    const printContent = document.getElementById('print-content').innerHTML
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Notas clínicas</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; color: #222; line-height: 1.6; margin: 15mm; }
            * { box-sizing: border-box; }
            @media print {
              body { margin: 10mm 15mm; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print(); printWindow.close() }, 500)
  }

  const fieldStyle = { marginBottom: 8 }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#1a3a5c', display: 'block', marginBottom: 2 }
  const valueStyle = { fontSize: 14, color: '#333', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, minHeight: 20, display: 'block' }

  return (
    <>
      {/* CSS de impresión */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-modal-root { display: block !important; }
          #print-modal-overlay { display: none !important; }
          #print-modal-controls { display: none !important; }
          #print-content {
            display: block !important;
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            padding: 20mm;
            box-sizing: border-box;
            font-family: Arial, sans-serif;
            font-size: 13pt;
            color: #222;
            line-height: 1.8;
          }
          #print-content * {
            page-break-inside: avoid;
          }
          .note-block {
            page-break-inside: avoid;
          }
        }
        @media screen {
          #print-content { display: block; }
        }
      `}</style>

      {/* Overlay del modal (solo en pantalla) */}
      <div id="print-modal-root" style={{ position:'fixed', inset:0, zIndex:100 }}>
        <div id="print-modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:14, width:900, maxWidth:'96vw', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>

            {/* Header */}
            <div id="print-modal-controls" style={{ padding:'16px 24px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c' }}>Imprimir notas clínicas — {MODULE_LABELS[moduleType]}</div>
              <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#999' }}>✕</button>
            </div>

            {/* Controles */}
            <div id="print-modal-controls" style={{ padding:'12px 24px', borderBottom:'1px solid #eee', display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color:'#555', marginRight:4 }}>Seleccionar:</span>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginLeft:'auto' }}>
                <span style={{ fontSize:12, color:'#555' }}>Incluir antecedentes</span>
                <div onClick={() => setIncluirAntecedentes(p => !p)}
                  style={{ width:36, height:20, borderRadius:10, background:incluirAntecedentes?'#1a3a5c':'#ddd', position:'relative', cursor:'pointer', transition:'background 0.2s' }}>
                  <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:2, left:incluirAntecedentes?18:2, transition:'left 0.2s' }} />
                </div>
              </div>
              {[['all','Todo el historial'],['last','Última nota'],['select','Selección manual']].map(([v,l]) => (
                <button key={v} onClick={() => { setMode(v); setSelected([]) }}
                  style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${mode===v?'#1a3a5c':'#e2e8f0'}`, background:mode===v?'#1a3a5c':'#f7fafc', color:mode===v?'#fff':'#555', fontSize:12, cursor:'pointer', fontWeight:mode===v?600:400 }}>
                  {l}
                </button>
              ))}
              {mode === 'select' && (
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginLeft:8 }}>
                  {notes.map(n => (
                    <button key={n.id} onClick={() => setSelected(prev => prev.includes(n.id) ? prev.filter(x=>x!==n.id) : [...prev,n.id])}
                      style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${selected.includes(n.id)?'#1a3a5c':'#e2e8f0'}`, background:selected.includes(n.id)?'#1a3a5c':'#f7fafc', color:selected.includes(n.id)?'#fff':'#555', fontSize:11, cursor:'pointer' }}>
                      {new Date(n.note_date+'T12:00:00').toLocaleDateString('es-CR',{day:'2-digit',month:'short',year:'numeric'})}
                    </button>
                  ))}
                </div>
              )}
              <button onClick={doPrint} disabled={mode==='select' && selected.length===0}
                style={{ marginLeft:'auto', background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, padding:'7px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:(mode==='select'&&selected.length===0)?0.6:1 }}>
                🖨️ Imprimir / Guardar PDF
              </button>
            </div>

            {/* Previsualización */}
            <div style={{ flex:1, overflowY:'auto', padding:24, background:'#f0f4f8' }}>
              <div id="print-content" style={{ background:'#fff', padding:40, maxWidth:760, margin:'0 auto', fontFamily:'Arial, sans-serif', fontSize:12, color:'#222', lineHeight:1.6 }}>

                {/* ENCABEZADO */}
                <div style={{ borderBottom:'2px solid #1a3a5c', paddingBottom:14, marginBottom:20 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:22, fontWeight:700, color:'#1a3a5c', letterSpacing:'0.08em', marginBottom:4 }}>MEDTRACK</div>
                      {clinicSettings?.clinic_name && <div style={{ fontSize:20, fontWeight:700, color:'#1a3a5c', letterSpacing:'0.04em' }}>{clinicSettings.clinic_name}</div>}
                      {clinicAddress && <div style={{ fontSize:12, color:'#666' }}>📍 {clinicAddress}</div>}
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:12, color:'#666' }}>Fecha de exportación</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#333' }}>{new Date().toLocaleDateString('es-CR',{day:'2-digit',month:'long',year:'numeric'})}</div>
                      <div style={{ fontSize:12, color:'#666', marginTop:4 }}>Módulo</div>
                      <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c' }}>{MODULE_LABELS[moduleType]}</div>
                    </div>
                  </div>
                </div>

                {/* FICHA DE IDENTIFICACIÓN */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                    Ficha de identificación del paciente
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 24px' }}>
                    {[
                      ['Nombre completo', `${patient?.profile?.last_name||''} ${patient?.profile?.first_name||''}`.trim()],
                      ['Número de identificación', patient?.id_number || ''],
                      ['Fecha de nacimiento', patient?.birth_date ? fmtDate(patient.birth_date) : ''],
                      ['Edad', patient?.birth_date ? (age(patient.birth_date) + ' años') : ''],
                      ['Lugar de residencia', [patient?.province, patient?.canton].filter(Boolean).join(', ')],
                      ['Religión', antData.apnp_religion || ''],
                      ['Estado civil', antData.apnp_estado_civil || ''],
                      ['Educación', antData.apnp_educacion || ''],
                    ].map(([label, value]) => (
                      <div key={label} style={fieldStyle}>
                        <span style={labelStyle}>{label}</span>
                        <span style={valueStyle}>{value || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {incluirAntecedentes && (appItems.length > 0 || apnpData || (agoData && patient?.sex === 'female') || aqxItems.length > 0) && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                      Antecedentes
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      {appItems.length > 0 && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:4, borderBottom:'1px solid #e2e8f0', paddingBottom:2 }}>Antecedentes Patológicos Personales (APP)</div>
                          {appItems.map((item, i) => (
                            <div key={i} style={{ marginBottom:6, paddingBottom:6, borderBottom:'1px dashed #f0f0f0' }}>
                              <div style={{ fontSize:11, fontWeight:700 }}>{item.patologia === 'Otra' ? item.otra || 'Otra' : item.patologia}</div>
                              {item.año && <div style={{ fontSize:10, color:'#666' }}>Diagnóstico: {item.año}</div>}
                              {item.tratamiento && <div style={{ fontSize:10, color:'#555' }}>Tratamiento: {item.tratamiento}</div>}
                              {item.observaciones && <div style={{ fontSize:12, color:'#777' }}>Obs: {item.observaciones}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {Object.keys(antData).length > 0 && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:4, borderBottom:'1px solid #e2e8f0', paddingBottom:2 }}>Antecedentes No Patológicos (APnP)</div>
                          <div style={{ fontSize:12, color:'#333' }}>
                            {antData.apnp_educacion && <div style={{ marginBottom:3 }}><strong>Educación:</strong> {antData.apnp_educacion}</div>}
                            {antData.apnp_estado_civil && <div style={{ marginBottom:3 }}><strong>Estado civil:</strong> {antData.apnp_estado_civil}</div>}
                            {antData.apnp_religion && <div style={{ marginBottom:3 }}><strong>Religión:</strong> {antData.apnp_religion}</div>}
                            <div style={{ marginBottom:3 }}><strong>Fumado:</strong> {antData.apnp_fumado === 'negativo' ? 'No fumador' : antData.apnp_fumado === 'activo' ? `Activo${antData.apnp_fumado_paquetes_dia ? ` — ${antData.apnp_fumado_paquetes_dia} paq/día` : ''}${antData.apnp_fumado_años ? `, ${antData.apnp_fumado_años} años` : ''}` : `Suspendido${antData.apnp_fumado_año_suspension ? ` (${antData.apnp_fumado_año_suspension})` : ''}`}</div>
                            <div style={{ marginBottom:3 }}><strong>Alcohol:</strong> {antData.apnp_alcohol === 'negativo' ? 'No consume' : `${antData.apnp_alcohol}${antData.apnp_alcohol_bebida ? ` — ${antData.apnp_alcohol_bebida}` : ''}`}</div>
                            <div style={{ marginBottom:3 }}><strong>Drogas:</strong> {antData.apnp_drogas === 'negativo' ? 'No consume' : `${antData.apnp_drogas}${antData.apnp_drogas_tipos?.length ? ` — ${antData.apnp_drogas_tipos.join(', ')}` : ''}`}</div>
                            <div style={{ marginBottom:3 }}><strong>Actividad física:</strong> {antData.apnp_actividad_fisica === 'sedentario' ? 'Sedentario' : `${antData.apnp_actividad_fisica}${antData.apnp_ejercicio_tipos?.length ? ` — ${antData.apnp_ejercicio_tipos.join(', ')}` : ''}${antData.apnp_ejercicio_veces_semana ? `, ${antData.apnp_ejercicio_veces_semana}x/sem` : ''}`}</div>
                            {alergiasMed.length > 0 && <div style={{ marginBottom:3 }}><strong>Alergias medicamentos:</strong> {alergiasMed.map(a => `${a.medicamento} (${a.tipo})`).join('; ')}</div>}
                            {alergiasAli.length > 0 && <div style={{ marginBottom:3 }}><strong>Alergias alimentos:</strong> {alergiasAli.map(a => `${a.alimento} (${a.tipo})`).join('; ')}</div>}
                          </div>
                        </div>
                      )}
                      {antData.ago_fum !== undefined && patient?.sex === 'female' && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:4, borderBottom:'1px solid #e2e8f0', paddingBottom:2 }}>Antecedentes Gineco-Obstétricos (AGO)</div>
                          <div style={{ fontSize:12, color:'#333' }}>
                            {antData.ago_fum && <div style={{ marginBottom:3 }}><strong>FUM:</strong> {antData.ago_fum}</div>}
                            {antData.ago_mpf && <div style={{ marginBottom:3 }}><strong>MPF:</strong> {antData.ago_mpf}</div>}
                            {antData.ago_frecuencia_menstrual && <div style={{ marginBottom:3 }}><strong>Ciclo:</strong> {antData.ago_frecuencia_menstrual}</div>}
                            {antData.ago_embarazos === 'sí' && <div style={{ marginBottom:3 }}><strong>GPAC:</strong> G{antData.ago_gestas||0} P{antData.ago_partos||0} A{antData.ago_abortos||0} C{antData.ago_cesareas||0}</div>}
                            {antData.ago_menopausia === 'sí' && <div style={{ marginBottom:3 }}><strong>Menopausia:</strong> Sí{antData.ago_menopausia_año ? ` desde ${antData.ago_menopausia_año}` : ''}</div>}
                            {antData.ago_pap_fecha && <div style={{ marginBottom:3 }}><strong>Último PAP:</strong> {antData.ago_pap_fecha} — {antData.ago_pap_resultado || '—'}</div>}
                          </div>
                        </div>
                      )}
                      {aqxItems.length > 0 && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:4, borderBottom:'1px solid #e2e8f0', paddingBottom:2 }}>Antecedentes Quirúrgicos (AQx)</div>
                          {aqxItems.map((item, i) => (
                            <div key={i} style={{ marginBottom:6, paddingBottom:6, borderBottom:'1px dashed #f0f0f0' }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>{item.procedimiento}</div>
                              {item.año && <div style={{ fontSize:12, color:'#666' }}>Año: {item.año}</div>}
                              {item.complicaciones && <div style={{ fontSize:12, color:'#555' }}>Complicaciones: {item.complicaciones}</div>}
                              {item.observaciones && <div style={{ fontSize:12, color:'#555' }}>{item.observaciones}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {ahfItems.length > 0 && (
                        <div style={{ marginBottom:6 }}>
                          <div style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', marginBottom:4, borderBottom:'1px solid #e2e8f0', paddingBottom:2 }}>Antecedentes Heredo-Familiares (AHF)</div>
                          {ahfItems.map((item, i) => (
                            <div key={i} style={{ marginBottom:4 }}>
                              <span style={{ fontSize:12, fontWeight:600 }}>{item.patologia === 'Otra' ? item.otra : item.patologia}</span>
                              {item.parentesco && <span style={{ fontSize:12, color:'#666' }}> — {item.parentesco}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* NOTAS CLÍNICAS */}
                <div style={{ marginBottom:20 }}>
                  {notesToPrint.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:16 }}>No hay notas seleccionadas</div>}
                  {notesToPrint.map((note, idx) => {
                    const isFirst = idx === 0
                    const noteDate = note.note_date
                    const signo = (signosVitales || []).find(s => s.recorded_at?.startsWith(noteDate) || s.note_date === noteDate)
                    const meas = (measurements || []).find(m => m.measured_at?.startsWith(noteDate))
                    return (
                    <div className="note-block" key={note.id} style={{ marginBottom:20, paddingBottom:16, borderBottom: idx < notesToPrint.length-1 ? '2px dashed #e2e8f0' : 'none' }}>
                      {idx === 0 && <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>Notas clínicas</div>}

                      {/* SIGNOS VITALES (módulo integral) */}
                      {signo && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6 }}>Signos clínicos — {fmtDate(noteDate)}</div>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                            <thead>
                              <tr style={{ background:'#edf2f7' }}>
                                {['PAS', 'PAD', 'PAM', 'FC', 'SpO2', 'Glucosa', 'Peso'].map(h => (
                                  <th key={h} style={{ padding:'4px 8px', textAlign:'center', color:'#1a3a5c', fontWeight:700, border:'1px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {[
                                  signo.pas ? `${signo.pas}${signo.pad ? `/${signo.pad}` : ''} mmHg` : '—',
                                  signo.pad || '—',
                                  signo.pam || '—',
                                  signo.heart_rate ? `${signo.heart_rate} lpm` : '—',
                                  signo.spo2 ? `${signo.spo2}%` : '—',
                                  signo.glucose ? `${signo.glucose} mg/dL` : '—',
                                  signo.weight_kg ? `${signo.weight_kg} kg` : '—',
                                ].map((v, i) => (
                                  <td key={i} style={{ padding:'4px 8px', textAlign:'center', border:'1px solid #e2e8f0', color:'#333' }}>{v}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* COMPOSICIÓN CORPORAL (módulo metabólico) */}
                      {meas && moduleType === 'metabolica' && (
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6 }}>Composición corporal — {fmtDate(noteDate)}</div>
                          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                            <thead>
                              <tr style={{ background:'#edf2f7' }}>
                                {['Peso', 'Grasa corporal', 'Masa muscular', 'Grasa visceral'].map(h => (
                                  <th key={h} style={{ padding:'4px 8px', textAlign:'center', color:'#1a3a5c', fontWeight:700, border:'1px solid #e2e8f0' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {[
                                  meas.weight_kg ? `${meas.weight_kg} kg` : '—',
                                  meas.body_fat_pct ? `${meas.body_fat_pct}%` : '—',
                                  meas.muscle_mass_kg ? `${meas.muscle_mass_kg} kg` : '—',
                                  meas.visceral_fat_pts ? `${meas.visceral_fat_pts} pts` : '—',
                                ].map((v, i) => (
                                  <td key={i} style={{ padding:'4px 8px', textAlign:'center', border:'1px solid #e2e8f0', color:'#333' }}>{v}</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div style={{ marginBottom:10 }}>
                        <div style={{ fontSize:13, color:'#555', marginBottom:2 }}>{fmtDate(note.note_date)}</div>
                        <div style={{ fontSize:14, fontWeight:700, color:'#1a3a5c' }}>
                          {note.author?.prefix ? note.author.prefix + ' ' : ''}{note.author?.first_name} {note.author?.last_name}
                        </div>
                      </div>
                      {note.note_text && note.note_text.split('\n\n').map((section, si) => {
                        const lines = section.split('\n')
                        const isLabel = lines[0]?.endsWith(':')
                        return (
                          <div key={si} style={{ marginBottom:6 }}>
                            {lines.map((line, li) => (
                              <div key={li} style={{ fontSize:13, color: li===0 && isLabel ? '#1a3a5c' : '#333', fontWeight: li===0 && isLabel ? 700 : 400 }}>
                                {line}
                              </div>
                            ))}
                          </div>
                        )
                      })}

                    </div>
                  )})}
                </div>

                {/* DIAGNÓSTICOS ACTIVOS */}
                {diagnoses && diagnoses.length > 0 && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                      Diagnósticos activos
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {diagnoses.map((d, i) => (
                        <div key={i} style={{ background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 10px' }}>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c' }}>{d.cie10_code} — {d.cie10_description}</div>
                          {d.diagnosis_date && <div style={{ fontSize:11, color:'#666', marginTop:2 }}>Fecha: {fmtDate(d.diagnosis_date)}</div>}
                          {d.notes && <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{d.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* FIRMA */}
                <div style={{ marginTop:32, marginBottom:24, textAlign:'center' }}>
                  <div style={{ borderTop:'1px solid #1a3a5c', width:220, margin:'0 auto', marginBottom:6 }}></div>
                  <div style={{ fontSize:13, color:'#333', fontWeight:700 }}>Firma y sello de médico que autoriza</div>
                </div>

                {/* PIE DE PÁGINA */}
                <div style={{ borderTop:'1px solid #e2e8f0', paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, maxWidth:'80%' }}>
                    <p style={{ fontSize:10, color:'#aaa', margin:0, lineHeight:1.6, fontStyle:'italic' }}>
                      La información contenida en este documento es de carácter estrictamente confidencial y de uso exclusivo del equipo médico y administrativo autorizado. Queda prohibida su reproducción, distribución o divulgación a personas no autorizadas. Generado por MedTrack.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
