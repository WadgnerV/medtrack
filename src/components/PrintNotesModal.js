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

export default function PrintNotesModal({ notes, patient, profile, moduleType, antecedents, apnpData, agoData, clinicSettings, measurements, signosVitales, onClose }) {
  const [mode, setMode] = useState('all')
  const [selected, setSelected] = useState([])

  const appItems = antecedents?.filter(a => a.type === 'app') || []
  const aqxItems = antecedents?.filter(a => a.type === 'aqx') || []

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
            body { font-family: Arial, sans-serif; font-size: 13pt; color: #222; line-height: 1.8; margin: 20mm; }
            .note-block { page-break-inside: avoid; }
            * { box-sizing: border-box; }
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
              <div id="print-content" style={{ background:'#fff', padding:40, maxWidth:760, margin:'0 auto', fontFamily:'Arial, sans-serif', fontSize:14, color:'#222', lineHeight:1.8 }}>

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
                      ['Profesión', apnpData?.occupation || ''],
                      ['Religión', apnpData?.religion || ''],
                      ['Estado civil', apnpData?.civil_status || ''],
                    ].map(([label, value]) => (
                      <div key={label} style={fieldStyle}>
                        <span style={labelStyle}>{label}</span>
                        <span style={valueStyle}>{value || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ANTECEDENTES */}
                {(appItems.length > 0 || apnpData || (agoData && patient?.sex === 'female') || aqxItems.length > 0) && (
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                      Antecedentes
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                      {appItems.length > 0 && (
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6, borderBottom:'1px solid #e2e8f0', paddingBottom:3 }}>Antecedentes Patológicos Personales (APP)</div>
                          {appItems.map((item, i) => (
                            <div key={i} style={{ marginBottom:6, paddingBottom:6, borderBottom:'1px dashed #f0f0f0' }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>{item.condition === 'Otra (especificar)' || item.condition === 'Cáncer (especificar)' ? item.condition.split(' (')[0]+': '+(item.condition_other||'—') : item.condition}</div>
                              {item.diagnosis_year && <div style={{ fontSize:12, color:'#666' }}>Diagnóstico: {item.diagnosis_year}</div>}
                              <div style={{ fontSize:12, color:'#555' }}>Estado: {STATUS_LABELS[item.current_status]||item.current_status}</div>
                              {item.current_treatment && <div style={{ fontSize:12, color:'#555' }}>Tratamiento: {item.current_treatment}</div>}
                              {item.observations && <div style={{ fontSize:12, color:'#777' }}>Obs: {item.observations}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {apnpData && (
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6, borderBottom:'1px solid #e2e8f0', paddingBottom:3 }}>Antecedentes No Patológicos (APNP)</div>
                          <div style={{ fontSize:12, color:'#333' }}>
                            <div style={{ marginBottom:3 }}><strong>Tabaquismo:</strong> {apnpData.smoking_status === 'no' ? 'No fumador' : apnpData.smoking_status === 'ex' ? 'Ex-fumador' : 'Fumador activo'}{apnpData.smoking_cigs_per_day ? `, ${apnpData.smoking_cigs_per_day} cig/día` : ''}{apnpData.smoking_years ? `, ${apnpData.smoking_years} años` : ''}{apnpData.smoking_cigs_per_day && apnpData.smoking_years ? ` (PA: ${((parseFloat(apnpData.smoking_cigs_per_day)/20)*parseFloat(apnpData.smoking_years)).toFixed(1)})` : ''}</div>
                            <div style={{ marginBottom:3 }}><strong>Alcohol:</strong> {apnpData.alcohol_status === 'no' ? 'No consume' : apnpData.alcohol_status === 'occasional' ? 'Ocasional' : 'Habitual'}{apnpData.alcohol_detail ? ` — ${apnpData.alcohol_detail}` : ''}</div>
                            <div style={{ marginBottom:3 }}><strong>Drogas:</strong> {apnpData.drugs_status === 'no' ? 'No consume' : `Sí${apnpData.drugs_detail ? ` — ${apnpData.drugs_detail}` : ''}`}</div>
                            <div style={{ marginBottom:3 }}><strong>Ejercicio:</strong> {apnpData.exercise_status === 'no' ? 'Sedentario' : `Activo${apnpData.exercise_types?.length ? ` (${apnpData.exercise_types.join(', ')})` : ''}${apnpData.exercise_days_per_week ? `, ${apnpData.exercise_days_per_week}x/sem` : ''}${apnpData.exercise_minutes ? `, ${apnpData.exercise_minutes} min` : ''}`}</div>
                            <div style={{ marginBottom:3 }}><strong>Dieta:</strong> {apnpData.diet_type || '—'}{apnpData.diet_observations ? ` — ${apnpData.diet_observations}` : ''}</div>
                            {apnpData.allergies?.length > 0 && <div style={{ marginBottom:3 }}><strong>Alergias:</strong> {apnpData.allergies.map(a => `${a.type}${a.medication_name?' ('+a.medication_name+')':''}: ${a.reaction}`).join('; ')}</div>}
                            {apnpData.education && <div style={{ marginBottom:3 }}><strong>Educación:</strong> {apnpData.education}</div>}
                            {apnpData.observations && <div style={{ marginBottom:3 }}><strong>Observaciones:</strong> {apnpData.observations}</div>}
                          </div>
                        </div>
                      )}
                      {agoData && patient?.sex === 'female' && (
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6, borderBottom:'1px solid #e2e8f0', paddingBottom:3 }}>Antecedentes Gineco-Obstétricos (AGO)</div>
                          <div style={{ fontSize:12, color:'#333' }}>
                            {agoData.fum && <div style={{ marginBottom:3 }}><strong>FUM:</strong> {fmtDate(agoData.fum)}</div>}
                            {agoData.planning_method && <div style={{ marginBottom:3 }}><strong>Planificación:</strong> {agoData.planning_method}</div>}
                            {agoData.cycle_type && <div style={{ marginBottom:3 }}><strong>Ciclo:</strong> {agoData.cycle_type === 'regular' ? 'Regular' : 'Irregular'}</div>}
                            {agoData.bleeding_amount && <div style={{ marginBottom:3 }}><strong>Sangrado:</strong> {BLEEDING_LABELS[agoData.bleeding_amount]||agoData.bleeding_amount}</div>}
                            <div style={{ marginBottom:3 }}><strong>GPAC:</strong> G{agoData.gestas||0} P{agoData.partos||0} A{agoData.abortos||0} C{agoData.cesareas||0}</div>
                            {agoData.menopause === 'yes' && <div style={{ marginBottom:3 }}><strong>Menopausia:</strong> Sí, desde {agoData.menopause_year||'—'}. TRH: {agoData.hrt==='yes'?'Sí actualmente':agoData.hrt==='past'?'Anteriormente':'No'}{agoData.hrt_detail?` (${agoData.hrt_detail})`:''}</div>}
                            {agoData.last_pap && <div style={{ marginBottom:3 }}><strong>Último PAP:</strong> {fmtDate(agoData.last_pap)} — {PAP_LABELS[agoData.pap_result]||agoData.pap_result||'—'}</div>}
                          </div>
                        </div>
                      )}
                      {aqxItems.length > 0 && (
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#1a3a5c', marginBottom:6, borderBottom:'1px solid #e2e8f0', paddingBottom:3 }}>Antecedentes Quirúrgicos (AQx)</div>
                          {aqxItems.map((item, i) => (
                            <div key={i} style={{ marginBottom:6, paddingBottom:6, borderBottom:'1px dashed #f0f0f0' }}>
                              <div style={{ fontSize:13, fontWeight:700 }}>{item.condition}</div>
                              {item.diagnosis_year && <div style={{ fontSize:12, color:'#666' }}>Año: {item.diagnosis_year}</div>}
                              {item.observations && <div style={{ fontSize:12, color:'#555' }}>{item.observations}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* NOTAS CLÍNICAS */}
                <div style={{ marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                    Notas clínicas — {MODULE_LABELS[moduleType]}
                  </div>
                  {notesToPrint.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:16 }}>No hay notas seleccionadas</div>}
                  {notesToPrint.map((note, idx) => {
                    const noteDate = note.note_date
                    const signo = (signosVitales || []).find(s => s.note_date === noteDate)
                    const meas = (measurements || []).find(m => m.measured_at?.startsWith(noteDate))
                    return (
                    <div className="note-block" key={note.id} style={{ marginBottom:20, paddingBottom:16, borderBottom: idx < notesToPrint.length-1 ? '2px dashed #e2e8f0' : 'none' }}>

                      {/* SIGNOS VITALES (módulo integral) */}
                      {signo && moduleType === 'integral' && (
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
                          <div key={si} style={{ marginBottom:8 }}>
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

                {/* FIRMA */}
                <div style={{ marginTop:32, marginBottom:24, textAlign:'center' }}>
                  <div style={{ borderTop:'1px solid #1a3a5c', width:220, margin:'0 auto', marginBottom:8 }}></div>
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
