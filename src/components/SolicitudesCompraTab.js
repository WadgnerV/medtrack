import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'
const inp = { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

const STATUS = {
  draft:    { label:'Borrador',   bg:'#f0f4f8', color:'#555' },
  sent:     { label:'Enviada',    bg:'#E6F1FB', color:'#185FA5' },
  approved: { label:'Aprobada',  bg:'#E1F5EE', color:'#0F6E56' },
  received: { label:'Recibida',  bg:'#E1F5EE', color:'#0F6E56' },
  rejected: { label:'Rechazada', bg:'#FAECE7', color:'#D85A30' },
  modified: { label:'Modificada',bg:'#FAEEDA', color:'#BA7517' },
}

export default function SolicitudesCompraTab({ profile, inventoryItems }) {
  const [orders, setOrders] = useState([])
  const [admins, setAdmins] = useState([])
  const [clinicName, setClinicName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [saving, setSaving] = useState(false)

  const [newItems, setNewItems] = useState([{ item_id:'', quantity:'' }])
  const [newNotes, setNewNotes] = useState('')
  const [selectedAdmin, setSelectedAdmin] = useState('')

  const canCreate = ['clinic_admin','admin','receptionist'].includes(profile?.role)
  const canApprove = ['clinic_admin','admin'].includes(profile?.role)

  useEffect(() => { load(); loadAdmins(); loadClinicName() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('purchase_orders')
      .select('*, creator:created_by(id, first_name, last_name, role), approver:approved_by(first_name, last_name), items:purchase_order_items(*, inventory_item:item_id(name, unit, sku))')
      .eq('clinic_id', profile.clinic_id)
      .order('created_at', { ascending: false })
    console.log('Orders:', data, 'Error:', error)
    setOrders(data || [])
    setLoading(false)
  }

  async function loadAdmins() {
    const { data } = await supabase.from('profiles')
      .select('id, first_name, last_name, email')
      .eq('clinic_id', profile.clinic_id)
      .in('role', ['clinic_admin','admin'])
      .neq('id', profile.id)
    setAdmins(data || [])
  }

  async function loadClinicName() {
    const { data } = await supabase.from('clinic_settings').select('clinic_name').limit(1).single()
    setClinicName(data?.clinic_name || 'MedTrack')
  }

  function resetForm() {
    setNewItems([{ item_id:'', quantity:'' }])
    setNewNotes('')
    setSelectedAdmin('')
    setShowNew(false)
    setEditingOrder(null)
  }

  async function submitOrder(isEdit = false) {
    const validItems = newItems.filter(i => i.item_id && i.quantity)
    if (validItems.length === 0) return
    setSaving(true)

    const autoApprove = admins.length === 0
    const status = autoApprove ? 'approved' : 'sent'
    const targetAdmin = admins.find(a => a.id === selectedAdmin) || admins[0]

    if (isEdit && editingOrder) {
      await supabase.from('purchase_order_items').delete().eq('order_id', editingOrder.id)
      await supabase.from('purchase_orders').update({ notes: newNotes || null, updated_at: new Date().toISOString() }).eq('id', editingOrder.id)
      await supabase.from('purchase_order_items').insert(validItems.map(i => ({
        order_id: editingOrder.id, item_id: i.item_id,
        quantity_requested: parseFloat(i.quantity), quantity_approved: autoApprove ? parseFloat(i.quantity) : null,
      })))
    } else {
      const { data: order } = await supabase.from('purchase_orders').insert({
        clinic_id: profile.clinic_id, created_by: profile.id,
        approved_by: autoApprove ? profile.id : null,
        status, notes: newNotes || null,
        assigned_to: selectedAdmin || null,
      }).select().single()

      if (order) {
        await supabase.from('purchase_order_items').insert(validItems.map(i => ({
          order_id: order.id, item_id: i.item_id,
          quantity_requested: parseFloat(i.quantity),
          quantity_approved: autoApprove ? parseFloat(i.quantity) : null,
        })))

        if (!autoApprove && targetAdmin) {
          const itemNames = validItems.map(i => {
            const inv = inventoryItems.find(x => x.id === i.item_id)
            return `${inv?.name || 'Ítem'} (${i.quantity} ${inv?.unit || ''})`
          }).join(', ')

          await supabase.from('notifications').insert({
            profile_id: targetAdmin.id, clinic_id: profile.clinic_id,
            type: 'purchase_order', title: 'Nueva solicitud de compra',
            message: `**${profile.first_name} ${profile.last_name}** solicitó tu aprobación para: ${itemNames}`,
            is_read: false, sender_id: profile.id, data: { order_id: order.id }
          })

          if (targetAdmin.email) {
            await supabase.functions.invoke('purchase-order-request', {
              body: {
                to_email: targetAdmin.email,
                to_name: `${targetAdmin.first_name} ${targetAdmin.last_name}`,
                clinic_name: clinicName,
                requester_name: `${profile.first_name} ${profile.last_name}`,
                items: validItems.map(i => {
                  const inv = inventoryItems.find(x => x.id === i.item_id)
                  return { name: inv?.name || '—', quantity: i.quantity, unit: inv?.unit || '' }
                }),
                notes: newNotes || null,
                order_id: order.id,
              }
            })
          }
        }
      }
    }

    resetForm()
    setSaving(false)
    await load()
  }

  async function deleteOrder(order) {
    if (!window.confirm('¿Eliminar esta solicitud?')) return
    await supabase.from('purchase_orders').delete().eq('id', order.id)
    await load()
  }

  async function approveOrder(order, modified = false) {
    setSaving(true)
    await supabase.from('purchase_orders').update({
      status: modified ? 'modified' : 'approved',
      approved_by: profile.id,
      updated_at: new Date().toISOString()
    }).eq('id', order.id)

    await supabase.from('notifications').insert({
      profile_id: order.created_by, clinic_id: profile.clinic_id,
      type: 'purchase_order',
      title: modified ? 'Orden de compra modificada' : 'Orden de compra aprobada',
      message: modified
        ? `Tu solicitud fue **modificada** por ${profile.first_name} ${profile.last_name}.`
        : `Tu solicitud fue **aprobada** por ${profile.first_name} ${profile.last_name}.`,
      is_read: false, sender_id: profile.id
    })
    setSaving(false)
    setSelectedOrder(null)
    await load()
  }

  async function rejectOrder(order) {
    if (!window.confirm('¿Rechazar esta orden?')) return
    await supabase.from('purchase_orders').update({ status: 'rejected', approved_by: profile.id, updated_at: new Date().toISOString() }).eq('id', order.id)
    await supabase.from('notifications').insert({
      profile_id: order.created_by, clinic_id: profile.clinic_id,
      type: 'purchase_order', title: 'Orden de compra rechazada',
      message: `Tu solicitud fue **rechazada** por ${profile.first_name} ${profile.last_name}.`,
      is_read: false, sender_id: profile.id
    })
    setSelectedOrder(null)
    await load()
  }

  async function receiveOrder(order) {
    if (!window.confirm('¿Confirmar recepción? Esto actualizará el stock automáticamente.')) return
    setSaving(true)
    for (const item of order.items) {
      const qty = item.quantity_approved ?? item.quantity_requested
      const { data: inv } = await supabase.from('inventory_items').select('quantity').eq('id', item.item_id).single()
      if (inv) {
        const nuevaCantidad = inv.quantity + qty
        await supabase.from('inventory_items').update({ quantity: nuevaCantidad, updated_at: new Date().toISOString() }).eq('id', item.item_id)
        await supabase.from('inventory_history').insert({
          item_id: item.item_id, clinic_id: profile.clinic_id,
          quantity_before: inv.quantity, quantity_after: nuevaCantidad,
          change_amount: qty, change_type: 'entrada_Compra',
          motivo: 'Compra', nota: `Orden de compra #${order.id.slice(0,8)}`,
          recorded_by: profile.id
        })
      }
    }
    await supabase.from('purchase_orders').update({ status: 'received', updated_at: new Date().toISOString() }).eq('id', order.id)
    setSaving(false)
    setSelectedOrder(null)
    await load()
  }

  async function updateApprovedQty(itemId, qty) {
    setSelectedOrder(p => ({ ...p, items: p.items.map(i => i.id === itemId ? { ...i, quantity_approved: qty } : i) }))
    await supabase.from('purchase_order_items').update({ quantity_approved: parseFloat(qty) || 0 }).eq('id', itemId)
  }

  const pendingApproval = orders.filter(o => o.status === 'sent' && o.created_by !== profile.id && canApprove).length

  function FormularioSolicitud({ isEdit }) {
    return (
      <div style={{ maxWidth:520, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, padding:20, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:600, color:BLUE, marginBottom:14 }}>
          {isEdit ? 'Editar solicitud' : 'Nueva solicitud de compra'}
        </div>
        {newItems.map((item, i) => (
          <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:8 }}>
            <div style={{ flex:3 }}>
              {i === 0 && <label style={lbl}>Ítem</label>}
              <select style={inp} value={item.item_id} onChange={e => { const arr=[...newItems]; arr[i]={...arr[i],item_id:e.target.value}; setNewItems(arr) }}>
                <option value="">Seleccionar ítem...</option>
                {inventoryItems.map(it => <option key={it.id} value={it.id}>{it.name} (stock: {it.quantity} {it.unit})</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              {i === 0 && <label style={lbl}>Cantidad</label>}
              <input style={inp} type="number" min="0" value={item.quantity}
                onChange={e => { const arr=[...newItems]; arr[i]={...arr[i],quantity:e.target.value}; setNewItems(arr) }} />
            </div>
            {newItems.length > 1 && (
              <button onClick={() => setNewItems(p => p.filter((_,j)=>j!==i))}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:18, paddingBottom:8 }}>×</button>
            )}
          </div>
        ))}
        <button onClick={() => setNewItems(p => [...p, { item_id:'', quantity:'' }])}
          style={{ padding:'5px 12px', background:'#fff', border:`1px dashed ${G}`, borderRadius:8, cursor:'pointer', fontSize:12, color:G, fontWeight:500, marginBottom:12 }}>
          + Agregar ítem
        </button>
        <div style={{ marginBottom:10 }}>
          <label style={lbl}>Notas (opcional)</label>
          <input style={inp} value={newNotes} onChange={e => setNewNotes(e.target.value)} />
        </div>
        {admins.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <label style={lbl}>Solicitar aprobación de</label>
            <select style={inp} value={selectedAdmin} onChange={e => setSelectedAdmin(e.target.value)}>
              <option value="">Cualquier administrador</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
            </select>
          </div>
        )}
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:4 }}>
          <button onClick={resetForm} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#555' }}>
            Cancelar
          </button>
          <button onClick={() => submitOrder(isEdit)} disabled={saving}
            style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving?0.6:1 }}>
            {saving ? 'Enviando...' : isEdit ? 'Guardar cambios' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>Solicitudes de compra</div>
          {pendingApproval > 0 && (
            <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:'#FAEEDA', color:'#BA7517' }}>
              {pendingApproval} pendiente{pendingApproval > 1 ? 's' : ''} de aprobación
            </span>
          )}
        </div>
        {canCreate && !showNew && !editingOrder && (
          <button onClick={() => setShowNew(true)} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:500, cursor:'pointer' }}>
            + Nueva solicitud
          </button>
        )}
      </div>

      {showNew && <FormularioSolicitud isEdit={false} />}
      {editingOrder && <FormularioSolicitud isEdit={true} />}

      {selectedOrder && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>Revisar solicitud</div>
              <button onClick={() => setSelectedOrder(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
            </div>
            <div style={{ fontSize:12, color:'#888', marginBottom:16 }}>
              Solicitado por: <strong>{selectedOrder.creator?.first_name} {selectedOrder.creator?.last_name}</strong> · {new Date(selectedOrder.created_at).toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })}
              {selectedOrder.notes && <div style={{ marginTop:4 }}>Nota: {selectedOrder.notes}</div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
              {selectedOrder.items.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{item.inventory_item?.name}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>Solicitado: {item.quantity_requested} {item.inventory_item?.unit}</div>
                  </div>
                  {canApprove && selectedOrder.created_by !== profile.id && selectedOrder.status === 'sent' && (
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <label style={{ ...lbl, marginBottom:0, whiteSpace:'nowrap' }}>Aprobar:</label>
                      <input type="number" style={{ ...inp, width:80 }}
                        value={item.quantity_approved ?? item.quantity_requested}
                        onChange={e => updateApprovedQty(item.id, e.target.value)} />
                      <span style={{ fontSize:11, color:'#aaa' }}>{item.inventory_item?.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {canApprove && selectedOrder.created_by !== profile.id && selectedOrder.status === 'sent' && (
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <button onClick={() => rejectOrder(selectedOrder)} style={{ border:'0.5px solid #fde0e0', background:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#D85A30' }}>Rechazar</button>
                <button onClick={() => approveOrder(selectedOrder, true)} style={{ border:`1px solid ${BLUE}`, background:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:BLUE, fontWeight:500 }}>Aprobar con cambios</button>
                <button onClick={() => approveOrder(selectedOrder, false)} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:500 }}>Aprobar</button>
              </div>
            )}
            {(selectedOrder.status === 'approved' || selectedOrder.status === 'modified') && (
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={() => receiveOrder(selectedOrder)} disabled={saving}
                  style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving?0.6:1 }}>
                  {saving ? 'Procesando...' : 'Confirmar recepción de mercancía'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : orders.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>No hay solicitudes de compra</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {orders.map(order => {
            const st = STATUS[order.status] || STATUS.draft
            const canReceive = order.status === 'approved' || order.status === 'modified'
            const pendingMe = order.status === 'sent' && order.created_by !== profile.id && canApprove
            const isMine = order.created_by === profile.id
            const canEdit = isMine && ['draft','sent'].includes(order.status)
            return (
              <div key={order.id} style={{ background:'#fff', border: pendingMe ? `1.5px solid #F59E0B` : '0.5px solid #e2ede9', borderRadius:12, padding:'14px 16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, cursor:'pointer' }} onClick={() => setSelectedOrder(order)}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                      {pendingMe && <span style={{ fontSize:11, color:'#BA7517', fontWeight:500 }}>⚠ Pendiente tu aprobación</span>}
                      {canReceive && <span style={{ fontSize:11, color:G, fontWeight:500 }}>Lista para recibir</span>}
                    </div>
                    <div style={{ fontSize:13, color:BLUE, fontWeight:500 }}>
                      {order.creator?.first_name} {order.creator?.last_name}
                    </div>
                    <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>
                      {new Date(order.created_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })}
                      {order.notes && ` · ${order.notes}`}
                    </div>
                    <div style={{ fontSize:12, color:'#555', marginTop:6 }}>
                      {order.items?.map(i => `${i.inventory_item?.name} (${i.quantity_approved ?? i.quantity_requested} ${i.inventory_item?.unit})`).join(', ')}
                    </div>
                  </div>
                  {canEdit && (
                    <div style={{ display:'flex', gap:6, marginLeft:12 }}>
                      <button onClick={() => {
                        setEditingOrder(order)
                        setNewItems(order.items.map(i => ({ item_id: i.item_id, quantity: String(i.quantity_requested) })))
                        setNewNotes(order.notes || '')
                      }} style={{ border:'0.5px solid #e2ede9', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>
                        Editar
                      </button>
                      <button onClick={() => deleteOrder(order)}
                        style={{ border:'0.5px solid #fde0e0', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
