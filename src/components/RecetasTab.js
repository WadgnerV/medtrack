import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLUE = '#1a3a5c'

function parseField(text, prefix) {
  if (!text) return null
  const parts = text.split('\n\n')
  for (const part of parts) {
    if (part.startsWith(prefix)) return part.replace(prefix, '').trim()
  }
  return null
}

export default function RecetasTab({ patient, profile }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const patientId = patient.id

  useEffect(() => { load() }, [patientId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clinical_notes')
      .select('id, note_date, note_text, created_at, author:recorded_by(first_name, last_name, prefix)')
      .eq('patient_id', patientId)
      .eq('module_type', 'general')
      .order('note_date', { ascending: false })
    const parsed = (data || []).map(n => ({
      ...n,
      receta: parseField(n.note_text, 'Tratamiento:\n')
    })).filter(n => n.receta)
    setItems(parsed)
    setLoading(false)
  }

  async function printReceta(item) {
    const authorName = item.author ? `${item.author.prefix||''} ${item.author.first_name} ${item.author.last_name}`.trim() : 'Médico'
    const fecha = new Date(item.note_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
    const patientName = `${patient.profile?.first_name||''} ${patient.profile?.last_name||''}`.trim()

    let clinicName = 'MedTrack'
    let clinicAddress = ''
    const { data: cs } = await supabase.from('clinic_settings').select('clinic_name, province, canton, district, address').limit(1).single()
    if (cs) { clinicName = cs.clinic_name || clinicName; clinicAddress = [cs.address, cs.district, cs.canton, cs.province].filter(Boolean).join(', ') }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:20mm;font-size:12pt;color:#222}
      .header{border-bottom:2px solid #1a3a5c;padding-bottom:10px;margin-bottom:20px}
      .clinic{font-size:18pt;font-weight:bold;color:#1a3a5c}
      .address{font-size:10pt;color:#888}
      h1{color:#1a3a5c;font-size:14pt;margin:20px 0 8px}
      .patient{background:#f8f8f8;padding:10px;border-radius:6px;margin-bottom:20px;font-size:11pt}
      .content{white-space:pre-wrap;line-height:2;font-size:12pt}
      .sign{margin-top:60px;text-align:center}
      .sign-line{border-top:1px solid #333;width:200px;margin:0 auto 6px}
      .footer{margin-top:30px;border-top:1px solid #eee;padding-top:8px;font-size:9pt;color:#aaa;text-align:center}
    </style></head><body>
      <div class="header"><div class="clinic">${clinicName}</div><div class="address">${clinicAddress}</div></div>
      <h1>Receta Médica</h1>
      <div class="patient"><strong>Paciente:</strong> ${patientName} · <strong>Fecha:</strong> ${fecha}</div>
      <div class="content">${item.receta}</div>
      <div class="sign"><div class="sign-line"></div><div>${authorName}</div><div style="font-size:10pt;color:#888">Firma y sello</div></div>
      <div class="footer">Documento generado por MedTrack</div>
    </body></html>`
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close()},500)
  }

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, color:BLUE, marginBottom:16 }}>Recetas médicas</div>
      {loading ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay recetas registradas.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {items.map(item => {
            const authorName = item.author ? `${item.author.prefix||''} ${item.author.first_name} ${item.author.last_name}`.trim() : 'Médico'
            const fecha = new Date(item.note_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
            return (
              <div key={item.id} style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:BLUE }}>{fecha}</div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{authorName}</div>
                  </div>
                  <button onClick={() => printReceta(item)}
                    style={{ border:'1px solid #1a3a5c', background:'#fff', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, color:BLUE, display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imprimir receta
                  </button>
                </div>
                <div style={{ fontSize:12, color:'#555', whiteSpace:'pre-wrap', lineHeight:1.7, background:'#f8fbf9', padding:'10px 14px', borderRadius:8 }}>
                  {item.receta}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
