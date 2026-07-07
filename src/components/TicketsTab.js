import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'
const inp = { width:'100%', padding:'7px 9px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:10, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

const CATEGORIES = ['Infraestructura', 'Equipos médicos', 'Sistema', 'Administrativo', 'Otro']
const PRIORITIES = [
  { value:'baja',  label:'Baja',  bg:'#E1F5EE', color:'#0F6E56' },
  { value:'media', label:'Media', bg:'#FAEEDA', color:'#BA7517' },
  { value:'alta',  label:'Alta',  bg:'#FAECE7', color:'#D85A30' },
]
const STATUSES = [
  { value:'abierto',     label:'Pendiente de resolución', bg:'#E6F1FB', color:'#185FA5' },
  { value:'en_proceso',  label:'En proceso de resolución', bg:'#FAEEDA', color:'#BA7517' },
  { value:'resuelto',    label:'Resuelto', bg:'#E1F5EE', color:'#0F6E56' },
  { value:'cerrado',     label:'Cerrado', bg:'#f0f4f8', color:'#555' },
]

export default function TicketsTab({ profile }) {
  const [tickets, setTickets] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [reasignando, setReasignando] = useState(false)
  const [activeTab, setActiveTab] = useState('asignados')
  const [newAssignee, setNewAssignee] = useState('')
  const commentsEndRef = useRef(null)

  const [form, setForm] = useState({ title:'', description:'', category:'Infraestructura', priority:'media', assigned_to:'' })
  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  useEffect(() => { load(); loadAdmins() }, [])
  useEffect(() => { if (commentsEndRef.current) commentsEndRef.current.scrollIntoView({ behavior:'smooth' }) }, [comments])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('tickets')
      .select('*, creator:created_by(id, first_name, last_name), assignee:assigned_to(id, first_name, last_name)')
      .eq('clinic_id', profile.clinic_id)
      .order('created_at', { ascending: false })
    setTickets(data || [])
    setLoading(false)
  }

  async function loadAdmins() {
    const { data } = await supabase.from('profiles')
      .select('id, first_name, last_name')
      .eq('clinic_id', profile.clinic_id)
      .in('role', ['clinic_admin','admin'])
    setAdmins(data || [])
  }

  async function loadComments(ticketId) {
    const { data } = await supabase.from('ticket_comments')
      .select('*, author:author_id(first_name, last_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  async function createTicket() {
    if (!form.title || !form.assigned_to) return
    setSaving(true)
    const { data: ticket } = await supabase.from('tickets').insert({
      clinic_id: profile.clinic_id,
      created_by: profile.id,
      assigned_to: form.assigned_to,
      title: form.title,
      description: form.description || null,
      category: form.category,
      priority: form.priority,
      status: 'abierto',
    }).select().single()

    if (ticket) {
      await supabase.from('ticket_comments').insert({
        ticket_id: ticket.id, author_id: profile.id,
        comment: `Ticket creado y asignado a ${admins.find(a => a.id === form.assigned_to)?.first_name} ${admins.find(a => a.id === form.assigned_to)?.last_name}.`
      })
      await supabase.from('notifications').insert({
        profile_id: form.assigned_to, clinic_id: profile.clinic_id,
        type: 'ticket', title: 'Nuevo ticket asignado',
        message: `**${profile.first_name} ${profile.last_name}** te asignó un ticket: "${form.title}"`,
        is_read: false, sender_id: profile.id
      })
    }
    setForm({ title:'', description:'', category:'Infraestructura', priority:'media', assigned_to:'' })
    setShowNew(false)
    setSaving(false)
    await load()
  }

  async function addComment() {
    if (!newComment.trim() || !selectedTicket) return
    setSaving(true)
    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id, author_id: profile.id, comment: newComment.trim()
    })
    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', selectedTicket.id)
    setNewComment('')
    await loadComments(selectedTicket.id)
    setSaving(false)
  }

  async function changeStatus(status) {
    setSaving(true)
    await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', selectedTicket.id)
    const label = STATUSES.find(s => s.value === status)?.label || status
    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id, author_id: profile.id,
      comment: `Estado cambiado a: ${label}`
    })
    // Notificar al creador si fue resuelto
    if (status === 'resuelto' && selectedTicket.created_by !== profile.id) {
      await supabase.from('notifications').insert({
        profile_id: selectedTicket.created_by, clinic_id: profile.clinic_id,
        type: 'ticket', title: 'Ticket resuelto',
        message: `**${profile.first_name} ${profile.last_name}** marcó como resuelto tu ticket: "${selectedTicket.title}". Por favor confirmá la recepción para cerrarlo.`,
        is_read: false, sender_id: profile.id
      })
    }
    setSelectedTicket(p => ({ ...p, status }))
    await loadComments(selectedTicket.id)
    await load()
    setSaving(false)
  }

  async function reasignar() {
    if (!newAssignee || newAssignee === selectedTicket.assigned_to) return
    setSaving(true)
    const newAdmin = admins.find(a => a.id === newAssignee)
    await supabase.from('tickets').update({ assigned_to: newAssignee, updated_at: new Date().toISOString() }).eq('id', selectedTicket.id)
    await supabase.from('ticket_comments').insert({
      ticket_id: selectedTicket.id, author_id: profile.id,
      comment: `Ticket reasignado a ${newAdmin?.first_name} ${newAdmin?.last_name} por ${profile.first_name} ${profile.last_name}.`
    })
    await supabase.from('notifications').insert({
      profile_id: newAssignee, clinic_id: profile.clinic_id,
      type: 'ticket', title: 'Ticket reasignado',
      message: `**${profile.first_name} ${profile.last_name}** te asignó el ticket: "${selectedTicket.title}"`,
      is_read: false, sender_id: profile.id
    })
    setReasignando(false)
    setNewAssignee('')
    setSelectedTicket(null)
    setSaving(false)
    await load()
  }

  async function cerrarTicket() {
    if (!window.confirm('¿Confirmar que recibiste lo que solicitaste y cerrar el ticket?')) return
    await changeStatus('cerrado')
    setSelectedTicket(null)
  }

  const misTickets = tickets.filter(t => t.created_by === profile.id)
  const asignadosAmi = tickets.filter(t => t.assigned_to === profile.id)
  const ticketsMostrados = activeTab === 'asignados' ? asignadosAmi : misTickets

  return (
    <div style={{ display:'flex', gap:16, height:'calc(100vh - 180px)' }}>
      {/* Lista izquierda */}
      <div style={{ width:280, flexShrink:0, display:'flex', flexDirection:'column', gap:0 }}>
        <button onClick={() => setShowNew(true)} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:500, cursor:'pointer', marginBottom:12 }}>
          + Crear ticket
        </button>

        <div style={{ display:'flex', marginBottom:10, border:'0.5px solid #e2ede9', borderRadius:8, overflow:'hidden' }}>
          {[['asignados','Asignados a mí'],['mios','Creados por mí']].map(([k,l]) => (
            <div key={k} onClick={() => setActiveTab(k)}
              style={{ flex:1, padding:'6px 8px', cursor:'pointer', fontSize:11, fontWeight:500, textAlign:'center',
                background: activeTab===k ? BLUE : '#fff', color: activeTab===k ? '#fff' : '#555',
                borderRight: k==='asignados' ? '0.5px solid #e2ede9' : 'none' }}>
              {l}
              {k==='asignados' && asignadosAmi.filter(t=>t.status==='abierto').length > 0 && (
                <span style={{ marginLeft:4, background:'#D85A30', color:'#fff', borderRadius:20, fontSize:10, padding:'0 5px' }}>
                  {asignadosAmi.filter(t=>t.status==='abierto').length}
                </span>
              )}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
        ) : ticketsMostrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Sin tickets</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
            {ticketsMostrados.map(ticket => {
              const st = STATUSES.find(s => s.value === ticket.status) || STATUSES[0]
              const pr = PRIORITIES.find(p => p.value === ticket.priority) || PRIORITIES[1]
              const isSelected = selectedTicket?.id === ticket.id
              const isMine = ticket.created_by === profile.id
              return (
                <div key={ticket.id} onClick={() => { setSelectedTicket(ticket); loadComments(ticket.id); setReasignando(false) }}
                  style={{ padding:'12px 14px', borderRadius:10, cursor:'pointer', border: isSelected ? `2px solid ${BLUE}` : '0.5px solid #e2ede9', background: isSelected ? '#E6F1FB' : '#fff' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ fontSize:12, fontWeight:600, color: isSelected ? BLUE : '#1a1a1a', flex:1, marginRight:6 }}>{ticket.title}</div>
                    <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:20, background:pr.bg, color:pr.color, whiteSpace:'nowrap' }}>{pr.label}</span>
                  </div>
                  <div style={{ fontSize:11, color:'#aaa', marginBottom:4 }}>{ticket.category}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span>
                    <span style={{ fontSize:10, color: ticket.assigned_to === profile.id && ticket.status === 'abierto' ? G : '#bbb', fontWeight: ticket.assigned_to === profile.id && ticket.status === 'abierto' ? 600 : 400 }}>
                      {ticket.assigned_to === profile.id ? '→ Debo resolver' : 'Creado por mí'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel derecho */}
      <div style={{ flex:1, background:'#fff', border:'0.5px solid #e2ede9', borderRadius:12, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {!selectedTicket && !showNew ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#ccc', fontSize:13 }}>
            Seleccioná un ticket o creá uno nuevo
          </div>
        ) : showNew ? (
          <div style={{ padding:20, overflowY:'auto' }}>
            <div style={{ fontSize:14, fontWeight:700, color:BLUE, marginBottom:16 }}>Nuevo ticket</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Título <span style={{ color:'#D85A30' }}>*</span></label>
                <input style={inp} value={form.title} onChange={f('title')} />
              </div>
              <div>
                <label style={lbl}>Categoría</label>
                <select style={inp} value={form.category} onChange={f('category')}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Prioridad</label>
                <select style={inp} value={form.priority} onChange={f('priority')}>
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Asignar a <span style={{ color:'#D85A30' }}>*</span></label>
                <select style={inp} value={form.assigned_to} onChange={f('assigned_to')}>
                  <option value="">Seleccionar persona...</option>
                  {admins.filter(a => a.id !== profile.id).map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Descripción</label>
                <textarea style={{ ...inp, minHeight:100, resize:'vertical' }} value={form.description} onChange={f('description')} />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button onClick={() => setShowNew(false)} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'#555' }}>Cancelar</button>
              <button onClick={createTicket} disabled={saving || !form.title || !form.assigned_to}
                style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving||!form.title||!form.assigned_to?0.5:1 }}>
                {saving ? 'Creando...' : 'Crear ticket'}
              </button>
            </div>
          </div>
        ) : selectedTicket && (
          <>
            {/* Header del ticket */}
            <div style={{ padding:'16px 20px', borderBottom:'0.5px solid #e2ede9' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:700, color:BLUE, marginBottom:4 }}>{selectedTicket.title}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    {(() => { const st = STATUSES.find(s => s.value === selectedTicket.status) || STATUSES[0]; return <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color }}>{st.label}</span> })()}
                    {(() => { const pr = PRIORITIES.find(p => p.value === selectedTicket.priority) || PRIORITIES[1]; return <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:pr.bg, color:pr.color }}>{pr.label}</span> })()}
                    <span style={{ fontSize:11, color:'#aaa' }}>{selectedTicket.category}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedTicket(null); setReasignando(false) }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
              </div>
              <div style={{ fontSize:12, color:'#888' }}>
                Creado por <strong>{selectedTicket.creator?.first_name} {selectedTicket.creator?.last_name}</strong> · 
                Asignado a <strong>{selectedTicket.assignee?.first_name} {selectedTicket.assignee?.last_name}</strong>
              </div>
              {selectedTicket.description && <div style={{ fontSize:13, color:'#555', marginTop:8, padding:'10px 14px', background:'#f8fbf9', borderRadius:8 }}>{selectedTicket.description}</div>}

              {/* Acciones */}
              {!reasignando && selectedTicket.status !== 'cerrado' && (
                <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
                  {selectedTicket.assigned_to === profile.id && selectedTicket.status === 'abierto' && (
                    <button onClick={() => changeStatus('en_proceso')} style={{ border:`1px solid ${BLUE}`, background:'#fff', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:BLUE }}>Marcar en proceso</button>
                  )}
                  {selectedTicket.assigned_to === profile.id && selectedTicket.status === 'en_proceso' && (
                    <button onClick={() => changeStatus('resuelto')} style={{ border:`1px solid ${G}`, background:'#fff', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:G }}>Marcar como resuelto</button>
                  )}
                  {selectedTicket.created_by === profile.id && selectedTicket.status === 'resuelto' && (
                    <button onClick={cerrarTicket} style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12 }}>Confirmar recepción y cerrar</button>
                  )}
                  <button onClick={() => { setReasignando(true); setNewAssignee('') }}
                    style={{ border:'0.5px solid #e2ede9', background:'#fff', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, color:'#555' }}>
                    Reasignar
                  </button>
                </div>
              )}

              {/* Panel de reasignación */}
              {reasignando && (
                <div style={{ marginTop:12, padding:'12px 14px', background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:BLUE, marginBottom:8 }}>Reasignar ticket</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <select style={{ ...inp, flex:1 }} value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                      <option value="">Seleccionar persona...</option>
                      {admins.filter(a => a.id !== selectedTicket.assigned_to).map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                    </select>
                    <button onClick={() => { setReasignando(false); setNewAssignee('') }}
                      style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, color:'#555' }}>Cancelar</button>
                    <button onClick={reasignar} disabled={!newAssignee || saving}
                      style={{ background:'#D85A30', color:'#fff', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:12, fontWeight:500, opacity:!newAssignee||saving?0.5:1 }}>
                      Reasignar
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Historial de comentarios */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
              {comments.length === 0 ? (
                <div style={{ textAlign:'center', color:'#ccc', fontSize:12, padding:20 }}>Sin comentarios aún</div>
              ) : comments.map(c => {
                const isMe = c.author_id === profile.id
                const isSystem = c.comment.startsWith('Ticket creado') || c.comment.startsWith('Estado cambiado') || c.comment.startsWith('Ticket reasignado')
                if (isSystem) return (
                  <div key={c.id} style={{ textAlign:'center', fontSize:11, color:'#aaa', padding:'4px 0' }}>
                    {new Date(c.created_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })} {new Date(c.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit', hour12:false })} — {c.comment}
                  </div>
                )
                return (
                  <div key={c.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize:10, color:'#aaa', marginBottom:3 }}>
                      {c.author?.first_name} {c.author?.last_name} · {new Date(c.created_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short' })} {new Date(c.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit', hour12:false })}
                    </div>
                    <div style={{ maxWidth:'75%', padding:'8px 12px', borderRadius:10, fontSize:13,
                      background: isMe ? BLUE : '#f0f4f8', color: isMe ? '#fff' : '#333' }}>
                      {c.comment}
                    </div>
                  </div>
                )
              })}
              <div ref={commentsEndRef} />
            </div>

            {/* Input de comentario */}
            {selectedTicket.status !== 'cerrado' && (
              <div style={{ padding:'12px 20px', borderTop:'0.5px solid #e2ede9', display:'flex', gap:8 }}>
                <input style={{ ...inp, flex:1 }} value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addComment() } }}
                  placeholder="Agregar comentario..." />
                <button onClick={addComment} disabled={saving || !newComment.trim()}
                  style={{ background:G, color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, fontWeight:500, opacity:saving||!newComment.trim()?0.5:1 }}>
                  Guardar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
