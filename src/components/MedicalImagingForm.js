import { useState } from 'react'

const IMAGING_DATA = {
  'Radiografías': {
    sites: [
      { name: 'Tórax', incidences: ['AP', 'PA', 'Lateral', 'Inspirada', 'Espirada'] },
      { name: 'Columna cervical', incidences: ['AP', 'Lateral', 'Oblicua derecha', 'Oblicua izquierda', 'Flexión', 'Extensión'] },
      { name: 'Columna torácica', incidences: ['AP', 'Lateral'] },
      { name: 'Columna lumbar', incidences: ['AP', 'Lateral', 'Oblicua derecha', 'Oblicua izquierda', 'Flexión', 'Extensión'] },
      { name: 'Columna lumbosacra', incidences: ['AP', 'Lateral'] },
      { name: 'Pelvis', incidences: ['AP'] },
      { name: 'Cadera', incidences: ['AP', 'Lateral'] },
      { name: 'Rodilla', incidences: ['AP', 'Lateral', 'Tangencial rótula'] },
      { name: 'Tobillo', incidences: ['AP', 'Lateral', 'Oblicua'] },
      { name: 'Pie', incidences: ['AP', 'Lateral', 'Oblicua'] },
      { name: 'Mano', incidences: ['AP', 'Lateral', 'Oblicua'] },
      { name: 'Muñeca', incidences: ['AP', 'Lateral', 'Oblicua'] },
      { name: 'Hombro', incidences: ['AP', 'Transtorácica', 'Axilar'] },
      { name: 'Codo', incidences: ['AP', 'Lateral'] },
      { name: 'Abdomen', incidences: ['Simple', 'Decúbito lateral', 'De pie'] },
      { name: 'Cráneo', incidences: ['AP', 'Lateral', 'Waters', 'Towne'] },
      { name: 'Senos paranasales', incidences: ['Waters', 'Caldwell', 'Lateral'] },
    ]
  },
  'Ultrasonidos': {
    items: ['Abdomen superior', 'Abdomen inferior', 'Abdomen total', 'Pélvico', 'Obstétrico', 'Tiroideo', 'Mamario', 'Renal', 'Testicular', 'Doppler venoso miembros superiores', 'Doppler venoso miembros inferiores', 'Doppler arterial miembros superiores', 'Doppler arterial miembros inferiores']
  },
  'Tomografías': {
    items: ['TAC cráneo simple', 'TAC cráneo contrastado', 'TAC tórax simple', 'TAC tórax contrastado', 'TAC abdomen simple', 'TAC abdomen contrastado', 'TAC pelvis simple', 'TAC pelvis contrastado', 'TAC columna cervical', 'TAC columna lumbar', 'Angiotomografía coronaria', 'Angiotomografía pulmonar']
  },
  'Resonancias': {
    items: ['RMN cerebro simple', 'RMN cerebro contrastada', 'RMN columna cervical', 'RMN columna lumbar', 'RMN rodilla', 'RMN hombro', 'RMN cadera', 'RMN abdomen', 'RMN pelvis', 'Angioresonancia cerebral']
  },
  'Estudios nucleares': {
    items: ['Gammagrafía ósea', 'Gammagrafía tiroidea', 'PET scan', 'SPECT cerebral']
  },
  'Otros estudios': {
    items: ['Ecocardiograma', 'Electrocardiograma', 'Mamografía', 'Densitometría ósea', 'Endoscopía digestiva alta', 'Colonoscopía']
  }
}

export default function MedicalImagingForm({ value, onChange, color }) {
  const [selected, setSelected] = useState(() => {
    if (!value) return []
    return value.split('\n').filter(Boolean).map((l, i) => ({ id: i, text: l.replace('• ', '') }))
  })
  const [openCategory, setOpenCategory] = useState(null)
  const [selectedSite, setSelectedSite] = useState(null)
  const [selectedIncidences, setSelectedIncidences] = useState([])
  const [lateralidad, setLateralidad] = useState('')
  const [otherText, setOtherText] = useState('')
  const [showOther, setShowOther] = useState(false)

  function updateParent(list) {
    onChange(list.map(r => `• ${r.text}`).join('\n'))
  }

  function addItem(text) {
    if (!text) return
    const already = selected.find(s => s.text === text)
    if (already) return
    const newList = [...selected, { id: Date.now(), text }]
    setSelected(newList)
    updateParent(newList)
  }

  function removeItem(id) {
    const newList = selected.filter(s => s.id !== id)
    setSelected(newList)
    updateParent(newList)
  }

  function addRadiography() {
    if (!selectedSite || selectedIncidences.length === 0) return
    const lat = lateralidad ? ` (${lateralidad})` : ''
    const text = `Rx ${selectedSite}${lat} — ${selectedIncidences.join(', ')}`
    addItem(text)
    setSelectedSite(null)
    setSelectedIncidences([])
    setLateralidad('')
  }

  function toggleIncidence(inc) {
    setSelectedIncidences(prev =>
      prev.includes(inc) ? prev.filter(i => i !== inc) : [...prev, inc]
    )
  }

  const inp = { padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', background:'#fff', width:'100%', boxSizing:'border-box' }

  return (
    <div>
      {/* Items seleccionados */}
      {selected.length > 0 && (
        <div style={{ marginBottom:10 }}>
          {selected.map(item => (
            <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f0f7f4', border:`1px solid ${color}30`, borderRadius:8, padding:'6px 10px', marginBottom:5, gap:8 }}>
              <div style={{ fontSize:13, color:'#333' }}>• {item.text}</div>
              <button onClick={() => removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:16, flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Categorías */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {Object.entries(IMAGING_DATA).map(([cat, data]) => (
          <div key={cat}>
            <button onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
              style={{ width:'100%', padding:'7px 12px', background: openCategory === cat ? color : '#f7fafc', color: openCategory === cat ? '#fff' : '#444', border:`1px solid ${openCategory === cat ? color : '#e2e8f0'}`, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, textAlign:'left', display:'flex', justifyContent:'space-between' }}>
              {cat} <span>{openCategory === cat ? '▲' : '▼'}</span>
            </button>

            {openCategory === cat && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:10, marginTop:4 }}>
                {/* Radiografías con sitio + incidencias */}
                {cat === 'Radiografías' && (
                  <div>
                    <select value={selectedSite || ''} onChange={e => { setSelectedSite(e.target.value); setSelectedIncidences([]) }} style={{ ...inp, marginBottom:8 }}>
                      <option value="">Seleccionar sitio anatómico...</option>
                      {data.sites.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                    {selectedSite && (
                      <div>
                        <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>Lateralidad:</div>
                        <div style={{ display:'flex', gap:5, marginBottom:10 }}>
                          {['Derecho','Izquierdo','Ambos'].map(lat => (
                            <button key={lat} onClick={() => setLateralidad(p => p === lat ? '' : lat)}
                              style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${lateralidad === lat ? color : '#e2e8f0'}`, background: lateralidad === lat ? color : '#f7fafc', color: lateralidad === lat ? '#fff' : '#555', fontSize:11, cursor:'pointer' }}>
                              {lat}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize:11, color:'#888', marginBottom:6 }}>Incidencias:</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:8 }}>
                          {data.sites.find(s => s.name === selectedSite)?.incidences.map(inc => (
                            <button key={inc} onClick={() => toggleIncidence(inc)}
                              style={{ padding:'4px 10px', borderRadius:20, border:`1px solid ${selectedIncidences.includes(inc) ? color : '#e2e8f0'}`, background: selectedIncidences.includes(inc) ? color : '#f7fafc', color: selectedIncidences.includes(inc) ? '#fff' : '#555', fontSize:11, cursor:'pointer' }}>
                              {inc}
                            </button>
                          ))}
                        </div>
                        <button onClick={addRadiography} disabled={selectedIncidences.length === 0}
                          style={{ padding:'5px 12px', background:color, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:11, opacity:selectedIncidences.length===0?0.5:1 }}>
                          + Agregar
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Otros con lista simple */}
                {cat !== 'Radiografías' && (
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {data.items.map(item => (
                      <button key={item} onClick={() => addItem(item)}
                        disabled={selected.some(s => s.text === item)}
                        style={{ padding:'5px 10px', background: selected.some(s => s.text === item) ? '#e2e8f0' : '#f7fafc', border:'1px solid #e2e8f0', borderRadius:6, cursor: selected.some(s => s.text === item) ? 'default' : 'pointer', fontSize:11, textAlign:'left', color: selected.some(s => s.text === item) ? '#999' : '#333' }}>
                        {selected.some(s => s.text === item) ? '✓ ' : '+ '}{item}
                      </button>
                    ))}
                  </div>
                )}

                {/* Otro campo libre */}
                <div style={{ marginTop:8, display:'flex', gap:6 }}>
                  <input value={otherText} onChange={e => setOtherText(e.target.value)}
                    placeholder="Otro estudio..." style={{ ...inp, flex:1 }} />
                  <button onClick={() => { addItem(otherText); setOtherText('') }} disabled={!otherText}
                    style={{ padding:'5px 12px', background:color, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:11, opacity:!otherText?0.5:1 }}>
                    + Agregar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
