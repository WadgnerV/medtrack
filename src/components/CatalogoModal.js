import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'
const CATEGORIES = ['Medicamento', 'Producto estético', 'Insumo', 'Equipo']
const UNITS = ['unidad', 'caja', 'frasco', 'ampolla', 'sobre', 'tubo', 'litro', 'ml', 'gramo', 'kg', 'mg']
const inp = { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

export default function CatalogoModal({ profile, onClose }) {
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load(); loadWarehouses() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('inventory_items')
      .select('*').eq('clinic_id', profile.clinic_id).order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  async function loadWarehouses() {
    const { data } = await supabase.from('warehouses').select('*').eq('clinic_id', profile.clinic_id).order('name')
    setWarehouses(data || [])
  }

  async function remove(item) {
    if (!window.confirm(`¿Eliminar "${item.name}" del inventario? Esta acción eliminará también el historial y no se puede deshacer.`)) return
    // Eliminar en cascada: supplies, historial, catálogo e ítem
    await supabase.from('clinical_note_supplies').delete().eq('item_id', item.id)
    await supabase.from('inventory_history').delete().eq('item_id', item.id)
    await supabase.from('purchase_order_items').delete().eq('item_id', item.id)
    await supabase.from('inventory_catalog').delete().eq('clinic_id', profile.clinic_id).eq('name', item.name)
    await supabase.from('inventory_items').delete().eq('id', item.id)
    setItems(p => p.filter(x => x.id !== item.id))
    onClose()
  }

  async function uploadImage(file, itemId) {
    const ext = file.name.split('.').pop()
    const path = `${profile.clinic_id}/${itemId}.${ext}`
    const { error } = await supabase.storage.from('inventory-images').upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from('inventory-images').getPublicUrl(path)
    return data.publicUrl
  }

  async function saveEdit() {
    if (!editing?.name) return
    setSaving(true)
    let image_url = editing.image_url || null
    if (editing._imageFile) {
      const url = await uploadImage(editing._imageFile, editing.id)
      if (url) image_url = url
    }
    if (editing._removeImage) image_url = null

    await supabase.from('inventory_items').update({
      name: editing.name,
      category: editing.category,
      unit: editing.unit,
      cost: editing.cost ? parseFloat(editing.cost) : null,
      currency: editing.currency,
      sale_price: editing.sale_price ? parseFloat(editing.sale_price) : null,
      supplier: editing.supplier || null,
      lot: editing.lot || null,
      expiry_date: editing.expiry_date || null,
      location: editing.location || null,
      description: editing.description || null,
      image_url,
      updated_at: new Date().toISOString(),
    }).eq('id', editing.id)
    await load()
    setEditing(null)
    setSaving(false)
  }

  const f = k => e => setEditing(p => ({ ...p, [k]: e.target.value }))

  const filtered = items.filter(i => {
    if (filterCat && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.sku||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const catColor = { 'Medicamento':'#E6F1FB', 'Insumo':'#E1F5EE', 'Producto estético':'#FBEAF0', 'Equipo':'#FAEEDA' }
  const catText = { 'Medicamento':'#185FA5', 'Insumo':'#0F6E56', 'Producto estético':'#72243E', 'Equipo':'#633806' }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth: editing ? 700 : 700, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:BLUE }}>{editing ? `Editar — ${editing.name}` : 'Catálogo de ítems'}</div>
          <button onClick={() => editing ? setEditing(null) : onClose()} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>

        {editing ? (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Nombre</label>
                <input style={inp} value={editing.name} onChange={f('name')} />
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={editing.category} onChange={f('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Unidad</label>
                <select style={inp} value={editing.unit} onChange={f('unit')}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Costo unitario</label>
                <input style={inp} type="number" min="0" value={editing.cost||''} onChange={f('cost')} />
              </div>
              <div>
                <label style={lbl}>Moneda</label>
                <select style={inp} value={editing.currency||'CRC'} onChange={f('currency')}>
                  <option value="CRC">Colones (₡)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Precio de venta</label>
                <input style={inp} type="number" min="0" value={editing.sale_price||''} onChange={f('sale_price')} />
              </div>
              <div>
                <label style={lbl}>Bodega</label>
                <select style={inp} value={editing.location||''} onChange={f('location')}>
                  <option value="">Sin asignar</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:10 }}>
              <div>
                <label style={lbl}>Proveedor</label>
                <input style={inp} value={editing.supplier||''} onChange={f('supplier')} />
              </div>
              <div>
                <label style={lbl}>Lote</label>
                <input style={inp} value={editing.lot||''} onChange={f('lot')} />
              </div>
              <div>
                <label style={lbl}>Fecha de vencimiento</label>
                <input style={inp} type="date" value={editing.expiry_date||''} onChange={f('expiry_date')} />
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Descripción</label>
              <input style={inp} value={editing.description||''} onChange={f('description')} />
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Imagen del ítem</label>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {(editing.image_url && !editing._removeImage) ? (
                  <div style={{ position:'relative' }}>
                    <img src={editing._previewUrl || editing.image_url} alt={editing.name}
                      style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'0.5px solid #e2ede9' }} />
                    <button onClick={() => setEditing(p => ({ ...p, _removeImage:true, _imageFile:null, _previewUrl:null }))}
                      style={{ position:'absolute', top:-6, right:-6, background:'#D85A30', color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', fontSize:12, lineHeight:'18px', textAlign:'center' }}>×</button>
                  </div>
                ) : editing._previewUrl ? (
                  <div style={{ position:'relative' }}>
                    <img src={editing._previewUrl} alt="preview"
                      style={{ width:80, height:80, objectFit:'cover', borderRadius:8, border:'0.5px solid #e2ede9' }} />
                    <button onClick={() => setEditing(p => ({ ...p, _imageFile:null, _previewUrl:null }))}
                      style={{ position:'absolute', top:-6, right:-6, background:'#D85A30', color:'#fff', border:'none', borderRadius:'50%', width:18, height:18, cursor:'pointer', fontSize:12, lineHeight:'18px', textAlign:'center' }}>×</button>
                  </div>
                ) : (
                  <div style={{ width:80, height:80, borderRadius:8, border:'1px dashed #e2ede9', display:'flex', alignItems:'center', justifyContent:'center', color:'#ccc' }}>
                    <i className="ti ti-photo" style={{ fontSize:24 }} aria-hidden="true"></i>
                  </div>
                )}
                <label style={{ padding:'6px 12px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:12, color:'var(--clinic-primary, #0F6E56)', fontWeight:500 }}>
                  {editing.image_url || editing._previewUrl ? 'Cambiar imagen' : 'Agregar imagen'}
                  <input type="file" accept="image/*" style={{ display:'none' }}
                    onChange={e => {
                      const file = e.target.files[0]
                      if (!file) return
                      const url = URL.createObjectURL(file)
                      setEditing(p => ({ ...p, _imageFile: file, _previewUrl: url, _removeImage: false }))
                    }} />
                </label>
              </div>
            </div>
            <div style={{ padding:'10px 14px', background:'#FFF8E1', border:'1px solid #F59E0B', borderRadius:8, marginBottom:16, fontSize:12, color:'#854F0B' }}>
              Para modificar el stock actual usá el botón <strong>Ajuste</strong> en la tabla de inventario.
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setEditing(null)} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>Cancelar</button>
              <button onClick={saveEdit} disabled={saving || !editing.name}
                style={{ background:'var(--clinic-primary, #0F6E56)', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving||!editing.name?0.5:1 }}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        ) : (
          <>
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
              <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay ítems registrados</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {filtered.map(item => (
                  <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10 }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background: catColor[item.category]||'#f0f0f0', color: catText[item.category]||'#555', whiteSpace:'nowrap' }}>
                      {item.sku || '—'}
                    </span>
                    {item.image_url && <img src={item.image_url} alt={item.name} style={{ width:32, height:32, objectFit:'cover', borderRadius:6, flexShrink:0 }} />}
                  <span style={{ flex:1, fontSize:13, color:'#1a1a1a' }}>{item.name}</span>
                    <span style={{ fontSize:11, color:'#aaa' }}>{item.quantity} {item.unit}</span>
                    <button onClick={() => setEditing({ ...item, cost: String(item.cost||''), sale_price: String(item.sale_price||''), expiry_date: item.expiry_date||'' })}
                      style={{ border:'0.5px solid #e2ede9', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>
                      Editar
                    </button>
                    <button onClick={() => remove(item)}
                      style={{ border:'0.5px solid #fde0e0', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
              <span style={{ fontSize:12, color:'#aaa' }}>{filtered.length} ítem{filtered.length !== 1 ? 's' : ''}</span>
              <button onClick={onClose} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
