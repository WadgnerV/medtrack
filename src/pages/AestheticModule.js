import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#8e44ad'

const BODY_ZONES_FRONT = [
  { id:'cabeza_front', label:'Cabeza', x:100, y:18 },
  { id:'frente', label:'Frente', x:100, y:25 },
  { id:'entrecejo', label:'Entrecejo', x:100, y:32 },
  { id:'ojeras', label:'Ojeras', x:100, y:38 },
  { id:'nariz', label:'Nariz', x:100, y:44 },
  { id:'pomulos', label:'Pómulos', x:100, y:36 },
  { id:'labios', label:'Labios', x:100, y:50 },
  { id:'menton', label:'Mentón', x:100, y:56 },
  { id:'cuello_ant', label:'Cuello', x:100, y:66 },
  { id:'axila_der', label:'Axila der.', x:72, y:90 },
  { id:'axila_izq', label:'Axila izq.', x:128, y:90 },
  { id:'pecho', label:'Pecho/Mamas', x:100, y:105 },
  { id:'abdomen', label:'Abdomen', x:100, y:148 },
  { id:'brazo_ant_der', label:'Brazo ant. der.', x:62, y:125 },
  { id:'brazo_ant_izq', label:'Brazo ant. izq.', x:138, y:125 },
  { id:'mano_ant_der', label:'Mano ant. der.', x:66, y:178 },
  { id:'mano_ant_izq', label:'Mano ant. izq.', x:134, y:178 },
  { id:'zona_genital', label:'Zona genital', x:100, y:200 },
  { id:'muslo_ant_der', label:'Muslo ant. der.', x:82, y:262 },
  { id:'muslo_ant_izq', label:'Muslo ant. izq.', x:118, y:262 },
  { id:'rodilla_der', label:'Rodilla der.', x:84, y:328 },
  { id:'rodilla_izq', label:'Rodilla izq.', x:116, y:328 },
  { id:'pantorrilla_ant_der', label:'Pantorrilla ant. der.', x:84, y:360 },
  { id:'pantorrilla_ant_izq', label:'Pantorrilla ant. izq.', x:116, y:360 },
  { id:'tobillo_der', label:'Tobillo der.', x:85, y:390 },
  { id:'tobillo_izq', label:'Tobillo izq.', x:115, y:390 },
  { id:'pie_der', label:'Pie der.', x:88, y:406 },
  { id:'pie_izq', label:'Pie izq.', x:112, y:406 },
]

const BODY_ZONES_BACK = [
  { id:'cabeza_back', label:'Cabeza/Nuca', x:100, y:18 },
  { id:'cuello_post', label:'Cuello post.', x:100, y:66 },
  { id:'espalda_alta', label:'Espalda alta', x:100, y:100 },
  { id:'espalda_media', label:'Espalda media', x:100, y:135 },
  { id:'lumbar', label:'Zona lumbar', x:100, y:165 },
  { id:'gluteos', label:'Glúteos', x:100, y:210 },
  { id:'brazo_post_der', label:'Brazo post. der.', x:62, y:125 },
  { id:'brazo_post_izq', label:'Brazo post. izq.', x:138, y:125 },
  { id:'mano_post_der', label:'Mano post. der.', x:66, y:178 },
  { id:'mano_post_izq', label:'Mano post. izq.', x:134, y:178 },
  { id:'muslo_post_der', label:'Muslo post. der.', x:82, y:262 },
  { id:'muslo_post_izq', label:'Muslo post. izq.', x:118, y:262 },
  { id:'pantorrilla_post_der', label:'Pantorrilla post. der.', x:84, y:360 },
  { id:'pantorrilla_post_izq', label:'Pantorrilla post. izq.', x:116, y:360 },
  { id:'tobillo_post_der', label:'Tobillo post. der.', x:85, y:390 },
  { id:'tobillo_post_izq', label:'Tobillo post. izq.', x:115, y:390 },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

function BodySVG({ zones, zonesWithProcedures, selectedZone, onSelect }) {
  const [hovered, setHovered] = React.useState(null)
  const S = '#c8b8d0'  // color stroke silueta
  const sw = 2         // strokeWidth

  return (
    <svg viewBox="0 0 200 420" style={{ width:'100%', maxWidth:260 }}>
      {/* ── SILUETA OUTLINE MINIMALISTA ── */}

      {/* Cabeza */}
      <ellipse cx="100" cy="32" rx="22" ry="26" fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" />

      {/* Cuello */}
      <line x1="91" y1="57" x2="89" y2="70" stroke={S} strokeWidth={sw} />
      <line x1="109" y1="57" x2="111" y2="70" stroke={S} strokeWidth={sw} />

      {/* Clavículas */}
      <path d="M89 70 Q100 67 111 70" fill="none" stroke={S} strokeWidth={sw} />

      {/* Hombro → brazo der */}
      <path d="M89 70 Q74 72 68 82 Q62 95 60 120 Q59 140 62 158 Q64 168 68 172"
        fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" />

      {/* Hombro → brazo izq */}
      <path d="M111 70 Q126 72 132 82 Q138 95 140 120 Q141 140 138 158 Q136 168 132 172"
        fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" />

      {/* Mano der */}
      <ellipse cx="66" cy="178" rx="8" ry="10" fill="none" stroke={S} strokeWidth={sw} />

      {/* Mano izq */}
      <ellipse cx="134" cy="178" rx="8" ry="10" fill="none" stroke={S} strokeWidth={sw} />

      {/* Torso lado der */}
      <path d="M89 70 Q85 90 84 115 Q83 140 85 160 Q88 175 90 190"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Torso lado izq */}
      <path d="M111 70 Q115 90 116 115 Q117 140 115 160 Q112 175 110 190"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Cintura */}
      <path d="M90 190 Q100 193 110 190" fill="none" stroke={S} strokeWidth={sw} />

      {/* Cadera der */}
      <path d="M90 190 Q84 200 82 215 Q80 225 84 235"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Cadera izq */}
      <path d="M110 190 Q116 200 118 215 Q120 225 116 235"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Entrepierna */}
      <path d="M84 235 Q92 245 100 247 Q108 245 116 235"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Muslo der exterior */}
      <path d="M84 235 Q78 260 80 290 Q82 310 86 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Muslo der interior */}
      <path d="M100 247 Q96 270 96 295 Q96 312 98 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Muslo izq interior */}
      <path d="M100 247 Q104 270 104 295 Q104 312 102 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Muslo izq exterior */}
      <path d="M116 235 Q122 260 120 290 Q118 310 114 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Rodilla der */}
      <path d="M86 325 Q90 330 98 330 Q104 330 104 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Rodilla izq */}
      <path d="M102 325 Q106 330 114 330 Q118 328 114 325"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Pierna der exterior */}
      <path d="M86 328 Q82 355 84 380 Q86 392 88 398"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Pierna der interior */}
      <path d="M98 328 Q96 355 96 380 Q96 392 97 398"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Pierna izq interior */}
      <path d="M102 328 Q104 355 104 380 Q104 392 103 398"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Pierna izq exterior */}
      <path d="M114 328 Q118 355 116 380 Q114 392 112 398"
        fill="none" stroke={S} strokeWidth={sw} />

      {/* Pie der */}
      <path d="M84 396 Q86 405 92 408 Q98 410 100 408 Q98 402 97 398"
        fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" />

      {/* Pie izq */}
      <path d="M116 396 Q114 405 108 408 Q102 410 100 408 Q102 402 103 398"
        fill="none" stroke={S} strokeWidth={sw} strokeLinejoin="round" />

      {/* ── MARCADORES ── */}
      {zones.map(zone => {
        const hasProcedure = zonesWithProcedures.has(zone.id)
        const isSelected = selectedZone?.id === zone.id
        const isHov = hovered === zone.id
        return (
          <g key={zone.id}
            onClick={() => onSelect(isSelected ? null : zone)}
            onMouseEnter={() => setHovered(zone.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor:'pointer' }}>
            {/* Halo */}
            {(isSelected || isHov) && (
              <circle cx={zone.x} cy={zone.y} r="12" fill={COLOR} opacity="0.12" />
            )}
            {/* Marcador principal */}
            <circle cx={zone.x} cy={zone.y} r={isSelected ? 8 : isHov ? 7 : hasProcedure ? 6 : 4}
              fill={isSelected || hasProcedure ? COLOR : '#fff'}
              stroke={COLOR} strokeWidth="1.5"
              opacity={isSelected || hasProcedure ? 1 : 0.45}
              style={{ transition:'r 0.15s, opacity 0.15s' }} />
            {hasProcedure && !isSelected && (
              <circle cx={zone.x} cy={zone.y} r="2.5" fill="#fff" />
            )}
            {isSelected && (
              <text x={zone.x} y={zone.y + 3.5} textAnchor="middle" fontSize="8" fill="#fff" fontWeight="bold">✓</text>
            )}
            {/* Tooltip */}
            {isHov && (
              <g>
                <rect x={zone.x - 38} y={zone.y - 26} width="76" height="16" rx="5" fill="#222" opacity="0.88" />
                <text x={zone.x} y={zone.y - 15} textAnchor="middle" fontSize="8.5" fill="#fff">{zone.label}</text>
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
    const { data } = await supabase.from('aesthetic_procedures')
      .select('*').eq('patient_id', patient.id)
      .order('procedure_date', { ascending: false })
    setProcedures(data || [])
  }

  async function loadProgram() {
    const { data } = await supabase.from('aesthetic_program')
      .select('*').eq('patient_id', patient.id)
      .order('step_order', { ascending: true })
    setProgram(data || [])
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses')
      .select('*').eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  const zonesWithProcedures = new Set(procedures.map(p => p.body_zone))
  const currentZones = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK
  const zoneProcedures = selectedZone ? procedures.filter(p => p.body_zone === selectedZone.id) : []

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
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, alignItems:'start' }}>
            {/* Diagrama */}
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px', textAlign:'center', minWidth:200 }}>
              {/* Toggle frontal/posterior */}
              <div style={{ display:'flex', gap:4, marginBottom:12, background:'#f0f0f0', borderRadius:8, padding:3 }}>
                <button onClick={() => { setView('front'); setSelectedZone(null) }}
                  style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background: view === 'front' ? COLOR : 'transparent', color: view === 'front' ? '#fff' : '#666' }}>
                  Frontal
                </button>
                <button onClick={() => { setView('back'); setSelectedZone(null) }}
                  style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:11, fontWeight:500, background: view === 'back' ? COLOR : 'transparent', color: view === 'back' ? '#fff' : '#666' }}>
                  Posterior
                </button>
              </div>

              <BodySVG
                zones={currentZones}
                zonesWithProcedures={zonesWithProcedures}
                selectedZone={selectedZone}
                onSelect={setSelectedZone}
                isBack={view === 'back'}
              />

              <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:8, fontSize:10, color:'#888' }}>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:COLOR }} />Con proc.
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#fff', border:`1px solid ${COLOR}`, opacity:0.5 }} />Sin proc.
                </div>
              </div>
            </div>

            {/* Panel derecho */}
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
                    <div style={{ fontSize:13, color:'#aaa', marginBottom:6 }}>Tocá una zona para ver procedimientos</div>
                    {zonesWithProcedures.size > 0 && (
                      <div style={{ fontSize:12, color:COLOR, fontWeight:500 }}>
                        {zonesWithProcedures.size} zona{zonesWithProcedures.size !== 1 ? 's' : ''} con procedimientos registrados
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
