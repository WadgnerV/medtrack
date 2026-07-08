import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const BLUE = '#1a3a5c'
const G = 'var(--clinic-primary, #0F6E56)'

function parseField(text, prefix) {
  if (!text) return null
  const parts = text.split('\n\n')
  for (const part of parts) {
    if (part.startsWith(prefix)) return part.replace(prefix, '').trim()
  }
  return null
}

export default function LaboratoriosTab({ patient }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const patientId = patient.id

  useEffect(() => { load() }, [patientId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clinical_notes')
      .select('id, note_date, note_text, created_at, author:recorded_by(first_name, last_name, prefix)')
      .eq('patient_id', patientId)
      .order('note_date', { ascending: false })
    const parsed = (data || []).map(n => ({
      ...n,
      laboratorios: parseField(n.note_text, 'Estudios de laboratorio solicitados:\n')
    })).filter(n => n.laboratorios)
    setItems(parsed)
    setLoading(false)
  }

  function printLab(item) {
    const authorName = item.author ? `${item.author.prefix||''} ${item.author.first_name} ${item.author.last_name}`.trim() : 'Médico'
    const fecha = new Date(item.note_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:20mm;font-size:12pt;color:#222}
      h1{color:#1a3a5c;font-size:16pt;margin-bottom:4px}
      .sub{color:#888;font-size:10pt;margin-bottom:20px}
      .content{white-space:pre-wrap;line-height:1.8}
      .footer{margin-top:40px;border-top:1px solid #eee;padding-top:10px;font-size:10pt;color:#888}
    </style></head><body>
      <h1>Solicitud de Exámenes de Laboratorio</h1>
      <div class="sub">${authorName} · ${fecha}</div>
      <div class="content">${item.laboratorios}</div>
      <div class="footer">Documento generado por MedTrack</div>
    </body></html>`
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close()},500)
  }

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, color:BLUE, marginBottom:16 }}>Estudios de laboratorio</div>
      {loading ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay solicitudes de laboratorio registradas.</div>
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
                  <button onClick={() => printLab(item)}
                    style={{ border:'1px solid #1a3a5c', background:'#fff', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, color:BLUE, display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imprimir
                  </button>
                </div>
                <div style={{ fontSize:12, color:'#555', whiteSpace:'pre-wrap', lineHeight:1.7, background:'#f8fbf9', padding:'10px 14px', borderRadius:8 }}>
                  {item.laboratorios}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
