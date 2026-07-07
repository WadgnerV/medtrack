import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'
const CATEGORIES = ['Medicamento', 'Producto estético', 'Insumo', 'Equipo']
const inp = { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

export default function CatalogoModal({ profile, onClose }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('inventory_catalog')
      .select('*').eq('clinic_id', profile.clinic_id).order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function remove(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" del catálogo? El SKU ${item.sku} quedará disponible.`)) return
    await supabase.from('inventory_catalog').delete().eq('id', item.id)
    setItems(p => p.filter(x => x.id !== item.id))
  }

  async function saveEdit(id) {
    if (!editName.trim()) return
    await supabase.from('inventory_catalog').update({ name: editName }).eq('id', id)
    setItems(p => p.map(x => x.id === id ? { ...x, name: editName } : x))
    setEditingId(null)
  }

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.sku?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const catColor = { 'Medicamento':'#E6F1FB', 'Insumo':'#E1F5EE', 'Producto estético':'#FBEAF0', 'Equipo':'#FAEEDA' }
  const catText = { 'Medicamento':'#185FA5', 'Insumo':'#0F6E56', 'Producto estético':'#72243E', 'Equipo':'#633806' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:700, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:BLUE }}>Catálogo de ítems</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:14 }}>
          <div style={{ position:'relative', flex:1 }}>
            <i className="ti ti-search" style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#bbb' }} aria-hidden="true"></i>
            <input value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inp, paddingLeft:30 }} placeholder="Buscar por nombre o SKU..." />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            style={{ ...inp, width:'auto', paddingLeft:10 }}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay ítems en el catálogo</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {filtered.map(item => (
              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10 }}>
                <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background: catColor[item.category]||'#f0f0f0', color: catText[item.category]||'#555', whiteSpace:'nowrap' }}>
                  {item.sku}
                </span>
                {editingId === item.id ? (
                  <>
                    <input style={{ ...inp, flex:1 }} value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.id); if (e.key === 'Escape') setEditingId(null) }} autoFocus />
                    <button onClick={() => saveEdit(item.id)} style={{ background:G, color:'#fff', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12 }}>Guardar</button>
                    <button onClick={() => setEditingId(null)} style={{ background:'none', border:'0.5px solid #e0e0e0', borderRadius:6, padding:'4px 10px', cursor:'pointer', fontSize:12, color:'#666' }}>Cancelar</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex:1, fontSize:13, color:'#1a1a1a' }}>{item.name}</span>
                    <span style={{ fontSize:11, color:'#aaa' }}>{item.category}</span>
                    <button onClick={() => { setEditingId(item.id); setEditName(item.name) }}
                      style={{ border:'0.5px solid #e2ede9', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>
                      Editar
                    </button>
                    <button onClick={() => remove(item)}
                      style={{ border:'0.5px solid #fde0e0', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>
                      Eliminar
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
          <span style={{ fontSize:12, color:'#aaa' }}>{filtered.length} ítem{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={onClose} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}
