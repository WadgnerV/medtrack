import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import BodegasModal from './BodegasModal'
import CatalogoModal from './CatalogoModal'
import AjusteInventarioModal from './AjusteInventarioModal'

const CATEGORIES = ['Medicamento', 'Producto estético', 'Insumo', 'Equipo']
const UNITS = ['unidad', 'caja', 'frasco', 'ampolla', 'sobre', 'tubo', 'litro', 'ml', 'gramo', 'kg']
const G = '#1D9E75'
const BLUE = '#1a3a5c'

async function exportInventarioXLSX(items, history, exchangeRate) {
  const XLSX = await import('xlsx')
  const today = new Date().toISOString().split('T')[0]

  // Calcular movimiento del día por item
  const todayHistory = history.filter(h => h.created_at?.startsWith(today))
  const movimientosPorItem = {}
  todayHistory.forEach(h => {
    const id = h.item_id
    const diff = h.change_amount !== undefined && h.change_amount !== null
      ? h.change_amount
      : (h.quantity_after - h.quantity_before)
    movimientosPorItem[id] = (movimientosPorItem[id] || 0) + diff
  })

  const rows = items.map(item => {
    const mov = movimientosPorItem[item.id] || 0
    const costoCRC = item.cost ? (item.currency === 'USD' ? item.cost * (exchangeRate||462) : item.cost) : 0
    return {
      'SKU': item.sku || '—',
      'Nombre': item.name,
      'Categoría': item.category,
      'Unidad': item.unit,
      'Stock actual': item.quantity,
      'Stock mínimo': item.min_quantity || 0,
      'Estado stock': item.min_quantity > 0 && item.quantity <= item.min_quantity ? 'BAJO' : 'OK',
      'Bodega': item.location || '—',
      'Proveedor': item.supplier || '—',
      'Lote': item.lot || '—',
      'Vencimiento': item.expiry_date || '—',
      'Costo unitario': item.cost || 0,
      'Moneda': item.currency || 'CRC',
      'Costo unitario (₡)': costoCRC,
      'Precio de venta': item.sale_price || 0,
      'Valor total (₡)': costoCRC * item.quantity,
      'Movimiento hoy': mov === 0 ? 0 : mov > 0 ? `+${mov}` : mov,
      'Descripción': item.description || '—',
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')

  // Ancho de columnas
  ws['!cols'] = [
    {wch:14},{wch:30},{wch:16},{wch:10},{wch:12},{wch:12},{wch:12},
    {wch:16},{wch:20},{wch:12},{wch:14},{wch:14},{wch:8},{wch:16},
    {wch:14},{wch:16},{wch:14},{wch:30}
  ]

  XLSX.writeFile(wb, `inventario_${today}.xlsx`)
}

async function fetchExchangeRate() {
  try {
    const res = await fetch('https://apis.gometa.org/tdc/tdc.json')
    const data = await res.json()
    if (data?.venta) return parseFloat(data.venta)
  } catch {}
  try {
    const res2 = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    const data2 = await res2.json()
    if (data2?.rates?.CRC) return parseFloat(data2.rates.CRC)
  } catch {}
  return 462
}

export default function InventarioTab({ profile, branches, isClinicAdmin }) {
  const [items, setItems] = useState([])
  const [allHistory, setAllHistory] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filterBranch, setFilterBranch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [search, setSearch] = useState('')
  const [exchangeRate, setExchangeRate] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)
  const [history, setHistory] = useState([])
  const [showBodegas, setShowBodegas] = useState(false)
  const [showCatalogo, setShowCatalogo] = useState(false)
  const [ajusteItem, setAjusteItem] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [showNewCatalogItem, setShowNewCatalogItem] = useState(false)
  const [newCatalogItem, setNewCatalogItem] = useState({ name:'', category:'Medicamento' })
  const [skuPrefix, setSkuPrefix] = useState('')

  const emptyForm = {
    name:'', category:'Medicamento', unit:'unidad', quantity:'', min_quantity:'',
    description:'', cost:'', currency:'CRC', branch_id: profile?.branch_id || '',
    sku:'', sale_price:'', location:'', lot:'', supplier:'', expiry_date:''
  }
  const [form, setForm] = useState(emptyForm)
  const f = k => e => setForm(p => ({...p, [k]: e.target.value}))

  useEffect(() => { loadItems(); loadWarehouses(); loadCatalog(); loadSkuPrefix() }, [])
  useEffect(() => { fetchExchangeRate().then(r => { if (r) setExchangeRate(r) }) }, [])

  async function loadSkuPrefix() {
    const { data } = await supabase.from('clinics').select('sku_prefix').eq('id', profile.clinic_id).single()
    setSkuPrefix(data?.sku_prefix || 'SKU')
  }

  async function loadCatalog() {
    const { data } = await supabase.from('inventory_catalog').select('*').eq('clinic_id', profile.clinic_id).order('name')
    setCatalog(data || [])
  }

  async function generateSku(category) {
    const prefix = skuPrefix || 'SKU'
    const catCode = { 'Medicamento':'MED', 'Insumo':'IN', 'Producto estético':'EST', 'Equipo':'EQ' }[category] || 'OTR'
    const { data } = await supabase.from('inventory_catalog').select('sku').eq('clinic_id', profile.clinic_id).eq('category', category).order('created_at', { ascending: false })
    const count = (data || []).length + 1
    return `${prefix}-${catCode}-${String(count).padStart(5, '0')}`
  }

  async function addToCatalog() {
    if (!newCatalogItem.name) return
    const sku = await generateSku(newCatalogItem.category)
    const { data } = await supabase.from('inventory_catalog').insert({
      clinic_id: profile.clinic_id,
      name: newCatalogItem.name,
      category: newCatalogItem.category,
      sku
    }).select().single()
    if (data) {
      await loadCatalog()
      setForm(p => ({ ...p, name: data.name, sku: data.sku, category: data.category }))
      setCatalogSearch(data.name)
    }
    setShowNewCatalogItem(false)
    setNewCatalogItem({ name:'', category:'Medicamento' })
    setShowCatalogDropdown(false)
  }

  async function loadWarehouses() {
    const { data } = await supabase.from('warehouses').select('*').eq('clinic_id', profile.clinic_id).order('name')
    setWarehouses(data || [])
  }

  async function loadItems() {
    setLoading(true)
    let q = supabase.from('inventory_items').select('*').eq('clinic_id', profile.clinic_id).order('name')
    if (!isClinicAdmin && profile.branch_id) q = q.eq('branch_id', profile.branch_id)
    const { data } = await q
    setItems(data || [])
    // Cargar historial del día
    const today = new Date().toISOString().split('T')[0]
    const { data: hist } = await supabase.from('inventory_history').select('*').eq('clinic_id', profile.clinic_id).gte('created_at', today + 'T00:00:00')
    setAllHistory(hist || [])
    setLoading(false)
  }

  async function loadHistory(itemId) {
    const { data } = await supabase.from('inventory_history').select('*, recorded_by:recorded_by(first_name, last_name)').eq('item_id', itemId).order('created_at', { ascending: false })
    setHistory(data || [])
  }

  async function handleSave() {
    if (!form.name || !form.quantity) { alert('Nombre y cantidad son obligatorios'); return }
    setSaving(true)
    const rate = exchangeRate || 462
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
      sku: form.sku || null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      location: form.location || null,
      lot: form.lot || null,
      supplier: form.supplier || null,
      expiry_date: form.expiry_date || null,
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
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !(i.sku||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function getItemValueInColones(item) {
    if (!item.cost) return 0
    const rate = exchangeRate || 462
    const costCRC = item.currency === 'USD' ? item.cost * rate : item.cost
    return costCRC * item.quantity
  }

  const totalValue = filtered.reduce((sum, i) => sum + getItemValueInColones(i), 0)
  const lowStock = filtered.filter(i => i.min_quantity > 0 && i.quantity <= i.min_quantity).length

  const s = {
    card: { background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'14px 16px', marginBottom:12 },
    btn: { background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer' },
    btnOutline: { background:'#fff', color:BLUE, border:`1px solid ${BLUE}`, borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer' },
    btnSm: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    btnDel: { background:'none', border:'1px solid #fde0e0', borderRadius:6, padding:'3px 10px', fontSize:12, cursor:'pointer', color:'#d9534f' },
    label: { fontSize:11, fontWeight:600, color:'#666', marginBottom:4, display:'block', textTransform:'uppercase', letterSpacing:'0.5px' },
    input: { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:10 },
    select: { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:10 },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
    modalBox: { background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:820, maxHeight:'90vh', overflowY:'auto' },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, fontSize:12, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', fontSize:13, color:'#333', verticalAlign:'middle' },
  }

  return (
    <div>
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
        <button style={s.btnOutline} onClick={() => setShowCatalogo(true)}>Catálogo</button>
        <button style={s.btnOutline} onClick={() => exportInventarioXLSX(filtered, allHistory, exchangeRate)}>
          <i className="ti ti-file-spreadsheet" style={{ fontSize:13, marginRight:4 }} aria-hidden="true"></i>
          Exportar XLSX
        </button>
        <button style={s.btnOutline} onClick={() => setShowBodegas(true)}>Bodegas</button>
        <button style={s.btn} onClick={() => { setForm({...emptyForm, branch_id: profile?.branch_id || ''}); setModal('new') }}>+ Agregar ítem</button>
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={s.th}>SKU</th>
              <th style={s.th}>Ítem</th>
              <th style={s.th}>Categoría</th>
              <th style={s.th}>Cantidad</th>
              <th style={s.th}>Proveedor</th>
              <th style={s.th}>Vencimiento</th>
              <th style={s.th}>Costo unit.</th>
              <th style={s.th}>P. venta</th>
              <th style={s.th}>Valor total</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ ...s.td, textAlign:'center', color:'#bbb' }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ ...s.td, textAlign:'center', color:'#bbb', padding:30 }}>No hay ítems registrados</td></tr>
            ) : filtered.map(item => (
              <tr key={item.id}>
                <td style={s.td}>
                  <span style={{ fontSize:11, fontWeight:600, color:'#0F6E56', background:'#E1F5EE', padding:'2px 7px', borderRadius:20 }}>{item.sku || '—'}</span>
                </td>
                <td style={s.td}>
                  <div style={{ fontWeight:500, color:'#1a1a1a' }}>{item.name}</div>
                  {item.description && <div style={{ fontSize:11, color:'#999', marginTop:1 }}>{item.description}</div>}
                  {item.location && <div style={{ fontSize:11, color:'#aaa', marginTop:1 }}>{item.location}</div>}
                  {item.min_quantity > 0 && item.quantity <= item.min_quantity && (
                    <span style={{ fontSize:10, background:'#fde0e0', color:'#d9534f', padding:'1px 6px', borderRadius:20, marginTop:3, display:'inline-block' }}>Stock bajo</span>
                  )}
                </td>
                <td style={s.td}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#f0f0f0', color:'#555' }}>{item.category}</span></td>
                <td style={s.td}>{item.quantity} {item.unit}</td>
                <td style={s.td}>{item.supplier || '—'}</td>
                <td style={s.td}>
                  {item.expiry_date ? (() => {
                    const exp = new Date(item.expiry_date + 'T12:00:00')
                    const daysLeft = Math.ceil((exp - new Date()) / (1000*60*60*24))
                    const color = daysLeft < 0 ? '#D85A30' : daysLeft < 30 ? '#BA7517' : '#555'
                    return <span style={{ color, fontSize:12 }}>{exp.toLocaleDateString('es-CR')}{daysLeft < 30 && <span style={{ marginLeft:4, fontSize:10 }}>{daysLeft < 0 ? '⚠ Vencido' : `⚠ ${daysLeft}d`}</span>}</span>
                  })() : '—'}
                </td>
                <td style={s.td}>{item.cost ? `${item.currency === 'USD' ? '$' : '₡'}${parseFloat(item.cost).toLocaleString('es-CR')}` : '—'}</td>
                <td style={s.td}>{item.sale_price ? `₡${parseFloat(item.sale_price).toLocaleString('es-CR')}` : '—'}</td>
                <td style={s.td}>{item.cost ? `₡${getItemValueInColones(item).toLocaleString('es-CR', { maximumFractionDigits:0 })}` : '—'}</td>
                <td style={s.td}>
                  <button style={s.btnSm} onClick={() => { loadHistory(item.id); setHistoryItem(item); setModal('history') }}>Historial</button>
                  <button style={s.btnSm} onClick={() => setAjusteItem(item)}>Ajuste</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) { setModal(null); setForm(emptyForm); setCatalogSearch('') } }}>
          <div style={s.modalBox}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:16, color:'#1a1a1a' }}>{modal === 'edit' ? 'Editar ítem' : 'Nuevo ítem de inventario'}</div>

            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:10 }}>
              <div style={{ position:'relative' }}>
                <label style={s.label}>Nombre *</label>
                <input style={s.input} value={catalogSearch || form.name}
                  onChange={e => {
                    setCatalogSearch(e.target.value)
                    setForm(p => ({ ...p, name: e.target.value, sku: '' }))
                    setShowCatalogDropdown(true)
                  }}
                  onFocus={() => setShowCatalogDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCatalogDropdown(false), 200)}
                />
                {showCatalogDropdown && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:8, zIndex:100, maxHeight:200, overflowY:'auto', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', marginTop:2 }}>
                    {catalog.filter(c => !catalogSearch || c.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(c => (
                      <div key={c.id} onMouseDown={() => {
                        setForm(p => ({ ...p, name: c.name, sku: c.sku, category: c.category }))
                        setCatalogSearch(c.name)
                        setShowCatalogDropdown(false)
                      }} style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, borderBottom:'0.5px solid #f0f5f3', display:'flex', justifyContent:'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background='#f4faf7'}
                        onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                        <span>{c.name}</span>
                        <span style={{ fontSize:11, color:'#aaa' }}>{c.sku}</span>
                      </div>
                    ))}
                    <div onMouseDown={() => { setShowNewCatalogItem(true); setShowCatalogDropdown(false) }}
                      style={{ padding:'8px 12px', cursor:'pointer', fontSize:12, color:'#0F6E56', fontWeight:500, borderTop:'0.5px solid #e2ede9' }}
                      onMouseEnter={e => e.currentTarget.style.background='#f4faf7'}
                      onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                      + Agregar "{catalogSearch || 'nuevo ítem'}" al catálogo
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label style={s.label}>Categoría</label>
                <select style={s.select} value={form.category} onChange={f('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>SKU</label>
                <input style={{ ...s.input, background:'#f5f5f5', color:'#888', cursor:'not-allowed' }} value={form.sku} readOnly />
              </div>
              <div>
                <label style={s.label}>Unidad</label>
                <select style={s.select} value={form.unit} onChange={f('unit')}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={s.label}>Cantidad *</label>
                <input style={s.input} type="number" min="0" value={form.quantity} onChange={f('quantity')} />
              </div>
              <div>
                <label style={s.label}>Cantidad mínima</label>
                <input style={s.input} type="number" min="0" value={form.min_quantity} onChange={f('min_quantity')} />
              </div>
              <div>
                <label style={s.label}>Costo unitario</label>
                <input style={s.input} type="number" min="0" value={form.cost} onChange={f('cost')} />
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
              <div style={{ background:'#f8fffe', border:'1px solid #E1F5EE', borderRadius:8, padding:'8px 12px', marginBottom:10, fontSize:12, color:'#555' }}>
                {exchangeRate ? `Tipo de cambio BCCR: ₡${exchangeRate.toLocaleString('es-CR')} por $1` : 'Obteniendo tipo de cambio...'}
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
              <div>
                <label style={s.label}>Proveedor</label>
                <input style={s.input} value={form.supplier} onChange={f('supplier')} />
              </div>
              <div>
                <label style={s.label}>Lote</label>
                <input style={s.input} value={form.lot} onChange={f('lot')} />
              </div>
              <div>
                <label style={s.label}>Vencimiento</label>
                <input style={s.input} type="date" value={form.expiry_date} onChange={f('expiry_date')} />
              </div>
              <div>
                <label style={s.label}>Bodega</label>
                <select style={s.select} value={form.location} onChange={f('location')}>
                  <option value="">Sin asignar</option>
                  {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr', gap:10 }}>
              <div>
                <label style={s.label}>Precio de venta</label>
                <input style={s.input} type="number" min="0" value={form.sale_price} onChange={f('sale_price')} />
              </div>
              <div>
                <label style={s.label}>Descripción</label>
                <input style={s.input} value={form.description} onChange={f('description')} />
              </div>
              {isClinicAdmin && branches.length > 0 && (
                <div>
                  <label style={s.label}>Sucursal</label>
                  <select style={s.select} value={form.branch_id} onChange={f('branch_id')}>
                    <option value="">Sin sucursal específica</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:8 }}>
              <button style={{ ...s.btnSm, padding:'7px 14px' }} onClick={() => { setModal(null); setForm(emptyForm); setCatalogSearch('') }}>Cancelar</button>
              <button style={{ ...s.btn, opacity: saving ? 0.7 : 1 }} onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {history.map(h => {
                    const esEntrada = h.change_amount > 0 || h.change_type === 'initial' || h.change_type?.startsWith('entrada')
                    const diff = h.change_amount !== undefined && h.change_amount !== null ? h.change_amount : (h.quantity_after - h.quantity_before)
                    const label = h.motivo || (h.change_type === 'initial' ? 'Ingreso inicial' : h.change_type === 'procedimiento' ? 'Procedimiento' : h.change_type === 'update' ? 'Actualización' : h.change_type || '—')
                    return (
                      <tr key={h.id}>
                        <td style={s.td}>{new Date(h.created_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })}</td>
                        <td style={s.td}>
                          <span style={{ fontSize:13, fontWeight:700, color: esEntrada?G:'#D85A30' }}>
                            {esEntrada?'+':''}{diff} {historyItem?.unit}
                          </span>
                        </td>
                        <td style={s.td}>{h.quantity_after} {historyItem?.unit}</td>
                        <td style={s.td}><span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background: esEntrada?'#E1F5EE':'#FAECE7', color: esEntrada?G:'#D85A30' }}>{label}</span></td>
                        <td style={s.td}>{h.nota && <div style={{ fontSize:11, color:'#aaa' }}>{h.nota}</div>}{h.recorded_by ? `${h.recorded_by.first_name} ${h.recorded_by.last_name}` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
              <button style={{ ...s.btnSm, padding:'7px 14px' }} onClick={() => setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showNewCatalogItem && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1100, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, width:400 }}>
            <div style={{ fontSize:14, fontWeight:600, color:'#1a3a5c', marginBottom:16 }}>Agregar al catálogo</div>
            <label style={s.label}>Nombre</label>
            <input style={s.input} value={newCatalogItem.name} onChange={e => setNewCatalogItem(p=>({...p,name:e.target.value}))} />
            <label style={s.label}>Categoría</label>
            <select style={s.select} value={newCatalogItem.category} onChange={e => setNewCatalogItem(p=>({...p,category:e.target.value}))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div style={{ fontSize:11, color:'#aaa', marginBottom:12 }}>El SKU se generará automáticamente con el prefijo de tu clínica</div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button style={s.btnSm} onClick={() => setShowNewCatalogItem(false)}>Cancelar</button>
              <button style={s.btn} onClick={addToCatalog}>Agregar</button>
            </div>
          </div>
        </div>
      )}
      {ajusteItem && <AjusteInventarioModal item={ajusteItem} profile={profile} onClose={() => setAjusteItem(null)} onSaved={() => { setAjusteItem(null); loadItems() }} />
      }
      {showCatalogo && <CatalogoModal profile={profile} onClose={() => { setShowCatalogo(false); loadCatalog() }} />}
      {showBodegas && <BodegasModal profile={profile} onClose={() => { setShowBodegas(false); loadWarehouses() }} />}
    </div>
  )
}
