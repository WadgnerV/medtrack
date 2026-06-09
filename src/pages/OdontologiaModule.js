import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import OdontologiaNoteForm from '../components/OdontologiaNoteForm'

const COLOR = '#0e4d8a'
const COLOR_L = '#e8f0fb'

const CONDITIONS = {
  caries:     { label:'Caries',       color:'#E24B4A', bg:'#fde8e8' },
  obturacion: { label:'Obturación',   color:'#0e4d8a', bg:'#e8f0fb' },
  fractura:   { label:'Fractura',     color:'#c07a10', bg:'#fef0d6' },
  corona:     { label:'Corona',       color:'#1D9E75', bg:'#d4f5e7' },
  endodoncia: { label:'Endodoncia',   color:'#8e44ad', bg:'#f3e8fd' },
  extraccion: { label:'Extracción',   color:'#888780', bg:'#ebebeb' },
  periodoncia:{ label:'Periodoncia',  color:'#d4600a', bg:'#fdebd0' },
  ortodoncia: { label:'Ortodoncia',   color:'#0891b2', bg:'#e0f7fa' },
}

const CONDITIONS_BY_SPECIALTY = {
  'Restauradora': ['caries','obturacion','fractura'],
  'Endodoncia':   ['endodoncia'],
  'Periodoncia':  ['periodoncia'],
  'Ortodoncia':   ['ortodoncia'],
  'Prostodoncia': ['corona','extraccion'],
}

const DX_OPTIONS = {
  'Restauradora': ['Caries incipiente','Caries moderada','Caries profunda','Caries secundaria','Fractura coronaria','Fractura cúspide','Erosión dental','Abrasión','Atrición','Hipersensibilidad dentinaria','Tinción extrínseca'],
  'Endodoncia':   ['Pulpitis reversible','Pulpitis irreversible','Necrosis pulpar','Periodontitis apical aguda','Periodontitis apical crónica','Absceso periapical agudo','Absceso periapical crónico','Reabsorción radicular'],
  'Periodoncia':  ['Gingivitis','Periodontitis leve','Periodontitis moderada','Periodontitis severa','Bolsa periodontal','Lesión de furca grado I','Lesión de furca grado II','Lesión de furca grado III','Recesión gingival','Movilidad dental grado I','Movilidad dental grado II','Movilidad dental grado III'],
  'Ortodoncia':   ['Maloclusión clase I','Maloclusión clase II','Maloclusión clase III','Apiñamiento leve','Apiñamiento moderado','Apiñamiento severo','Diastema','Diente retenido','Supernumerario','Mordida abierta','Mordida cruzada'],
  'Cirugía/Prostodoncia': ['Diente ausente','Resto radicular','Diente incluido','Quiste periapical','Alveolitis','Implante oseointegrado'],
}

const PROC_OPTIONS = {
  'Restauradora':  ['Obturación resina clase I','Obturación resina clase II','Obturación resina clase III','Obturación resina clase IV','Obturación resina clase V','Obturación amalgama','Incrustación','Carilla de resina','Carilla de porcelana','Sellante de fosas y fisuras'],
  'Endodoncia':    ['Biopulpectomía','Necropulpectomía','Retratamiento endodóntico','Apicectomía','Obturación conducto radicular'],
  'Periodoncia':   ['Detartraje supragingival','Detartraje subgingival','Raspado y alisado radicular','Curetaje periodontal','Cirugía de colgajo','Gingivectomía','Frenectomía','Injerto gingival'],
  'Ortodoncia':    ['Colocación bracket','Activación arco','Colocación banda ortodoncia','Retención fija','Retención removible','Expansor palatino'],
  'Cirugía':       ['Extracción simple','Extracción quirúrgica','Alveoloplastia','Biopsia','Implante quirúrgico','Exposición quirúrgica diente retenido'],
  'Prostodoncia':  ['Corona metal-porcelana','Corona todo porcelana','Corona provisional','Puente fijo','Prótesis parcial removible','Prótesis total','Toma de impresión','Cementado corona'],
}

const SURFACES = { V:'Vestibular', L:'Lingual/Palatino', M:'Mesial', D:'Distal', O:'Oclusal/Incisal' }
const FDI_TOP = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
const FDI_BOT = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
const MOLARS   = new Set([18,17,16,28,27,26,48,47,46,38,37,36])
const PREMOLARS= new Set([15,14,25,24,45,44,35,34])
const CANINES  = new Set([13,23,33,43])

function ttype(n){ return MOLARS.has(n)?'molar':PREMOLARS.has(n)?'premolar':CANINES.has(n)?'canine':'incisor' }

function ToothSVG({ num, data, isSelected, onClick, onSurfaceClick }) {
  const type = ttype(num)
  const isAbs = data.absent
  const hasDx = Object.keys(data.surfs||{}).length > 0

  function sfill(s){
    if(isAbs) return '#e8e8e8'
    const c = data.surfs?.[s]
    if(!c) return '#f7f7f7'
    return CONDITIONS[c]?.color || COLOR
  }

  const bd = '#d0d0d0'
  const stroke = isSelected ? COLOR : hasDx ? '#aac4e0' : bd
  const sw = isSelected ? 2 : 1

  let W,H,paths=''

  if(type==='molar'){
    W=36;H=36
    paths+=`<rect x="2" y="2" width="32" height="32" rx="8" fill="${isAbs?'#e8e8e8':'#fff'}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(!isAbs){
      paths+=`<path class="surf" data-s="V" d="M10,2 Q18,2 26,2 Q30,2 34,6 L34,11 Q26,8 18,8 Q10,8 2,11 L2,6 Q6,2 10,2 Z" fill="${sfill('V')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="L" d="M10,34 Q18,34 26,34 Q30,34 34,30 L34,25 Q26,28 18,28 Q10,28 2,25 L2,30 Q6,34 10,34 Z" fill="${sfill('L')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="M" d="M2,10 L2,26 L7,24 L7,12 Z" fill="${sfill('M')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="D" d="M34,10 L34,26 L29,24 L29,12 Z" fill="${sfill('D')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<rect class="surf" data-s="O" x="7" y="11" width="22" height="14" rx="4" fill="${sfill('O')}" stroke="${bd}" stroke-width="0.4"/>`
      const fo=sfill('O')==='#f7f7f7'?'#e0e0e0':'rgba(0,0,0,0.1)'
      paths+=`<line x1="18" y1="11" x2="18" y2="25" stroke="${fo}" stroke-width="0.8"/><line x1="7" y1="18" x2="29" y2="18" stroke="${fo}" stroke-width="0.8"/>`
    } else {
      paths+=`<line x1="8" y1="8" x2="28" y2="28" stroke="#aaa" stroke-width="2" stroke-linecap="round"/><line x1="28" y1="8" x2="8" y2="28" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>`
    }
  } else if(type==='premolar'){
    W=28;H=34
    paths+=`<rect x="2" y="2" width="24" height="30" rx="7" fill="${isAbs?'#e8e8e8':'#fff'}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(!isAbs){
      paths+=`<path class="surf" data-s="V" d="M7,2 Q14,2 21,2 Q26,2 26,5 L26,9 Q19,7 14,7 Q9,7 2,9 L2,5 Q4,2 7,2 Z" fill="${sfill('V')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="L" d="M7,32 Q14,32 21,32 Q26,32 26,29 L26,25 Q19,27 14,27 Q9,27 2,25 L2,29 Q4,32 7,32 Z" fill="${sfill('L')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="M" d="M2,9 L2,23 L6,22 L6,10 Z" fill="${sfill('M')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="D" d="M26,9 L26,23 L22,22 L22,10 Z" fill="${sfill('D')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<rect class="surf" data-s="O" x="6" y="10" width="16" height="14" rx="4" fill="${sfill('O')}" stroke="${bd}" stroke-width="0.4"/>`
      const fo=sfill('O')==='#f7f7f7'?'#e0e0e0':'rgba(0,0,0,0.1)'
      paths+=`<line x1="14" y1="10" x2="14" y2="24" stroke="${fo}" stroke-width="0.8"/>`
    } else {
      paths+=`<line x1="7" y1="7" x2="21" y2="27" stroke="#aaa" stroke-width="2" stroke-linecap="round"/><line x1="21" y1="7" x2="7" y2="27" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>`
    }
  } else if(type==='canine'){
    W=24;H=34
    paths+=`<path d="M12,2 Q22,2 22,12 L22,26 Q22,32 12,32 Q2,32 2,26 L2,12 Q2,2 12,2 Z" fill="${isAbs?'#e8e8e8':'#fff'}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(!isAbs){
      paths+=`<path class="surf" data-s="V" d="M5,2 Q12,1 19,2 L21,9 Q12,7 3,9 Z" fill="${sfill('V')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="L" d="M3,25 Q12,29 21,25 L19,32 Q12,33 5,32 Z" fill="${sfill('L')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="M" d="M2,12 L2,24 L5,23 L5,11 Z" fill="${sfill('M')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="D" d="M22,12 L22,24 L19,23 L19,11 Z" fill="${sfill('D')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<ellipse class="surf" data-s="O" cx="12" cy="17" rx="7" ry="7" fill="${sfill('O')}" stroke="${bd}" stroke-width="0.4"/>`
    } else {
      paths+=`<line x1="6" y1="8" x2="18" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/><line x1="18" y1="8" x2="6" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>`
    }
  } else {
    W=22;H=34
    paths+=`<rect x="2" y="2" width="18" height="30" rx="5" fill="${isAbs?'#e8e8e8':'#fff'}" stroke="${stroke}" stroke-width="${sw}"/>`
    if(!isAbs){
      paths+=`<path class="surf" data-s="V" d="M5,2 Q11,2 17,2 Q20,2 20,5 L20,9 Q14,7 11,7 Q8,7 2,9 L2,5 Q2,2 5,2 Z" fill="${sfill('V')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="L" d="M5,32 Q11,32 17,32 Q20,32 20,29 L20,25 Q14,27 11,27 Q8,27 2,25 L2,29 Q2,32 5,32 Z" fill="${sfill('L')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="M" d="M2,9 L2,23 L5,22 L5,10 Z" fill="${sfill('M')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<path class="surf" data-s="D" d="M20,9 L20,23 L17,22 L17,10 Z" fill="${sfill('D')}" stroke="${bd}" stroke-width="0.4"/>`
      paths+=`<rect class="surf" data-s="O" x="5" y="10" width="12" height="14" rx="3" fill="${sfill('O')}" stroke="${bd}" stroke-width="0.4"/>`
    } else {
      paths+=`<line x1="6" y1="8" x2="16" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="8" x2="6" y2="26" stroke="#aaa" stroke-width="2" stroke-linecap="round"/>`
    }
  }

  if(isSelected) paths+=`<rect x="0" y="0" width="${W}" height="${H}" rx="9" fill="none" stroke="${COLOR}" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/>`

  return (
    <svg
      width={W} height={H} viewBox={`0 0 ${W} ${H}`}
      style={{ overflow:'visible', display:'block', cursor:'pointer', transition:'transform 0.12s' }}
      onClick={e => {
        const s = e.target.getAttribute('data-s')
        if(s) { e.stopPropagation(); onSurfaceClick(num, s) }
        else onClick(num)
      }}
      onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
    >
      <g dangerouslySetInnerHTML={{ __html: paths }} />
    </svg>
  )
}

function Odontograma({ teethData, selected, onSelect, onSurfaceClick }) {
  function Row({ nums, isTop }) {
    return (
      <div style={{ display:'flex', alignItems: isTop?'flex-end':'flex-start', gap:3, justifyContent:'center' }}>
        {nums.map(n => (
          <div key={n} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, flexShrink:0 }}>
            {isTop && <div style={{ fontSize:9, fontWeight:600, color: selected===n?COLOR:'#aaa' }}>{n}</div>}
            <ToothSVG
              num={n}
              data={teethData[n]||{ surfs:{}, absent:false, records:[] }}
              isSelected={selected===n}
              onClick={onSelect}
              onSurfaceClick={onSurfaceClick}
            />
            {!isTop && <div style={{ fontSize:9, fontWeight:600, color: selected===n?COLOR:'#aaa' }}>{n}</div>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:14, padding:'18px 12px 14px', overflowX:'auto' }}>
      <Row nums={FDI_TOP} isTop={true} />
      <div style={{ borderTop:'1px dashed #e0e0e0', margin:'10px 8px', position:'relative' }}>
        <span style={{ position:'absolute', left:'50%', top:-8, transform:'translateX(-50%)', background:'#fff', padding:'0 8px', fontSize:9, color:'#bbb', textTransform:'uppercase', letterSpacing:'0.5px' }}>línea media</span>
      </div>
      <Row nums={FDI_BOT} isTop={false} />
    </div>
  )
}

export default function OdontologiaModule({ patient, careModule, canEdit, profile, defaultTab }) {
  const [tab, setTab] = useState(defaultTab || 'notas')
  const [teethData, setTeethData] = useState({})
  const [selected, setSelected] = useState(null)
  const [diagnoses, setDiagnoses] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    cara: 'O', cond: 'caries', dx: '', proc: '', specialty: 'Restauradora', ausente: false
  })

  useEffect(() => { if(defaultTab) setTab(defaultTab) }, [defaultTab])
  useEffect(() => { if(patient?.id) { loadOdontograma(); loadDiagnoses() } }, [patient])

  async function loadOdontograma() {
    const { data } = await supabase.from('odontograma_records')
      .select('*').eq('patient_id', patient.id)
    if(!data) return
    const td = {}
    FDI_TOP.concat(FDI_BOT).forEach(n => { td[n] = { surfs:{}, absent:false, records:[] } })
    data.forEach(r => {
      if(!td[r.tooth_number]) td[r.tooth_number] = { surfs:{}, absent:false, records:[] }
      if(r.absent) { td[r.tooth_number].absent = true }
      else if(r.surface && r.condition) { td[r.tooth_number].surfs[r.surface] = r.condition }
      td[r.tooth_number].records.push(r)
    })
    setTeethData(td)
  }

  async function loadDiagnoses() {
    const { data } = await supabase.from('patient_diagnoses')
      .select('*').eq('patient_id', patient.id).eq('is_active', true)
    setDiagnoses(data || [])
  }

  async function saveRecord() {
    if(!selected) return
    setSaving(true)
    const payload = {
      patient_id: patient.id,
      tooth_number: selected,
      surface: form.ausente ? null : form.cara,
      condition: form.ausente ? 'extraccion' : form.cond,
      diagnosis: form.dx || null,
      procedure: form.proc || null,
      absent: form.ausente,
      recorded_by: profile?.id,
    }
    await supabase.from('odontograma_records').insert(payload)
    await loadOdontograma()
    setForm(p => ({ ...p, dx:'', proc:'', ausente:false }))
    setSaving(false)
  }

  async function deleteRecord(id) {
    await supabase.from('odontograma_records').delete().eq('id', id)
    await loadOdontograma()
  }

  function handleSurfaceClick(num, surf) {
    setSelected(num)
    setForm(p => ({ ...p, cara: surf }))
  }

  const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#fff' }
  const lbl = { fontSize:11, fontWeight:700, color:'#6b8f7e', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

  const selData = selected ? (teethData[selected] || { surfs:{}, absent:false, records:[] }) : null
  const selRecords = selData?.records || []

  const TABS = [
    { key:'notas',          label:'Notas clínicas'    },
    { key:'odontograma',    label:'Odontograma'       },
    { key:'diagnosticos',   label:'Diagnósticos'      },
  ]

  return (
    <div>
      {!defaultTab && (
        <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight:500,
                background: tab===t.key ? COLOR : '#f0f0f0', color: tab===t.key ? '#fff' : '#666' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'notas' && (
        <OdontologiaNoteForm patientId={patient?.id} profile={profile} />
      )}

      {tab === 'odontograma' && (
        <div>
          <Odontograma
            teethData={teethData}
            selected={selected}
            onSelect={n => setSelected(n)}
            onSurfaceClick={handleSurfaceClick}
          />

          <div style={{ display:'flex', gap:10, marginTop:10, marginBottom:14, flexWrap:'wrap' }}>
            {Object.entries(CONDITIONS).map(([k,v]) => (
              <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#666' }}>
                <div style={{ width:10, height:10, borderRadius:2, background:v.color }}></div>{v.label}
              </div>
            ))}
          </div>

          {canEdit && (
            <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:14, padding:18, marginTop:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color: selected?COLOR:'#aaa', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
                {selected
                  ? <><span style={{ background:COLOR_L, color:COLOR, fontSize:12, padding:'3px 10px', borderRadius:20, fontWeight:700 }}>Pieza {selected}</span><span style={{ color:'#aaa', fontWeight:400, fontSize:12, textTransform:'capitalize' }}>{ttype(selected)}</span></>
                  : 'Seleccioná un diente en el odontograma'}
              </div>

              {selRecords.length > 0 && (
                <div style={{ marginBottom:14 }}>
                  {selRecords.map(r => (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:10, background:'#f4f7f6', marginBottom:5 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                        <span style={{ background: CONDITIONS[r.condition]?.bg||COLOR_L, color: CONDITIONS[r.condition]?.color||COLOR, fontSize:11, padding:'2px 9px', borderRadius:20, fontWeight:600 }}>
                          {CONDITIONS[r.condition]?.label||r.condition}
                        </span>
                        {r.surface && <span style={{ fontSize:12, fontWeight:500, color:'#1a3a5c' }}>{SURFACES[r.surface]||r.surface}</span>}
                        {r.procedure && <span style={{ fontSize:12, color:'#6b8f7e' }}>· {r.procedure}</span>}
                        {r.diagnosis && <span style={{ fontSize:11, color:'#8aab9a', fontStyle:'italic' }}>{r.diagnosis}</span>}
                      </div>
                      <button onClick={() => deleteRecord(r.id)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#ccc', lineHeight:1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div>
                  <label style={lbl}>Pieza</label>
                  <select style={inp} value={selected||''} onChange={e => setSelected(parseInt(e.target.value)||null)}>
                    <option value="">Seleccionar...</option>
                    {FDI_TOP.concat(FDI_BOT).map(n => <option key={n} value={n}>{n} — {ttype(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Superficie</label>
                  <select style={inp} value={form.cara} onChange={e => setForm(p=>({...p,cara:e.target.value}))}>
                    {Object.entries(SURFACES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Especialidad</label>
                  <select style={inp} value={form.specialty} onChange={e => setForm(p=>({...p,specialty:e.target.value,cond:'',dx:'',proc:''}))}>
                    {Object.keys(DX_OPTIONS).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Condición</label>
                  <select style={inp} value={form.cond} onChange={e => setForm(p=>({...p,cond:e.target.value}))}>
                    <option value="">Seleccionar...</option>
                    {(CONDITIONS_BY_SPECIALTY[form.specialty]||Object.keys(CONDITIONS)).map(k => (
                      <option key={k} value={k}>{CONDITIONS[k]?.label||k}</option>
                    ))}
                  </select>
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Diagnóstico</label>
                  <select style={inp} value={form.dx} onChange={e => setForm(p=>({...p,dx:e.target.value}))}>
                    <option value="">Seleccionar diagnóstico...</option>
                    {(DX_OPTIONS[form.specialty]||[]).map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="__otro__">Otro...</option>
                  </select>
                  {form.dx === '__otro__' && (
                    <input type="text" style={{ ...inp, marginTop:6 }} placeholder="Escribí el diagnóstico..." onChange={e => setForm(p=>({...p,dx:e.target.value}))} />
                  )}
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={lbl}>Procedimiento</label>
                  <select style={inp} value={form.proc} onChange={e => setForm(p=>({...p,proc:e.target.value}))}>
                    <option value="">Sin procedimiento</option>
                    {Object.entries(PROC_OPTIONS).map(([cat, procs]) => (
                      <optgroup key={cat} label={cat}>
                        {procs.map(pr => <option key={pr} value={pr}>{pr}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#1a3a5c' }}>
                  <input type="checkbox" checked={form.ausente} onChange={e => setForm(p=>({...p,ausente:e.target.checked}))} style={{ width:'auto', cursor:'pointer' }} />
                  Marcar como ausente
                </label>
                <button onClick={saveRecord} disabled={saving||!selected}
                  style={{ background:COLOR, color:'#fff', border:'none', borderRadius:9, padding:'9px 22px', fontSize:13, fontWeight:600, cursor:'pointer', opacity:!selected?0.5:1 }}>
                  {saving ? 'Guardando...' : 'Agregar registro'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'diagnosticos' && (
        <div style={{ background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#1a3a5c', marginBottom:12 }}>Diagnósticos activos</div>
          {diagnoses.length === 0
            ? <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin diagnósticos registrados.</div>
            : diagnoses.map(d => (
              <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f5f3' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ background:'#e8f5ef', color:'#0F6E56', fontSize:11, borderRadius:4, padding:'2px 7px', fontWeight:700 }}>{d.cie10_code}</span>
                    <span style={{ fontWeight:600, color:'#1a3a5c', fontSize:13 }}>{d.cie10_description}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#8aab9a', marginTop:3 }}>{d.diagnosis_date}</div>
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}
