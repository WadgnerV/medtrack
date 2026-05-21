import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const COLOR = '#8e44ad'

const ZONE_MAP = {
  // Frontal
  'chest-upper-left':    { label:'Pecho izq.', side:'front' },
  'chest-upper-right':   { label:'Pecho der.', side:'front' },
  'chest-lower-left':    { label:'Pecho bajo izq.', side:'front' },
  'chest-lower-right':   { label:'Pecho bajo der.', side:'front' },
  'abs-upper':           { label:'Abdomen superior', side:'front' },
  'abs-lower':           { label:'Abdomen inferior', side:'front' },
  'biceps-left':         { label:'Bíceps izq.', side:'front' },
  'biceps-right':        { label:'Bíceps der.', side:'front' },
  'forearm-left':        { label:'Antebrazo izq.', side:'front' },
  'forearm-right':       { label:'Antebrazo der.', side:'front' },
  'quad-left':           { label:'Cuádriceps izq.', side:'front' },
  'quad-right':          { label:'Cuádriceps der.', side:'front' },
  'inner-thigh-left':    { label:'Muslo interno izq.', side:'front' },
  'inner-thigh-right':   { label:'Muslo interno der.', side:'front' },
  'shin-left':           { label:'Espinilla izq.', side:'front' },
  'shin-right':          { label:'Espinilla der.', side:'front' },
  'shoulder-left':       { label:'Hombro izq.', side:'front' },
  'shoulder-right':      { label:'Hombro der.', side:'front' },
  'neck':                { label:'Cuello', side:'front' },
  'hip-left':            { label:'Cadera izq.', side:'front' },
  'hip-right':           { label:'Cadera der.', side:'front' },
  // Posterior
  'trapezius-left':      { label:'Trapecio izq.', side:'back' },
  'trapezius-right':     { label:'Trapecio der.', side:'back' },
  'lat-left':            { label:'Dorsal izq.', side:'back' },
  'lat-right':           { label:'Dorsal der.', side:'back' },
  'lower-back':          { label:'Zona lumbar', side:'back' },
  'glute-left':          { label:'Glúteo izq.', side:'back' },
  'glute-right':         { label:'Glúteo der.', side:'back' },
  'hamstring-left':      { label:'Isquiotibial izq.', side:'back' },
  'hamstring-right':     { label:'Isquiotibial der.', side:'back' },
  'calf-left':           { label:'Pantorrilla izq.', side:'back' },
  'calf-right':          { label:'Pantorrilla der.', side:'back' },
  'triceps-left':        { label:'Tríceps izq.', side:'back' },
  'triceps-right':       { label:'Tríceps der.', side:'back' },
  'rear-shoulder-left':  { label:'Hombro post. izq.', side:'back' },
  'rear-shoulder-right': { label:'Hombro post. der.', side:'back' },
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day:'numeric', month:'long', year:'numeric' })
}

export default function AestheticModule({ patient }) {
  const [procedures, setProcedures] = useState([])
  const [program, setProgram] = useState([])
  const [diagnoses, setDiagnoses] = useState([])
  const [tab, setTab] = useState(() => localStorage.getItem('aestheticTab') || 'diagrama')
  const [view, setView] = useState('front')
  const [selectedZone, setSelectedZone] = useState(null)
  const frontRef = useRef(null)
  const backRef = useRef(null)
  const frontChart = useRef(null)
  const backChart = useRef(null)

  useEffect(() => { localStorage.setItem('aestheticTab', tab) }, [tab])
  useEffect(() => { if (patient?.id) { loadProcedures(); loadProgram(); loadDiagnoses() } }, [patient])

  useEffect(() => {
    if (tab !== 'diagrama') return
    const timer = setTimeout(() => initCharts(), 100)
    return () => clearTimeout(timer)
  }, [tab, procedures])

  async function initCharts() {
    try {
      const { BodyChart, ViewSide } = await import('body-muscles')

      const zonesWithProc = new Set(procedures.map(p => p.body_zone))

      if (frontRef.current && !frontChart.current) {
        frontRef.current.innerHTML = ''
        const bodyState = {}
        Object.keys(ZONE_MAP).filter(k => ZONE_MAP[k].side === 'front').forEach(id => {
          bodyState[id] = { intensity: zonesWithProc.has(id) ? 8 : 0, selected: false }
        })
        frontChart.current = new BodyChart(frontRef.current, {
          view: ViewSide.FRONT,
          bodyState,
          onMuscleClick: (id, name) => {
            const zone = ZONE_MAP[id]
            if (zone) setSelectedZone({ id, label: zone.label })
          },
        })
      }

      if (backRef.current && !backChart.current) {
        backRef.current.innerHTML = ''
        const bodyState = {}
        Object.keys(ZONE_MAP).filter(k => ZONE_MAP[k].side === 'back').forEach(id => {
          bodyState[id] = { intensity: zonesWithProc.has(id) ? 8 : 0, selected: false }
        })
        backChart.current = new BodyChart(backRef.current, {
          view: ViewSide.BACK,
          bodyState,
          onMuscleClick: (id, name) => {
            const zone = ZONE_MAP[id]
            if (zone) setSelectedZone({ id, label: zone.label })
          },
        })
      }
    } catch(e) {
      console.error('Error cargando body-muscles:', e)
    }
  }

  useEffect(() => {
    return () => {
      if (frontChart.current) { frontChart.current.destroy(); frontChart.current = null }
      if (backChart.current) { backChart.current.destroy(); backChart.current = null }
    }
  }, [])

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
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* Diagramas */}
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
              <div style={{ display: view === 'front' ? 'block' : 'none' }}>
                <div ref={frontRef} style={{ width:'100%', minHeight:300 }} />
              </div>
              <div style={{ display: view === 'back' ? 'block' : 'none' }}>
                <div ref={backRef} style={{ width:'100%', minHeight:300 }} />
              </div>
              <div style={{ fontSize:11, color:'#aaa', textAlign:'center', marginTop:6 }}>
                Tocá una zona para ver procedimientos
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
