import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#8e44ad'

// Vista cara — coordenadas sobre viewBox 200x280 (solo cabeza+cuello)
const BODY_ZONES_FACE = [
  { id:'cabeza_front', label:'Cabeza', cx:100, cy:18 },
  { id:'frente', label:'Frente', cx:100, cy:38 },
  { id:'ojeras', label:'Ojeras', cx:100, cy:72 },
  { id:'nariz', label:'Nariz', cx:100, cy:95 },
  { id:'pomulos', label:'Pómulos izq.', cx:68, cy:80 },
  { id:'pomulos_der', label:'Pómulos der.', cx:132, cy:80 },
  { id:'labios', label:'Labios', cx:100, cy:118 },
  { id:'menton', label:'Mentón', cx:100, cy:138 },
  { id:'cuello_ant', label:'Cuello', cx:100, cy:200 },
]

// Vista frontal — sin puntos faciales
const BODY_ZONES_FRONT = [
  { id:'axila_der', label:'Axila der.', cx:70, cy:102 },
  { id:'axila_izq', label:'Axila izq.', cx:130, cy:102 },
  { id:'pecho', label:'Pecho/Mamas', cx:100, cy:118 },
  { id:'abdomen', label:'Abdomen', cx:100, cy:155 },
  { id:'brazo_ant_der', label:'Brazo ant. der.', cx:55, cy:130 },
  { id:'brazo_ant_izq', label:'Brazo ant. izq.', cx:145, cy:130 },
  { id:'mano_ant_der', label:'Mano ant. der.', cx:57, cy:180 },
  { id:'mano_ant_izq', label:'Mano ant. izq.', cx:143, cy:180 },
  { id:'zona_genital', label:'Zona genital', cx:100, cy:210 },
  { id:'muslo_ant_der', label:'Muslo ant. der.', cx:82, cy:270 },
  { id:'muslo_ant_izq', label:'Muslo ant. izq.', cx:118, cy:270 },
  { id:'rodilla_der', label:'Rodilla der.', cx:82, cy:338 },
  { id:'rodilla_izq', label:'Rodilla izq.', cx:118, cy:338 },
  { id:'pantorrilla_ant_der', label:'Pantorrilla ant. der.', cx:82, cy:375 },
  { id:'pantorrilla_ant_izq', label:'Pantorrilla ant. izq.', cx:118, cy:375 },
  { id:'tobillo_der', label:'Tobillo der.', cx:82, cy:408 },
  { id:'tobillo_izq', label:'Tobillo izq.', cx:118, cy:408 },
  { id:'pie_der', label:'Pie der.', cx:82, cy:422 },
  { id:'pie_izq', label:'Pie izq.', cx:118, cy:422 },
]

const BODY_ZONES_BACK = [
  { id:'cabeza_back', label:'Cabeza/Nuca', cx:100, cy:16 },
  { id:'cuello_post', label:'Cuello post.', cx:100, cy:74 },
  { id:'espalda_alta', label:'Espalda alta', cx:100, cy:110 },
  { id:'espalda_media', label:'Espalda media', cx:100, cy:145 },
  { id:'lumbar', label:'Zona lumbar', cx:100, cy:175 },
  { id:'gluteos', label:'Glúteos', cx:100, cy:220 },
  { id:'brazo_post_der', label:'Brazo post. der.', cx:55, cy:130 },
  { id:'brazo_post_izq', label:'Brazo post. izq.', cx:145, cy:130 },
  { id:'mano_post_der', label:'Mano post. der.', cx:57, cy:180 },
  { id:'mano_post_izq', label:'Mano post. izq.', cx:143, cy:180 },
  { id:'muslo_post_der', label:'Muslo post. der.', cx:82, cy:270 },
  { id:'muslo_post_izq', label:'Muslo post. izq.', cx:118, cy:270 },
  { id:'pantorrilla_post_der', label:'Pantorrilla post. der.', cx:82, cy:375 },
  { id:'pantorrilla_post_izq', label:'Pantorrilla post. izq.', cx:118, cy:375 },
  { id:'tobillo_post_der', label:'Tobillo post. der.', cx:82, cy:408 },
  { id:'tobillo_post_izq', label:'Tobillo post. izq.', cx:118, cy:408 },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

function BodyDiagram({ view, zones, procedures, selectedZone, onSelect }) {
  const [hovered, setHovered] = useState(null)
  const zonesWithProc = new Set(procedures.map(p => p.body_zone))
  const VW = 200
  const VH = 500

  // Silueta frontal — outline minimalista estilo médico
  const FrontSilhouette = () => (
    <g stroke="#b0a0b8" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round">
      {/* Cabeza */}
      <ellipse cx="100" cy="38" rx="24" ry="28" />
      {/* Cuello */}
      <path d="M88 64 L86 78 M112 64 L114 78" />
      {/* Clavícula */}
      <path d="M86 78 Q100 74 114 78" />
      {/* Hombro izq → brazo */}
      <path d="M86 78 Q72 82 66 95 Q58 115 56 140 Q55 158 58 172" />
      {/* Hombro der → brazo */}
      <path d="M114 78 Q128 82 134 95 Q142 115 144 140 Q145 158 142 172" />
      {/* Mano izq */}
      <ellipse cx="57" cy="180" rx="9" ry="12" />
      {/* Mano der */}
      <ellipse cx="143" cy="180" rx="9" ry="12" />
      {/* Torso izq */}
      <path d="M86 78 Q80 100 79 130 Q78 155 80 175 Q83 188 86 195" />
      {/* Torso der */}
      <path d="M114 78 Q120 100 121 130 Q122 155 120 175 Q117 188 114 195" />
      {/* Cintura */}
      <path d="M86 195 Q100 199 114 195" />
      {/* Cadera izq */}
      <path d="M86 195 Q78 210 76 225 Q74 238 80 248" />
      {/* Cadera der */}
      <path d="M114 195 Q122 210 124 225 Q126 238 120 248" />
      {/* Entrepierna */}
      <path d="M80 248 Q90 255 100 257 Q110 255 120 248" />
      {/* Muslo izq exterior */}
      <path d="M80 248 Q72 275 74 305 Q76 322 80 334" />
      {/* Muslo izq interior */}
      <path d="M100 257 Q94 280 94 308 Q94 324 97 334" />
      {/* Muslo der interior */}
      <path d="M100 257 Q106 280 106 308 Q106 324 103 334" />
      {/* Muslo der exterior */}
      <path d="M120 248 Q128 275 126 305 Q124 322 120 334" />
      {/* Rodilla izq */}
      <path d="M80 334 Q85 340 97 340 Q103 338 103 334" />
      {/* Rodilla der */}
      <path d="M103 334 Q108 340 120 340 Q124 338 120 334" />
      {/* Pierna izq exterior */}
      <path d="M80 338 Q76 365 78 390 Q80 408 84 414" />
      {/* Pierna izq interior */}
      <path d="M97 338 Q94 365 94 390 Q94 408 96 414" />
      {/* Pierna der interior */}
      <path d="M103 338 Q106 365 106 390 Q106 408 104 414" />
      {/* Pierna der exterior */}
      <path d="M120 338 Q124 365 122 390 Q120 408 116 414" />
      {/* Pie izq */}
      <path d="M78 412 Q80 422 88 426 Q96 428 97 424" />
      {/* Pie der */}
      <path d="M122 412 Q120 422 112 426 Q104 428 103 424" />
    </g>
  )

  // Silueta cara (zoom cabeza+cuello, viewBox 200x280)
  const FaceSilhouette = () => (
    <g stroke="#b0a0b8" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round">
      {/* Cabeza */}
      <ellipse cx="100" cy="80" rx="52" ry="62" />
      {/* Orejas */}
      <path d="M48 70 Q38 80 40 95 Q42 108 50 112" />
      <path d="M152 70 Q162 80 160 95 Q158 108 150 112" />
      {/* Cuello */}
      <path d="M72 138 Q68 160 70 185 Q72 200 76 210" />
      <path d="M128 138 Q132 160 130 185 Q128 200 124 210" />
      {/* Hombros */}
      <path d="M76 210 Q88 220 100 222 Q112 220 124 210" />
      {/* Ceja izq */}
      <path d="M68 68 Q82 62 92 66" strokeWidth="2" />
      {/* Ceja der */}
      <path d="M108 66 Q118 62 132 68" strokeWidth="2" />
      {/* Ojos */}
      <ellipse cx="82" cy="76" rx="10" ry="7" />
      <ellipse cx="118" cy="76" rx="10" ry="7" />
      {/* Nariz */}
      <path d="M96 88 Q92 108 94 115 Q100 120 106 115 Q108 108 104 88" />
      {/* Boca */}
      <path d="M82 128 Q100 138 118 128" />
      {/* Mentón */}
      <path d="M78 138 Q100 152 122 138" strokeDasharray="2 2" strokeWidth="1" />
    </g>
  )

  // Silueta posterior
  const BackSilhouette = () => (
    <g stroke="#b0a0b8" strokeWidth="1.8" fill="none" strokeLinejoin="round" strokeLinecap="round">
      {/* Cabeza */}
      <ellipse cx="100" cy="38" rx="24" ry="28" />
      {/* Cuello */}
      <path d="M88 64 L86 78 M112 64 L114 78" />
      {/* Hombro izq → brazo */}
      <path d="M86 78 Q72 82 66 95 Q58 115 56 140 Q55 158 58 172" />
      {/* Hombro der → brazo */}
      <path d="M114 78 Q128 82 134 95 Q142 115 144 140 Q145 158 142 172" />
      {/* Mano izq */}
      <ellipse cx="57" cy="180" rx="9" ry="12" />
      {/* Mano der */}
      <ellipse cx="143" cy="180" rx="9" ry="12" />
      {/* Torso izq */}
      <path d="M86 78 Q80 100 79 130 Q78 155 80 175 Q83 188 86 195" />
      {/* Torso der */}
      <path d="M114 78 Q120 100 121 130 Q122 155 120 175 Q117 188 114 195" />
      {/* Cintura */}
      <path d="M86 195 Q100 199 114 195" />
      {/* Cadera */}
      <path d="M86 195 Q78 210 76 225 Q74 238 80 248" />
      <path d="M114 195 Q122 210 124 225 Q126 238 120 248" />
      <path d="M80 248 Q90 255 100 257 Q110 255 120 248" />
      {/* Muslos */}
      <path d="M80 248 Q72 275 74 305 Q76 322 80 334" />
      <path d="M100 257 Q94 280 94 308 Q94 324 97 334" />
      <path d="M100 257 Q106 280 106 308 Q106 324 103 334" />
      <path d="M120 248 Q128 275 126 305 Q124 322 120 334" />
      {/* Rodillas */}
      <path d="M80 334 Q85 340 97 340 Q103 338 103 334" />
      <path d="M103 334 Q108 340 120 340 Q124 338 120 334" />
      {/* Piernas */}
      <path d="M80 338 Q76 365 78 390 Q80 408 84 414" />
      <path d="M97 338 Q94 365 94 390 Q94 408 96 414" />
      <path d="M103 338 Q106 365 106 390 Q106 408 104 414" />
      <path d="M120 338 Q124 365 122 390 Q120 408 116 414" />
      {/* Pies */}
      <path d="M78 412 Q80 422 88 426 Q96 428 97 424" />
      <path d="M122 412 Q120 422 112 426 Q104 428 103 424" />
      {/* Línea columna */}
      <path d="M100 78 Q100 130 100 195" strokeDasharray="3 3" strokeWidth="1" />
    </g>
  )

  return (
    <svg viewBox={view === 'face' ? '0 0 200 280' : `0 0 ${VW} ${VH}`} style={{ width:'100%', maxWidth: view === 'face' ? 200 : 260, display:'block', margin:'0 auto' }}>
      {view === 'front' && <FrontSilhouette />}
      {view === 'back' && <BackSilhouette />}
      {view === 'face' && <FaceSilhouette />}

      {/* Marcadores */}
      {zones.map(zone => {
        const hasProcedure = zonesWithProc.has(zone.id)
        const isSelected = selectedZone?.id === zone.id
        const isHov = hovered === zone.id
        const r = isSelected ? 9 : isHov ? 8 : hasProcedure ? 7 : 5
        return (
          <g key={zone.id}
            onClick={() => onSelect(isSelected ? null : zone)}
            onMouseEnter={() => setHovered(zone.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor:'pointer' }}>
            {(isSelected || isHov) && (
              <circle cx={zone.cx} cy={zone.cy} r={r+6} fill={COLOR} opacity="0.12" />
            )}
            <circle cx={zone.cx} cy={zone.cy} r={r}
              fill={isSelected || hasProcedure ? COLOR : '#fff'}
              stroke={COLOR} strokeWidth="1.5"
              opacity={isSelected || hasProcedure ? 1 : 0.55}
              style={{ transition:'r 0.15s' }} />
            {hasProcedure && !isSelected && (
              <circle cx={zone.cx} cy={zone.cy} r="2.5" fill="#fff" />
            )}
            {isSelected && (
              <text x={zone.cx} y={zone.cy+3.5} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">✓</text>
            )}
            {isHov && (
              <g>
                <rect x={zone.cx-40} y={zone.cy-28} width="80" height="16" rx="5" fill="#222" opacity="0.88" />
                <text x={zone.cx} y={zone.cy-17} textAnchor="middle" fontSize="9" fill="#fff">{zone.label}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function AestheticModule({ patient }) {
  const [procedures, setProcedures] = useState([])
  const [program, setProgram] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState(() => localStorage.getItem('aestheticTab') || 'diagrama')
  const [view, setView] = useState('front')
  const [selectedZone, setSelectedZone] = useState(null)

  useEffect(() => { localStorage.setItem('aestheticTab', tab) }, [tab])
  useEffect(() => { if (patient?.id) { loadProcedures(); loadProgram(); loadDiagnoses() } }, [patient])

  async function loadProcedures() {
    const { data } = await supabase.from('aesthetic_procedures').select('*').eq('patient_id', patient.id).order('procedure_date', { ascending: false })
    setProcedures(data || [])
  }

  async function loadProgram() {
    const { data } = await supabase.from('aesthetic_program').select('*').eq('patient_id', patient.id).order('step_order', { ascending: true })
    setProgram(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses').select('*').eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  const currentZones = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK
  const zoneProcedures = selectedZone ? procedures.filter(p => p.body_zone === selectedZone.id) : []
  const zonesWithProcedures = new Set(procedures.map(p => p.body_zone))

  const TABS = [
    { key:'diagrama', label:'Diagrama corporal' },
    { key:'programa', label:'Mi programa' },
    { key:'diagnosticos', label:'Diagnósticos' },
  ]

  return (
    <div>
      <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500, background: tab === t.key ? COLOR : '#f0f0f0', color: tab === t.key ? '#fff' : '#666' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'diagrama' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px' }}>
            <div style={{ display:'flex', gap:4, marginBottom:12, background:'#f0f0f0', borderRadius:8, padding:3 }}>
              <button onClick={() => { setView('front'); setSelectedZone(null) }}
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background: view === 'front' ? COLOR : 'transparent', color: view === 'front' ? '#fff' : '#666' }}>
                Frontal
              </button>
              <button onClick={() => { setView('back'); setSelectedZone(null) }}
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background: view === 'back' ? COLOR : 'transparent', color: view === 'back' ? '#fff' : '#666' }}>
                Posterior
              </button>
              <button onClick={() => { setView('face'); setSelectedZone(null) }}
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background: view === 'face' ? COLOR : 'transparent', color: view === 'face' ? '#fff' : '#666' }}>
                Cara
              </button>
            </div>
            {tab === 'diagrama' && (
              <BodyDiagram
                key={view}
                view={view}
                zones={view === 'face' ? BODY_ZONES_FACE : currentZones}
                procedures={procedures}
                selectedZone={selectedZone}
                onSelect={setSelectedZone}
              />
            )}
            <div style={{ fontSize:10, color:'#aaa', textAlign:'center', marginTop:6 }}>
              Tocá un punto para ver procedimientos · <span style={{ color:COLOR }}>●</span> = con procedimiento
            </div>
          </div>

          <div>
            {selectedZone ? (
              <div>
                <div style={{ background:COLOR, borderRadius:12, padding:'12px 14px', color:'#fff', marginBottom:10 }}>
                  <div style={{ fontSize:11, opacity:0.85 }}>Zona seleccionada</div>
                  <div style={{ fontSize:15, fontWeight:700 }}>{selectedZone.label}</div>
                  <div style={{ fontSize:12, opacity:0.75 }}>{zoneProcedures.length} procedimiento{zoneProcedures.length !== 1 ? 's' : ''}</div>
                </div>
                {zoneProcedures.length === 0 ? (
                  <div style={{ background:'#f8f8f8', borderRadius:10, padding:'20px', textAlign:'center', fontSize:13, color:'#bbb' }}>
                    Sin procedimientos en esta zona
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {zoneProcedures.map(p => (
                      <div key={p.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:2 }}>{p.procedure_name}</div>
                        <div style={{ fontSize:11, color:'#aaa' }}>{formatDate(p.procedure_date)}</div>
                        {p.notes && <div style={{ fontSize:12, color:'#888', marginTop:4 }}>{p.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div style={{ background:'#f8f8f8', borderRadius:12, padding:'20px', textAlign:'center', marginBottom:12 }}>
                  <div style={{ fontSize:13, color:'#aaa', marginBottom:6 }}>Seleccioná una zona en el diagrama</div>
                  {zonesWithProcedures.size > 0 && (
                    <div style={{ fontSize:12, color:COLOR, fontWeight:500 }}>
                      {zonesWithProcedures.size} zona{zonesWithProcedures.size !== 1 ? 's' : ''} con procedimientos
                    </div>
                  )}
                </div>
                {procedures.length > 0 && (
                  <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px' }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>Últimos procedimientos</div>
                    {procedures.slice(0,5).map(p => (
                      <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'0.5px solid #f5f5f5', fontSize:12 }}>
                        <span style={{ color:'#1a1a1a' }}>{p.procedure_name}</span>
                        <span style={{ color:'#aaa' }}>{formatDate(p.procedure_date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'programa' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Mi programa personalizado</div>
          <div style={{ fontSize:12, color:'#888', marginBottom:14 }}>Plan de procedimientos en orden de prioridad definido por tu médico.</div>
          {program.length === 0 ? (
            <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Tu médico aún no ha definido tu programa.</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {program.map((step, i) => (
                <div key={step.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, background: step.is_done ? '#f0f0f0' : '#f8f8f8', opacity: step.is_done ? 0.6 : 1 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: step.is_done ? '#aaa' : COLOR, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, flexShrink:0 }}>
                    {step.is_done ? '✓' : step.step_order}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500, color: step.is_done ? '#aaa' : '#1a1a1a', textDecoration: step.is_done ? 'line-through' : 'none' }}>
                      {step.procedure_name}
                    </div>
                    {step.notes && <div style={{ fontSize:11, color:'#aaa' }}>{step.notes}</div>}
                    {step.is_done && step.done_date && <div style={{ fontSize:11, color:'#aaa' }}>Realizado: {formatDate(step.done_date)}</div>}
                  </div>
                  {!step.is_done && i === program.findIndex(s => !s.is_done) && (
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background: COLOR + '20', color:COLOR, fontWeight:600 }}>Próximo</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:12 }}>Diagnósticos activos</div>
          {diagnoses.length === 0 ? (
            <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {diagnoses.map(d => (
                <div key={d.id} style={{ background:'#f8f8f8', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:12, fontWeight:500, color:'#1a1a1a', marginBottom:4 }}>{d.cie10_description}</div>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0e8f0', color:COLOR, fontWeight:500 }}>{d.cie10_code}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
