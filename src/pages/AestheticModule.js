import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#8e44ad'

const BODY_ZONES_FRONT = [
  { id:'cabeza_front', label:'Cabeza', x:'50%', y:'4%' },
  { id:'frente', label:'Frente', x:'50%', y:'6%' },
  { id:'ojeras', label:'Ojeras', x:'50%', y:'9%' },
  { id:'nariz', label:'Nariz', x:'50%', y:'11%' },
  { id:'pomulos', label:'Pómulos', x:'50%', y:'9.5%' },
  { id:'labios', label:'Labios', x:'50%', y:'13%' },
  { id:'menton', label:'Mentón', x:'50%', y:'15%' },
  { id:'cuello_ant', label:'Cuello', x:'50%', y:'18%' },
  { id:'axila_der', label:'Axila der.', x:'28%', y:'26%' },
  { id:'axila_izq', label:'Axila izq.', x:'72%', y:'26%' },
  { id:'pecho', label:'Pecho/Mamas', x:'50%', y:'30%' },
  { id:'abdomen', label:'Abdomen', x:'50%', y:'42%' },
  { id:'brazo_ant_der', label:'Brazo ant. der.', x:'20%', y:'36%' },
  { id:'brazo_ant_izq', label:'Brazo ant. izq.', x:'80%', y:'36%' },
  { id:'mano_ant_der', label:'Mano ant. der.', x:'15%', y:'50%' },
  { id:'mano_ant_izq', label:'Mano ant. izq.', x:'85%', y:'50%' },
  { id:'zona_genital', label:'Zona genital', x:'50%', y:'54%' },
  { id:'muslo_ant_der', label:'Muslo ant. der.', x:'37%', y:'64%' },
  { id:'muslo_ant_izq', label:'Muslo ant. izq.', x:'63%', y:'64%' },
  { id:'rodilla_der', label:'Rodilla der.', x:'37%', y:'76%' },
  { id:'rodilla_izq', label:'Rodilla izq.', x:'63%', y:'76%' },
  { id:'pantorrilla_ant_der', label:'Pantorrilla ant. der.', x:'37%', y:'85%' },
  { id:'pantorrilla_ant_izq', label:'Pantorrilla ant. izq.', x:'63%', y:'85%' },
  { id:'tobillo_der', label:'Tobillo der.', x:'37%', y:'93%' },
  { id:'tobillo_izq', label:'Tobillo izq.', x:'63%', y:'93%' },
  { id:'pie_der', label:'Pie der.', x:'35%', y:'97%' },
  { id:'pie_izq', label:'Pie izq.', x:'65%', y:'97%' },
]

const BODY_ZONES_BACK = [
  { id:'cabeza_back', label:'Cabeza/Nuca', x:'50%', y:'4%' },
  { id:'cuello_post', label:'Cuello post.', x:'50%', y:'18%' },
  { id:'espalda_alta', label:'Espalda alta', x:'50%', y:'27%' },
  { id:'espalda_media', label:'Espalda media', x:'50%', y:'36%' },
  { id:'lumbar', label:'Zona lumbar', x:'50%', y:'44%' },
  { id:'gluteos', label:'Glúteos', x:'50%', y:'54%' },
  { id:'brazo_post_der', label:'Brazo post. der.', x:'20%', y:'36%' },
  { id:'brazo_post_izq', label:'Brazo post. izq.', x:'80%', y:'36%' },
  { id:'mano_post_der', label:'Mano post. der.', x:'15%', y:'50%' },
  { id:'mano_post_izq', label:'Mano post. izq.', x:'85%', y:'50%' },
  { id:'muslo_post_der', label:'Muslo post. der.', x:'37%', y:'64%' },
  { id:'muslo_post_izq', label:'Muslo post. izq.', x:'63%', y:'64%' },
  { id:'pantorrilla_post_der', label:'Pantorrilla post. der.', x:'37%', y:'85%' },
  { id:'pantorrilla_post_izq', label:'Pantorrilla post. izq.', x:'63%', y:'85%' },
  { id:'tobillo_post_der', label:'Tobillo post. der.', x:'37%', y:'93%' },
  { id:'tobillo_post_izq', label:'Tobillo post. izq.', x:'63%', y:'93%' },
]

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

function BodyDiagram({ view, zones, procedures, selectedZone, onSelect }) {
  const containerRef = useRef(null)
  const chartRef = useRef(null)
  const zonesWithProc = new Set(procedures.map(p => p.body_zone))
  const [hovered, setHovered] = useState(null)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  useEffect(() => {
    async function init() {
      if (!containerRef.current) return
      containerRef.current.innerHTML = ''
      try {
        const { BodyChart, ViewSide } = await import('body-muscles')
        // Deshabilitar clicks de body-muscles — solo usamos como silueta visual
        const bodyState = {}
        chartRef.current = new BodyChart(containerRef.current, {
          view: view === 'front' ? ViewSide.FRONT : ViewSide.BACK,
          bodyState,
          onMuscleClick: () => {},
          onMuscleHover: () => {},
        })
        // Deshabilitar pointer events del SVG interno
        const svg = containerRef.current.querySelector('svg')
        if (svg) {
          svg.style.pointerEvents = 'none'
          const rect = svg.getBoundingClientRect()
          const parent = containerRef.current.getBoundingClientRect()
          setDims({ width: parent.width, height: parent.height })
        }
      } catch(e) { console.error(e) }
    }
    init()
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null } }
  }, [view])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDims({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  function parsePos(val, total) {
    if (typeof val === 'string' && val.endsWith('%')) {
      return (parseFloat(val) / 100) * total
    }
    return parseFloat(val)
  }

  return (
    <div style={{ position:'relative', width:'100%' }}>
      <div ref={containerRef} style={{ width:'100%' }} />
      {/* Overlay de puntos propios */}
      {dims.width > 0 && dims.height > 0 && (
        <div style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', pointerEvents:'none' }}>
          {zones.map(zone => {
            const hasProcedure = zonesWithProc.has(zone.id)
            const isSelected = selectedZone?.id === zone.id
            const isHov = hovered === zone.id
            const cx = parsePos(zone.x, dims.width)
            const cy = parsePos(zone.y, dims.height)
            const r = isSelected ? 10 : isHov ? 9 : hasProcedure ? 8 : 6
            return (
              <div key={zone.id} style={{ position:'absolute', left: cx, top: cy, transform:'translate(-50%,-50%)', pointerEvents:'all', cursor:'pointer', zIndex:10 }}
                onClick={() => onSelect(isSelected ? null : zone)}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}>
                {/* Halo */}
                {(isSelected || isHov) && (
                  <div style={{ position:'absolute', width: r*3, height: r*3, borderRadius:'50%', background: COLOR, opacity:0.15, top:'50%', left:'50%', transform:'translate(-50%,-50%)' }} />
                )}
                {/* Punto */}
                <div style={{ width: r*2, height: r*2, borderRadius:'50%', background: isSelected || hasProcedure ? COLOR : '#fff', border:`2px solid ${COLOR}`, opacity: isSelected || hasProcedure ? 1 : 0.5, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s', boxShadow: isSelected ? `0 0 0 3px ${COLOR}40` : 'none' }}>
                  {hasProcedure && !isSelected && <div style={{ width:4, height:4, borderRadius:'50%', background:'#fff' }} />}
                  {isSelected && <span style={{ fontSize:8, color:'#fff', fontWeight:'bold' }}>✓</span>}
                </div>
                {/* Tooltip */}
                {isHov && (
                  <div style={{ position:'absolute', bottom:'120%', left:'50%', transform:'translateX(-50%)', background:'#222', color:'#fff', fontSize:10, padding:'3px 8px', borderRadius:6, whiteSpace:'nowrap', pointerEvents:'none', zIndex:20 }}>
                    {zone.label}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
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
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: view === 'front' ? COLOR : 'transparent', color: view === 'front' ? '#fff' : '#666' }}>
                Vista frontal
              </button>
              <button onClick={() => { setView('back'); setSelectedZone(null) }}
                style={{ flex:1, padding:'5px 8px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background: view === 'back' ? COLOR : 'transparent', color: view === 'back' ? '#fff' : '#666' }}>
                Vista posterior
              </button>
            </div>
            {tab === 'diagrama' && (
              <BodyDiagram
                key={view}
                view={view}
                zones={currentZones}
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
