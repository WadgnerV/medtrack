import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#8e44ad'

const BODY_ZONES_FRONT = [
  { id:'cabeza_front', label:'Cabeza', x:150, y:30 },
  { id:'frente', label:'Frente', x:150, y:52 },
  { id:'entrecejo', label:'Entrecejo', x:150, y:62 },
  { id:'ojeras', label:'Ojeras', x:150, y:70 },
  { id:'nariz', label:'Nariz', x:150, y:78 },
  { id:'pomulos', label:'Pómulos', x:150, y:74 },
  { id:'labios', label:'Labios', x:150, y:88 },
  { id:'menton', label:'Mentón', x:150, y:98 },
  { id:'cuello_ant', label:'Cuello', x:150, y:114 },
  { id:'axila_der', label:'Axila der.', x:103, y:138 },
  { id:'axila_izq', label:'Axila izq.', x:197, y:138 },
  { id:'pecho', label:'Pecho/Mamas', x:150, y:150 },
  { id:'abdomen', label:'Abdomen', x:150, y:185 },
  { id:'brazo_ant_der', label:'Brazo ant. der.', x:83, y:168 },
  { id:'brazo_ant_izq', label:'Brazo ant. izq.', x:217, y:168 },
  { id:'mano_ant_der', label:'Mano ant. der.', x:72, y:218 },
  { id:'mano_ant_izq', label:'Mano ant. izq.', x:228, y:218 },
  { id:'zona_genital', label:'Zona genital', x:150, y:228 },
  { id:'muslo_ant_der', label:'Muslo ant. der.', x:125, y:262 },
  { id:'muslo_ant_izq', label:'Muslo ant. izq.', x:175, y:262 },
  { id:'rodilla_der', label:'Rodilla der.', x:125, y:305 },
  { id:'rodilla_izq', label:'Rodilla izq.', x:175, y:305 },
  { id:'pantorrilla_ant_der', label:'Pantorrilla ant. der.', x:125, y:338 },
  { id:'pantorrilla_ant_izq', label:'Pantorrilla ant. izq.', x:175, y:338 },
  { id:'tobillo_der', label:'Tobillo der.', x:125, y:368 },
  { id:'tobillo_izq', label:'Tobillo izq.', x:175, y:368 },
  { id:'pie_der', label:'Pie der.', x:120, y:385 },
  { id:'pie_izq', label:'Pie izq.', x:180, y:385 },
]

const BODY_ZONES_BACK = [
  { id:'cabeza_back', label:'Cabeza/Nuca', x:150, y:30 },
  { id:'cuello_post', label:'Cuello post.', x:150, y:114 },
  { id:'espalda_alta', label:'Espalda alta', x:150, y:145 },
  { id:'espalda_media', label:'Espalda media', x:150, y:175 },
  { id:'lumbar', label:'Zona lumbar', x:150, y:205 },
  { id:'gluteos', label:'Glúteos', x:150, y:232 },
  { id:'brazo_post_der', label:'Brazo post. der.', x:83, y:168 },
  { id:'brazo_post_izq', label:'Brazo post. izq.', x:217, y:168 },
  { id:'mano_post_der', label:'Mano post. der.', x:72, y:218 },
  { id:'mano_post_izq', label:'Mano post. izq.', x:228, y:218 },
  { id:'muslo_post_der', label:'Muslo post. der.', x:125, y:262 },
  { id:'muslo_post_izq', label:'Muslo post. izq.', x:175, y:262 },
  { id:'pantorrilla_post_der', label:'Pantorrilla post. der.', x:125, y:338 },
  { id:'pantorrilla_post_izq', label:'Pantorrilla post. izq.', x:175, y:338 },
  { id:'tobillo_post_der', label:'Tobillo post. der.', x:125, y:368 },
  { id:'tobillo_post_izq', label:'Tobillo post. izq.', x:175, y:368 },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

function BodySVG({ zones, zonesWithProcedures, selectedZone, onSelect, isBack }) {
  const [hovered, setHovered] = React.useState(null)
  const skin = '#f5ede8'
  const skinStroke = '#d4b8a8'
  return (
    <svg viewBox="0 0 300 480" style={{ width:'100%', maxWidth:280, filter:'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}>
      <defs>
        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fdf0ea" />
          <stop offset="100%" stopColor="#ecd4c8" />
        </linearGradient>
      </defs>

      {/* Cabeza */}
      <ellipse cx="150" cy="48" rx="32" ry="36" fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Orejas */}
      <ellipse cx="118" cy="52" rx="7" ry="10" fill={skin} stroke={skinStroke} strokeWidth="1" />
      <ellipse cx="182" cy="52" rx="7" ry="10" fill={skin} stroke={skinStroke} strokeWidth="1" />
      {/* Cuello */}
      <path d="M138 82 Q150 86 162 82 L164 104 Q150 108 136 104 Z" fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Hombros y torso */}
      <path d="M100 108 Q78 112 72 130 L70 160 Q82 158 90 155 L90 220 Q120 228 150 228 Q180 228 210 220 L210 155 Q218 158 230 160 L228 130 Q222 112 200 108 Q175 100 150 100 Q125 100 100 108 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Brazo der */}
      <path d="M72 132 Q60 140 58 165 Q56 190 62 210 Q66 220 74 222 Q80 220 84 210 Q88 190 86 165 Q84 142 78 132 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Brazo izq */}
      <path d="M228 132 Q240 140 242 165 Q244 190 238 210 Q234 220 226 222 Q220 220 216 210 Q212 190 214 165 Q216 142 222 132 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Mano der */}
      <ellipse cx="68" cy="232" rx="12" ry="14" fill={skin} stroke={skinStroke} strokeWidth="1" />
      {/* Mano izq */}
      <ellipse cx="232" cy="232" rx="12" ry="14" fill={skin} stroke={skinStroke} strokeWidth="1" />
      {/* Cadera */}
      <path d="M90 220 Q90 240 95 250 Q120 260 150 260 Q180 260 205 250 Q210 240 210 220 Q180 228 150 228 Q120 228 90 220 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Muslo der */}
      <path d="M95 252 Q88 270 90 300 Q92 325 102 335 Q112 340 118 335 Q126 325 126 300 Q126 270 122 252 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Muslo izq */}
      <path d="M205 252 Q212 270 210 300 Q208 325 198 335 Q188 340 182 335 Q174 325 174 300 Q174 270 178 252 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Pierna der */}
      <path d="M102 336 Q96 360 98 390 Q100 410 110 416 Q118 418 122 414 Q128 408 128 390 Q128 360 124 336 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Pierna izq */}
      <path d="M198 336 Q204 360 202 390 Q200 410 190 416 Q182 418 178 414 Q172 408 172 390 Q172 360 176 336 Z"
        fill="url(#bodyGrad)" stroke={skinStroke} strokeWidth="1.2" />
      {/* Pie der */}
      <ellipse cx="110" cy="424" rx="20" ry="9" fill={skin} stroke={skinStroke} strokeWidth="1" />
      {/* Pie izq */}
      <ellipse cx="190" cy="424" rx="20" ry="9" fill={skin} stroke={skinStroke} strokeWidth="1" />

      {/* Marcadores de zonas */}
      {zones.map(zone => {
        const hasProcedure = zonesWithProcedures.has(zone.id)
        const isSelected = selectedZone?.id === zone.id
        const isHovered = hovered === zone.id
        const r = isSelected ? 10 : isHovered ? 8 : hasProcedure ? 7 : 5
        return (
          <g key={zone.id}
            onClick={() => onSelect(isSelected ? null : zone)}
            onMouseEnter={() => setHovered(zone.id)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor:'pointer' }}>
            {/* Halo */}
            {(isSelected || isHovered) && (
              <circle cx={zone.x} cy={zone.y} r={r + 5} fill={COLOR} opacity={0.15} />
            )}
            {/* Marcador */}
            <circle cx={zone.x} cy={zone.y} r={r}
              fill={isSelected ? COLOR : hasProcedure ? COLOR + 'dd' : '#fff'}
              stroke={COLOR} strokeWidth={isSelected ? 0 : 1.5}
              style={{ transition:'all 0.15s' }} />
            {/* Punto interior si tiene procedimiento */}
            {hasProcedure && !isSelected && (
              <circle cx={zone.x} cy={zone.y} r="3" fill="#fff" />
            )}
            {/* Check si seleccionado */}
            {isSelected && (
              <text x={zone.x} y={zone.y + 4} textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">✓</text>
            )}
            {/* Tooltip al hover */}
            {isHovered && !isSelected && (
              <g>
                <rect x={zone.x - 35} y={zone.y - 28} width="70" height="18" rx="6" fill="#1a1a1a" opacity={0.85} />
                <text x={zone.x} y={zone.y - 16} textAnchor="middle" fontSize="9" fill="#fff">{zone.label}</text>
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
