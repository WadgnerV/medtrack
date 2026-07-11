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

export default function ImagenesTab({ patient, profile }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const patientId = patient.id

  const [clinicSettings, setClinicSettings] = useState(null)
  useEffect(() => {
    load()
    supabase.from('clinic_settings').select('*').eq('clinic_id', profile?.active_clinic_id || profile?.active_clinic_id || profile?.clinic_id || '').limit(1).maybeSingle()
      .then(({ data }) => setClinicSettings(data))
  }, [patientId])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('clinical_notes')
      .select('id, note_date, note_text, created_at, author:recorded_by(first_name, last_name, prefix, medical_code)')
      .eq('patient_id', patientId)
      .order('note_date', { ascending: false })
    const parsed = (data || []).map(n => ({
      ...n,
      imagenes: parseField(n.note_text, 'Imágenes médicas solicitadas:\n')
    })).filter(n => n.imagenes)
    setItems(parsed)
    setLoading(false)
  }

    function printImg(item) {
    const authorName = item.author ? `${item.author.prefix||''} ${item.author.first_name} ${item.author.last_name}`.trim() : 'Médico'
    const authorCode = item.author?.medical_code ? ` — ${item.author.medical_code}` : ''
    const fecha = new Date(item.note_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
    const patientName = `${patient.profile?.last_name||''} ${patient.profile?.first_name||''}`.trim()
    const clinicName = clinicSettings?.clinic_name || 'MedTrack'
    const clinicAddress = [clinicSettings?.address, clinicSettings?.district, clinicSettings?.canton, clinicSettings?.province].filter(Boolean).join(', ')

    // Agrupar estudios por categoría
    const IMG_PREFIXES = {
      'Radiografías': ['Rx '],
      'Ultrasonido': ['US ', 'Eco ', 'Ecografía ', 'Ultrasonido '],
      'Tomografía': ['TC ', 'TAC ', 'Tomografía '],
      'Resonancia magnética': ['RM ', 'RMN ', 'Resonancia '],
      'Mamografía': ['Mamografía'],
      'Densitometría': ['Densitometría'],
      'Medicina nuclear': ['Gammagrafía', 'PET', 'SPECT'],
    }

    const lines = item.imagenes.split('\n').map(l => l.replace(/^•\s*/, '').trim()).filter(Boolean)
    const grouped = {}
    lines.forEach(line => {
      let found = false
      for (const [cat, prefixes] of Object.entries(IMG_PREFIXES)) {
        if (prefixes.some(p => line.startsWith(p))) {
          if (!grouped[cat]) grouped[cat] = []
          // Separar nombre del estudio e incidencias
          const dashIdx = line.indexOf(' — ')
          const nombre = dashIdx !== -1 ? line.substring(line.indexOf(' ') + 1, dashIdx) : line.substring(line.indexOf(' ') + 1)
          const incidencias = dashIdx !== -1 ? line.substring(dashIdx + 3) : ''
          grouped[cat].push({ nombre, incidencias })
          found = true; break
        }
      }
      if (!found) {
        if (!grouped['Otros']) grouped['Otros'] = []
        grouped['Otros'].push({ nombre: line, incidencias: '' })
      }
    })

    const categoriesHtml = Object.entries(grouped).map(([cat, items]) => `
      <div style="margin-bottom:16px;">
        <div style="font-size:10pt;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">${cat}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;">
          ${items.map(i => `<div style="font-size:10pt;padding:3px 0;border-bottom:0.5px solid #f0f0f0;">
            <span style="font-weight:500;">${i.nombre}</span>
            ${i.incidencias ? `<span style="color:#888;font-size:9pt;"> — ${i.incidencias}</span>` : ''}
          </div>`).join('')}
        </div>
      </div>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:20mm;font-size:11pt;color:#222;line-height:1.5}
      .header{border-bottom:2px solid #1a3a5c;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end}
      .clinic-name{font-size:18pt;font-weight:700;color:#1a3a5c}
      .clinic-addr{font-size:9pt;color:#888;margin-top:3px}
      .doc-title{font-size:14pt;font-weight:700;color:#1a3a5c;text-align:center;text-transform:uppercase;letter-spacing:0.05em;border-bottom:2px solid #1a3a5c;padding-bottom:8px;margin:0 0 16px}
      .patient-box{background:#f8f8f8;border:1px solid #e0e0e0;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .patient-label{color:#888;font-size:9pt}
      .patient-field{font-size:10pt}
      .sign{margin-top:50px;display:flex;justify-content:center}
      .sign-box{text-align:center}
      .sign-line{border-top:1px solid #333;width:220px;margin:0 auto 6px}
      .sign-name{font-size:11pt;font-weight:700;color:#1a3a5c}
      .sign-sub{font-size:9pt;color:#888}
      .footer{margin-top:30px;border-top:1px solid #eee;padding-top:8px;font-size:9pt;color:#aaa;text-align:center}
    </style></head><body>
      <div class="header">
        <div><div class="clinic-name">${clinicName}</div><div class="clinic-addr">${clinicAddress}</div></div>
        <div style="font-size:9pt;color:#888;text-align:right">Fecha: ${fecha}</div>
      </div>
      <div class="doc-title">Solicitud de Estudios de Imágenes Médicas</div>
      <div class="patient-box">
        <div><div class="patient-label">Paciente</div><div class="patient-field">${patientName}</div></div>
        <div><div class="patient-label">Identificación</div><div class="patient-field">${patient.id_number || '—'}</div></div>
        <div><div class="patient-label">Fecha de nacimiento</div><div class="patient-field">${patient.birth_date ? new Date(patient.birth_date + 'T12:00:00').toLocaleDateString('es-CR') : '—'}</div></div>
        <div><div class="patient-label">Médico solicitante</div><div class="patient-field">${authorName}${authorCode}</div></div>
      </div>
      ${categoriesHtml}
      <div class="sign"><div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-name">${authorName}${authorCode}</div>
        <div class="sign-sub">Médico solicitante · ${fecha}</div>
      </div></div>
      <div class="footer">${clinicName} · Documento generado automáticamente por MedTrack</div>
    </body></html>`
    const w = window.open('','_blank'); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>{w.print();w.close()},500)
  }


  return (
    <div>
      <div style={{ fontSize:14, fontWeight:700, color:BLUE, marginBottom:16 }}>Estudios de imágenes</div>
      {loading ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay solicitudes de imágenes registradas.</div>
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
                  <button onClick={() => printImg(item)}
                    style={{ border:'1px solid #1a3a5c', background:'#fff', borderRadius:8, padding:'4px 12px', cursor:'pointer', fontSize:12, color:BLUE, display:'flex', alignItems:'center', gap:4 }}>
                    <i className="ti ti-printer" style={{ fontSize:13 }} aria-hidden="true"></i> Imprimir
                  </button>
                </div>
                <div style={{ fontSize:12, color:'#555', whiteSpace:'pre-wrap', lineHeight:1.7, background:'#f8fbf9', padding:'10px 14px', borderRadius:8 }}>
                  {item.imagenes}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
