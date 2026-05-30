import { useState } from 'react'

const LAB_DATA = {
  'Hematología': [
    'Hemograma completo', 'Velocidad de sedimentación', 'Frotis de sangre periférica',
    'Reticulocitos', 'Tiempo de protrombina', 'INR', 'Tiempo parcial de tromboplastina'
  ],
  'Química sanguínea': [
    'Glucosa en ayunas', 'Glucosa postprandial', 'HbA1c', 'Creatinina', 'BUN',
    'Ácido úrico', 'Colesterol total', 'HDL', 'LDL', 'Triglicéridos',
    'ALT', 'AST', 'Bilirrubinas totales', 'Fosfatasa alcalina', 'GGT',
    'Proteínas totales', 'Albúmina', 'LDH', 'CPK'
  ],
  'Hormonales': [
    'FSH', 'LH', 'Estradiol', 'Progesterona', 'Testosterona total',
    'Testosterona libre', 'Prolactina', 'DHEA-S', 'Cortisol matutino',
    'Insulina en ayunas', 'Péptido C', 'IGF-1'
  ],
  'Tiroides': [
    'TSH', 'T3 libre', 'T4 libre', 'T3 total', 'T4 total',
    'Anti-TPO', 'Anti-tiroglobulina', 'Tiroglobulina'
  ],
  'Electrolitos': [
    'Sodio', 'Potasio', 'Cloro', 'Calcio', 'Fósforo', 'Magnesio', 'Bicarbonato'
  ],
  'Orina': [
    'Uroanálisis completo', 'Urocultivo', 'Proteínas en orina 24h',
    'Creatinina en orina', 'Microalbuminuria'
  ],
  'Heces': [
    'Examen general de heces', 'Coprocultivo', 'Parásitos en heces',
    'Sangre oculta en heces', 'Calprotectina fecal', 'H. pylori en heces'
  ],
  'Embarazo': [
    'Beta HCG cuantitativa', 'Beta HCG cualitativa', 'Prueba de tolerancia a la glucosa'
  ],
  'Inmunología': [
    'ANA', 'Anti-DNA', 'Factor reumatoide', 'Anti-CCP',
    'Complemento C3', 'Complemento C4', 'ANCA', 'Inmunoglobulinas IgG/IgA/IgM'
  ],
  'Reumático': [
    'PCR ultrasensible', 'VSG', 'Ácido úrico', 'HLA-B27'
  ],
  'Marcadores tumorales': [
    'PSA', 'CEA', 'CA 125', 'CA 19-9', 'AFP', 'CA 15-3', 'Beta-2 microglobulina'
  ],
  'Hepatitis': [
    'HBsAg', 'Anti-HBs', 'Anti-HBc total', 'Anti-VHC', 'Anti-VHA IgM'
  ],
  'Bacteriología': [
    'Hemocultivo', 'Cultivo de secreción', 'VDRL', 'FTA-ABS', 'VIH', 'HTLV'
  ],
  'Drogas de abuso': [
    'Cocaína', 'Marihuana', 'Anfetaminas', 'Opioides', 'Benzodiacepinas', 'Panel completo de drogas'
  ],
  'Medicamentos': [
    'Nivel de digoxina', 'Nivel de fenitoína', 'Nivel de valproato',
    'Nivel de litio', 'Nivel de ciclosporina'
  ],
  'Celiaquía': [
    'Anti-transglutaminasa IgA', 'Anti-gliadina IgA', 'IgA total'
  ],
  'Osteoporosis': [
    'Calcio sérico', 'Vitamina D 25-OH', 'PTH', 'Marcadores de remodelado óseo'
  ],
}

export default function LabStudiesForm({ value, onChange, color }) {
  const [selected, setSelected] = useState(() => {
    if (!value) return []
    return value.split('\n').filter(Boolean).map((l, i) => ({ id: i, text: l.replace('• ', '') }))
  })
  const [openCategory, setOpenCategory] = useState(null)
  const [otherTexts, setOtherTexts] = useState({})

  function updateParent(list) {
    onChange(list.map(r => `• ${r.text}`).join('\n'))
  }

  function toggleItem(text) {
    const exists = selected.find(s => s.text === text)
    let newList
    if (exists) {
      newList = selected.filter(s => s.text !== text)
    } else {
      newList = [...selected, { id: Date.now(), text }]
    }
    setSelected(newList)
    updateParent(newList)
  }

  function addOther(cat) {
    const text = otherTexts[cat]?.trim()
    if (!text) return
    const newList = [...selected, { id: Date.now(), text }]
    setSelected(newList)
    updateParent(newList)
    setOtherTexts(p => ({ ...p, [cat]: '' }))
  }

  function removeItem(id) {
    const newList = selected.filter(s => s.id !== id)
    setSelected(newList)
    updateParent(newList)
  }

  const inp = { padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', background:'#fff', boxSizing:'border-box' }

  return (
    <div>
      {/* Items seleccionados */}
      {selected.length > 0 && (
        <div style={{ marginBottom:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
          {selected.map(item => (
            <div key={item.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f0f7f4', border:`1px solid ${color}30`, borderRadius:8, padding:'5px 10px', gap:6 }}>
              <div style={{ fontSize:12, color:'#333' }}>• {item.text}</div>
              <button onClick={() => removeItem(item.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:14, flexShrink:0 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Categorías en dos columnas */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {Object.entries(LAB_DATA).map(([cat, items]) => (
          <div key={cat}>
            <button onClick={() => setOpenCategory(openCategory === cat ? null : cat)}
              style={{ width:'100%', padding:'7px 12px', background: openCategory === cat ? color : '#f7fafc', color: openCategory === cat ? '#fff' : '#444', border:`1px solid ${openCategory === cat ? color : '#e2e8f0'}`, borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500, textAlign:'left', display:'flex', justifyContent:'space-between' }}>
              {cat}
              <span style={{ fontSize:10, color: openCategory === cat ? '#fff' : '#999' }}>
                {selected.filter(s => items.includes(s.text)).length > 0 ? `✓${selected.filter(s => items.includes(s.text)).length}` : '▼'}
              </span>
            </button>

            {openCategory === cat && (
              <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:10, marginTop:4 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
                  {items.map(item => (
                    <button key={item} onClick={() => toggleItem(item)}
                      style={{ padding:'5px 10px', background: selected.some(s => s.text === item) ? color+'15' : '#f7fafc', border:`1px solid ${selected.some(s => s.text === item) ? color : '#e2e8f0'}`, borderRadius:6, cursor:'pointer', fontSize:11, textAlign:'left', color: selected.some(s => s.text === item) ? color : '#333', fontWeight: selected.some(s => s.text === item) ? 600 : 400 }}>
                      {selected.some(s => s.text === item) ? '✓ ' : '+ '}{item}
                    </button>
                  ))}
                </div>
                {/* Otro */}
                <div style={{ display:'flex', gap:6 }}>
                  <input value={otherTexts[cat] || ''} onChange={e => setOtherTexts(p => ({ ...p, [cat]: e.target.value }))}
                    placeholder="Otro estudio..." style={{ ...inp, flex:1 }} />
                  <button onClick={() => addOther(cat)} disabled={!otherTexts[cat]}
                    style={{ padding:'5px 12px', background:color, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontSize:11, opacity:!otherTexts[cat]?0.5:1 }}>
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
