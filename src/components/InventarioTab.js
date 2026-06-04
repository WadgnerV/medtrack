import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = ['Medicamento', 'Producto estético', 'Insumo', 'Equipo']
const UNITS = ['unidad', 'caja', 'frasco', 'ampolla', 'sobre', 'tubo', 'litro', 'ml', 'gramo', 'kg']
const G = '#1D9E75'
const BLUE = '#1a3a5c'

async function fetchExchangeRate() {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=CRC')
    const data = await res.json()
    if (data?.rates?.CRC) return parseFloat(data.rates.CRC)
  } catch {}
  return 517
}

export default function InventarioTab({ profile, branches, isClinicAdmin }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterBranch, setFilterBranch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [exchangeRate, setExchangeRate] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)
  const [history, setHistory] = useState([])
  const emptyForm = { name:'', category:'Medicamento', unit:'unidad', quantity:'', min_quantity:'', description:'', cost:'', currency:'CRC', branch_id: profile?.branch_id || '' }
  const [form, setForm] = useState(emptyForm)
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  useEffect(() => { loadItems() }, [])
  useEffect(() => { fetchExchangeRate().then(r => { if (r) setExchangeRate(r) }) }, [])

  async function loadItems() {
    setLoading(true)
    let q = supabase.from('inventory_items').select('*').eq('clinic_id', profile.clinic_id).order('name')
    if (!isClinicAdmin && profile.branch_id) q = q.eq('branch_id', profile.branch_id)
    const { data } = await q
    setItems(data || [])
    setLoading(false)
  }

  async function loadHistory(itemId) {
    const { data } = await supabase.from('inventory_history').select('*, recorded_by:recorded_by(first_name, last_name)').eq('item_id', itemId).order('created_at', { ascending: false })
    setHistory(data || [])
  }

  async function handleSave() {
    if (!form.name || !form.quantity) { alert('Nombre y cantidad son obligatorios'); return }
    setSaving(true)
    const rate = exchangeRate || 517
    const costInColones = form.cost ? (form.currency === 'USD' ? parseFloat(form.cost) * rate : parseFloat(form.cost)) : null
    const payload = {
      clinic_id: profile.clinic_id,
      branch_id: form.branch_id || null,
      name: form.name,
      category: form.category,
      unit: form.unit,
      quantity: parseFloat(form.quantity),
      min_quantity: form.min_quantity ? parseFloat(form.min_quantity) : 0,
      description: form.description || null,
      cost: form.cost ? parseFloat(form.cost) : null,
      currency: form.currency,
      exchange_rate: form.currency === 'USD' ? exchangeRate : null,
      cost_in_colones: costInColones,
      updated_at: new Date().toISOString(),
    }
    if (modal === 'edit') {
      const old = items.find(i => i.id === form.id)
      await supabase.from('inventory_items').update(payload).eq('id', form.id)
      if (old && old.quantity !== parseFloat(form.quantity)) {
        await supabase.from('inventory_history').insert({ item_id: form.id, clinic_id: profile.clinic_id, branch_id: form.branch_id || null, quantity_before: old.quantity, quantity_after: parseFloat(form.quantity), change_type: 'update', recorded_by: profile.id })
      }
    } else {
      const { data } = await supabase.from('inventory_items').insert(payload).select().single()
      if (data) await supabase.from('inventory_history').insert({ item_id: data.id, clinic_id: profile.clinic_id, branch_id: form.branch_id || null, quantity_before: 0, quantity_after: parseFloat(form.quantity), change_type: 'initial', recorded_by: profile.id })
    }
    await loadItems()
    setModal(null)
    setForm(emptyForm)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este ítem del inventario?')) return
    await supabase.from('inventory_items').delete().eq('id', id)
    setItems(i => i.filter(x => x.id !== id))
  }

  const filtered = items.filter(i => {
    if (filterBranch && i.branch_id !== filterBranch) return false
    if (filterCat && i.category !== filterCat) return false
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalValue = filtered.reduce((sum, i) => sum + (i.cost_in_colones || 0) * i.quantity, 0)
  const lowStock = filtered.filter(i => i.min_quantity > 0 && i.quantity <= i.min_quantity).length

  const s = {
    card: { background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 },
    btn: { background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer' },
    btnSm: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    btnDel: { background:'none', border:'1px solid #fde0e0', borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', color:'#d9534f' },
    label: { fontSize:12, fontWeight:500, color:'#555', marginBottom:4, display:'block' },
    input: { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 },
    select: { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:12 },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
    modalBox: { background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:500, maxHeight:'90vh', overflowY:'auto' },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, fontSize:12, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', fontSize:13, color:'#333', verticalAlign:'middle' },
  }

  return (
    <div>
      {/* Métricas */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12, marginBottom:14 }}>
        <div style={{ ...s.card, marginBottom:0 }}>
          <div style={{ fontSize:11, color:'#999', marginBottom:4 }}>Total ítems</div>
          <div style={{ fontSize:20, fontWeight:500, color:'#1a1a1a' }}>{filtered.length}</div>
        </div>
        <div style={{ ...s.card, marginBottom:0, borderColor: lowStock > 0 ? '#fde0e0' : '#eee' }}>
          <div style={{ fontSize:11, color: lowStock > 0 ? '#d9534f' : '#999', marginBottom:4 }}>Stock bajo</div>
          <div style={{ fontSize:20, fontWeight:500, color: lowStock > 0 ? '#d9534f' : '#1a1a1a' }}>{lowStock}</div>
        </div>
        <div style={{ ...s.card, marginBottom:0 }}>
          <div style={{ fontSize:11, color:'#999', marginBottom:4 }}>Valor total (₡)</div>
          <div style={{ fontSize:18, fontWeight:500, color:'#1a1a1a' }}>₡{totalValue.toLocaleString('es-CR', { maximumFractionDigits:0 })}</div>
        </div>
        <div style={{ ...s.card, marginBottom:0 }}>
          <div style={{ fontSize:11, color:'#999', marginBottom:4 }}>Tipo de cambio</div>
          <div style={{ fontSize:18, fontWeight:500, color:'#1a1a1a' }}>{exchangeRate ? `₡${exchangeRate.toLocaleString('es-CR', { maximumFractionDigits:0 })}` : 'Cargando...'}</div>
          <div style={{ fontSize:11, color:'#999', marginTop:2 }}>por $1 · hoy</div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, minWidth:180 }}>
          <i className="ti ti-search" style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:14, color:'#bbb' }} aria-hidden="true"></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar ítem..."
            style={{ width:'100%', padding:'7px 10px 7px 30px', fontSize:13, border:'0.5px solid #eee', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        {isClinicAdmin && branches.length > 0 && (
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            style={{ padding:'7px 10px', fontSize:13, border:'0.5px solid #eee', borderRadius:8, outline:'none', fontFamily:'inherit' }}>
            <option value="">Todas las sucursales</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ padding:'7px 10px', fontSize:13, border:'0.5px solid #eee', borderRadius:8, outline:'none', fontFamily:'inherit' }}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button style={s.btn} onClick={() => { setForm({...emptyForm, branch_id: profile?.branch_id || ''}); setModal('new') }}>+ Agregar ítem</button>
      </div>

      {/* Tabla */}
      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={s.th}>Ítem</th>
              <th style={s.th}>Categoría</th>
              <th style={s.th}>Cantidad</th>
              <th style={s.th}>Costo unit.</th>
              <th style={s.th}>Valor total</th>
              <th style={s.th}>Actualizado</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ ...s.td, textAlign:'center', color:'#bbb' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ ...s.td, textAlign:'center', color:'#bbb', padding:30 }}>No hay ítems registrados</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id}>
                <td style={s.td}>
                  <div style={{ fontWeight:500, color:'#1a1a1a' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{item.description}</div>}
                  {item.min_quantity > 0 && item.quantity <= item.min_quantity && (
                    <span style={{ fontSize:10, background:'#fde0e0', color:'#d9534f', padding:'1px 6px', borderRadius:20, marginTop:3, display:'inline-block' }}>Stock bajo</span>
                  )}
                </td>
                <td style={s.td}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{item.category}</span></td>
                <td style={s.td}>{item.quantity} {item.unit}</td>
                <td style={s.td}>{item.cost ? `${item.currency === 'USD' ? '$' : '₡'}${parseFloat(item.cost).toLocaleString('es-CR')}` : '—'}</td>
                <td style={s.td}>{item.cost_in_colones ? `₡${(item.cost_in_colones * item.quantity).toLocaleString('es-CR', { maximumFractionDigits:0 })}` : '—'}</td>
                <td style={s.td}>{new Date(item.updated_at).toLocaleDateString('es-CR')}</td>
                <td style={s.td}>
                  <button style={s.btnSm} onClick={() => { loadHistory(item.id); setHistoryItem(item); setModal('history') }}>Historial</button>
                  <button style={s.btnSm} onClick={() => { setForm({...item, quantity: String(item.quantity), min_quantity: String(item.min_quantity||''), cost: String(item.cost||'')}); setModal('edit') }}>Editar</button>
                  <button style={s.btnDel} onClick={() => handleDelete(item.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal nuevo/editar */}
      {(modal === 'new' || modal === 'edit') && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) { setModal(null); setForm(emptyForm) } }}>
          <div style={s.modalBox}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:18, color:'#1a1a1a' }}>{modal === 'edit' ? 'Editar ítem' : 'Nuevo ítem de inventario'}</div>
            <label style={s.label}>Nombre *</label>
            <input style={s.input} value={form.name} onChange={f('name')} placeholder="Ej: Toxina botulínica 100U" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={s.label}>Categoría</label>
                <select style={s.select} value={form.category} onChange={f('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Unidad</label>
                <select style={s.select} value={form.unit} onChange={f('unit')}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Cantidad *</label>
                <input style={s.input} type="number" min="0" value={form.quantity} onChange={f('quantity')} placeholder="0" />
              </div>
              <div>
                <label style={s.label}>Cantidad mínima (alerta)</label>
                <input style={s.input} type="number" min="0" value={form.min_quantity} onChange={f('min_quantity')} placeholder="0" />
              </div>
            </div>
            <label style={s.label}>Descripción</label>
            <input style={s.input} value={form.description} onChange={f('description')} placeholder="Opcional" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <label style={s.label}>Costo unitario</label>
                <input style={s.input} type="number" min="0" value={form.cost} onChange={f('cost')} placeholder="0" />
              </div>
              <div>
                <label style={s.label}>Moneda</label>
                <select style={s.select} value={form.currency} onChange={f('currency')}>
                  <option value="CRC">Colones (₡)</option>
                  <option value="USD">Dólares ($)</option>
                </select>
              </div>
            </div>
            {form.currency === 'USD' && (
              <div style={{ background:'#f8fffe', border:'1px solid #E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12, color:'#555' }}>
                {exchangeRate ? `Tipo de cambio BCCR: ₡${exchangeRate.toLocaleString('es-CR')} por $1` : 'Obteniendo tipo de cambio del BCCR...'}
              </div>
            )}
            {isClinicAdmin && branches.length > 0 && (
              <>
                <label style={s.label}>Sucursal</label>
                <select style={s.select} value={form.branch_id} onChange={f('branch_id')}>
                  <option value="">Sin sucursal específica</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button style={{ ...s.btnSm, padding:'7px 14px' }} onClick={() => { setModal(null); setForm(emptyForm) }}>Cancelar</button>
              <button style={{ ...s.btn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial */}
      {modal === 'history' && historyItem && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={s.modalBox}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:4, color:'#1a1a1a' }}>Historial — {historyItem.name}</div>
            <div style={{ fontSize:12, color:'#999', marginBottom:16 }}>Registro de cambios de stock</div>
            {history.length === 0 ? (
              <div style={{ textAlign:'center', color:'#bbb', padding:20 }}>Sin historial registrado</div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr>
                    <th style={s.th}>Fecha</th>
                    <th style={s.th}>Antes</th>
                    <th style={s.th}>Después</th>
                    <th style={s.th}>Tipo</th>
                    <th style={s.th}>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td style={s.td}>{new Date(h.created_at).toLocaleDateString('es-CR')}</td>
                      <td style={s.td}>{h.quantity_before}</td>
                      <td style={s.td}>{h.quantity_after}</td>
                      <td style={s.td}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{h.change_type === 'initial' ? 'Ingreso inicial' : 'Actualización'}</span></td>
                      <td style={s.td}>{h.recorded_by ? `${h.recorded_by.first_name} ${h.recorded_by.last_name}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button style={{ ...s.btnSm, padding:'7px 14px' }} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
