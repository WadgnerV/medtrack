import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

export default function PrintNotesModal({ notes, patient, profile, moduleType, antecedents, apnpData, agoData, clinicSettings, onClose }) {
  const [mode, setMode] = useState('all')
  const [selected, setSelected] = useState([])
  const [exporting, setExporting] = useState(false)
  const printRef = useRef(null)

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

  async function exportPDF() {
    setExporting(true)
    try {
      const el = printRef.current
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#fff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
      const margin = 15
      const pdfW = pdf.internal.pageSize.getWidth() - margin * 2
      const pdfH = pdf.internal.pageSize.getHeight() - margin * 2
      const canvasScale = 2
      const mmPerPx = pdfW / (canvas.width / canvasScale)
      const pageCanvasH = Math.floor((pdfH - margin) / mmPerPx) * canvasScale
      let srcY = 0
      while (srcY < canvas.height) {
        const sliceH = Math.min(pageCanvasH, canvas.height - srcY)
        const pageCanvas = document.createElement('canvas')
        pageCanvas.width = canvas.width
        pageCanvas.height = sliceH
        const ctx = pageCanvas.getContext('2d')
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
        const imgData = pageCanvas.toDataURL('image/png')
        if (srcY > 0) pdf.addPage()
        const renderedH = (sliceH / canvasScale) * mmPerPx
        pdf.addImage(imgData, 'PNG', margin, margin, pdfW, renderedH)
        srcY += pageCanvasH
      }
      const patName = `${patient?.profile?.last_name || ''}_${patient?.profile?.first_name || ''}`.replace(/\s/g, '_')
      pdf.save(`Notas_${MODULE_LABELS[moduleType]}_${patName}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch(e) { console.error(e) }
    setExporting(false)
  }

  const fieldStyle = { marginBottom: 8 }
  const labelStyle = { fontSize: 12, fontWeight: 700, color: '#1a3a5c', display: 'block', marginBottom: 2 }
  const valueStyle = { fontSize: 14, color: '#333', borderBottom: '1px solid #e2e8f0', paddingBottom: 4, minHeight: 20, display: 'block' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
      <div style={{ background:'#fff', borderRadius:14, width:900, maxWidth:'96vw', maxHeight:'90vh', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.18)' }}>

        {/* Header del modal */}
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c' }}>Imprimir notas clínicas — {MODULE_LABELS[moduleType]}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#999' }}>✕</button>
        </div>

        {/* Opciones de selección */}
        <div style={{ padding:'12px 24px', borderBottom:'1px solid #eee', display:'flex', gap:8, alignItems:'center', flexShrink:0, flexWrap:'wrap' }}>
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
          <button onClick={exportPDF} disabled={exporting || (mode==='select' && selected.length===0)}
            style={{ marginLeft:'auto', background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, padding:'7px 18px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:(exporting||(mode==='select'&&selected.length===0))?0.6:1 }}>
            {exporting ? 'Exportando...' : '⬇ Exportar PDF'}
          </button>
        </div>

        {/* Área de previsualización */}
        <div style={{ flex:1, overflowY:'auto', padding:24, background:'#f0f4f8' }}>
          <div ref={printRef} style={{ background:'#fff', padding:40, maxWidth:760, margin:'0 auto', fontFamily:'Calibri, "Calibri Light", Arial, sans-serif', fontSize:15, color:'#222', lineHeight:1.8 }}>

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

            {/* 1. FICHA DE IDENTIFICACIÓN */}
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

            {/* 2. ANTECEDENTES */}
            {(appItems.length > 0 || apnpData || (agoData && patient?.sex === 'female') || aqxItems.length > 0) && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                  Antecedentes
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

                  {/* APP */}
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

                  {/* APNP */}
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

                  {/* AGO */}
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

                  {/* AQx */}
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

            {/* 3. NOTAS CLÍNICAS */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:12, background:'#edf2f7', padding:'5px 10px', borderRadius:4 }}>
                Notas clínicas — {MODULE_LABELS[moduleType]}
              </div>
              {notesToPrint.length === 0 && <div style={{ fontSize:13, color:'#999', textAlign:'center', padding:16 }}>No hay notas seleccionadas</div>}
              {notesToPrint.map((note, idx) => (
                <div key={note.id} style={{ marginBottom:20, paddingBottom:16, borderBottom: idx < notesToPrint.length-1 ? '2px dashed #e2e8f0' : 'none' }}>
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
              ))}
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
              <div style={{ fontSize:11, color:'#666', textAlign:'right', flexShrink:0, marginLeft:16 }}>
                Pág. 1
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
