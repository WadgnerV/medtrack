import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

export default function ChatBubble({ profile }) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('home') // home, new, conversation
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [staff, setStaff] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [unread, setUnread] = useState(0)
  const [sending, setSending] = useState(false)
  const [convType, setConvType] = useState(null) // 'support' | 'internal'
  const [selStaff, setSelStaff] = useState([])
  const [clinics, setClinics] = useState([])
  const [selClinic, setSelClinic] = useState(null)
  const [clinicStaff, setClinicStaff] = useState([])
  const isSuperAdmin = profile?.role === 'superadmin'
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!profile?.clinic_id) return
    loadConversations()
    if (profile?.role === 'superadmin') loadClinics()
    else loadStaff()

    // Realtime para mensajes nuevos
    const channel = supabase.channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, payload => {
        if (activeConv?.id === payload.new.conversation_id) {
          setMessages(p => [...p, payload.new])
          markRead(payload.new.conversation_id)
        } else {
          loadConversations()
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_conversations'
      }, () => loadConversations())
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile, activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open && view === 'conversation' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open, view])

  async function loadConversations() {
    const { data } = await supabase
      .from('chat_conversations')
      .select(`*, participants:chat_participants(profile_id, last_read_at, profile:profile_id(first_name, last_name, role)), last_message:chat_messages(content, created_at, sender_id)`)
      .eq('clinic_id', profile.clinic_id)
      .order('updated_at', { ascending: false })

    if (!data) return
    const myConvs = data.filter(c => c.participants?.some(p => p.profile_id === profile.id))
    setConversations(myConvs)

    // Contar no leídos
    let total = 0
    for (const conv of myConvs) {
      const me = conv.participants?.find(p => p.profile_id === profile.id)
      if (!me) continue
      const { count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', profile.id)
        .gt('created_at', me.last_read_at || '1970-01-01')
      total += count || 0
    }
    setUnread(total)
  }

  async function loadClinics() {
    const { data } = await supabase.from('clinics').select('id, name').eq('is_active', true).order('name')
    setClinics(data || [])
  }

  async function loadClinicStaff(clinicId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, profession')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .in('role', ['doctor', 'receptionist', 'admin', 'clinic_admin', 'branch_admin'])
    setClinicStaff(data || [])
  }

  async function loadStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, profession')
      .eq('clinic_id', profile.clinic_id)
      .eq('is_active', true)
      .neq('id', profile.id)
      .in('role', ['doctor', 'receptionist', 'admin', 'clinic_admin', 'branch_admin'])
    setStaff(data || [])
  }

  async function loadMessages(convId) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, sender:sender_id(first_name, last_name, role)')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    markRead(convId)
  }

  async function markRead(convId) {
    await supabase
      .from('chat_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', convId)
      .eq('profile_id', profile.id)
  }

  async function openConversation(conv) {
    setActiveConv(conv)
    setView('conversation')
    await loadMessages(conv.id)
  }

  async function createConversation() {
    if (convType === 'internal' && selStaff.length === 0) return
    setSending(true)

    // Determinar participantes
    const targetClinicId = isSuperAdmin ? selClinic?.id : profile.clinic_id
    let participants = [profile.id]
    if (convType === 'support') {
      // Buscar superadmin o soporte definido
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'superadmin')
        .eq('is_active', true)
        .limit(1)
      if (admins?.[0]) participants.push(admins[0].id)
    } else {
      participants = [...participants, ...selStaff]
    }

    const title = convType === 'support' ? 'Soporte MedTrack' :
      selStaff.length === 1 ? staff.find(s => s.id === selStaff[0])?.first_name + ' ' + staff.find(s => s.id === selStaff[0])?.last_name :
      `Grupo (${selStaff.length + 1})`

    const { data: conv } = await supabase
      .from('chat_conversations')
      .insert({ clinic_id: profile.clinic_id, type: convType, title, created_by: profile.id })
      .select().single()

    if (conv) {
      await supabase.from('chat_participants').insert(
        participants.map(pid => ({ conversation_id: conv.id, profile_id: pid }))
      )
      setSelStaff([])
      setConvType(null)
      await loadConversations()
      await openConversation(conv)
    }
    setSending(false)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeConv) return
    setSending(true)
    const content = newMsg.trim()
    setNewMsg('')
    await supabase.from('chat_messages').insert({
      conversation_id: activeConv.id,
      sender_id: profile.id,
      content
    })
    await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConv.id)
    setSending(false)
  }

  const fmtTime = ts => {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) return d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' })
  }

  const roleLabel = r => ({ doctor:'Doctor', receptionist:'Recepcionista', admin:'Admin', clinic_admin:'Admin clínica', branch_admin:'Admin sucursal' }[r] || r)

  const convTitle = conv => {
    if (conv.type === 'support') return '🛟 Soporte MedTrack'
    if (conv.title) return conv.title
    const others = conv.participants?.filter(p => p.profile_id !== profile.id)
    if (others?.length === 1) return `${others[0].profile?.first_name} ${others[0].profile?.last_name}`
    return `Grupo (${(conv.participants?.length || 0)})`
  }

  return (
    <>
      {/* Overlay */}
      {open && <div style={{ position:'fixed', inset:0, zIndex:998 }} onClick={() => setOpen(false)} />}

      {/* Panel */}
      {open && (
        <div onClick={e => e.stopPropagation()}
          style={{ position:'fixed', bottom:80, right:20, width:340, height:500, background:'#fff', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.15)', zIndex:999, display:'flex', flexDirection:'column', overflow:'hidden', fontFamily:'Inter, sans-serif', border:'1px solid #eee' }}>

          {/* Header */}
          <div style={{ background:BLUE, padding:'14px 16px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {view !== 'home' && (
              <button onClick={() => { setView('home'); setActiveConv(null); setConvType(null); setSelStaff([]); setSelClinic(null); setClinicStaff([]) }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:18, padding:0, lineHeight:1 }}>←</button>
            )}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>
                {view === 'home' ? 'Mensajes' : view === 'new' ? 'Nueva conversación' : convTitle(activeConv)}
              </div>
              {view === 'conversation' && (
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>
                  {activeConv?.type === 'support' ? 'Soporte' : 'Chat interno'}
                </div>
              )}
            </div>
            <button onClick={() => setOpen(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:18, padding:0 }}>×</button>
          </div>

          {/* Home — lista de conversaciones */}
          {view === 'home' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ flex:1, overflowY:'auto' }}>
                {conversations.length === 0 && (
                  <div style={{ textAlign:'center', padding:'40px 20px', color:'#bbb', fontSize:13 }}>
                    No hay conversaciones aún
                  </div>
                )}
                {conversations.map(conv => {
                  const lastMsg = conv.last_message?.[conv.last_message.length - 1]
                  const me = conv.participants?.find(p => p.profile_id === profile.id)
                  const hasUnread = lastMsg && me && new Date(lastMsg.created_at) > new Date(me.last_read_at) && lastMsg.sender_id !== profile.id
                  return (
                    <div key={conv.id} onClick={() => openConversation(conv)}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid #f5f5f5', background: hasUnread ? '#f0fdf9' : '#fff' }}
                      onMouseEnter={e => e.currentTarget.style.background = hasUnread ? '#e6faf3' : '#f9f9f9'}
                      onMouseLeave={e => e.currentTarget.style.background = hasUnread ? '#f0fdf9' : '#fff'}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background: conv.type === 'support' ? '#E1F5EE' : '#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>
                        {conv.type === 'support' ? '🛟' : '💬'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight: hasUnread ? 700 : 500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{convTitle(conv)}</div>
                        <div style={{ fontSize:11, color:'#aaa', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lastMsg?.content || 'Sin mensajes'}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                        <div style={{ fontSize:10, color:'#bbb' }}>{lastMsg ? fmtTime(lastMsg.created_at) : ''}</div>
                        {hasUnread && <div style={{ width:8, height:8, borderRadius:'50%', background:G }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding:12, borderTop:'1px solid #eee' }}>
                <button onClick={() => setView('new')}
                  style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                  + Nueva conversación
                </button>
              </div>
            </div>
          )}

          {/* Nueva conversación */}
          {view === 'new' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              {/* Superadmin: primero selecciona clínica */}
              {isSuperAdmin && !selClinic && (
                <div style={{ flex:1, overflowY:'auto' }}>
                  <div style={{ padding:'10px 16px', fontSize:12, color:'#888', borderBottom:'1px solid #eee' }}>Seleccioná una clínica</div>
                  {clinics.map(c => (
                    <div key={c.id} onClick={() => { setSelClinic(c); loadClinicStaff(c.id) }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ width:36, height:36, borderRadius:'50%', background:'#E1F5EE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏥</div>
                      <div style={{ fontSize:13, fontWeight:500, color:BLUE }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              )}
              {isSuperAdmin && selClinic && !convType && (
                <div style={{ flex:1, overflowY:'auto' }}>
                  <div style={{ padding:'10px 16px', fontSize:12, color:'#888', borderBottom:'1px solid #eee' }}>Personal de {selClinic.name}</div>
                  {clinicStaff.map(s => (
                    <div key={s.id} onClick={() => { setSelStaff([s.id]); setConvType('internal') }}
                      style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer', borderBottom:'1px solid #f5f5f5' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9f9f9'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ width:34, height:34, borderRadius:'50%', background:'#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, color:'#666' }}>
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                        <div style={{ fontSize:11, color:'#aaa' }}>{roleLabel(s.role)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isSuperAdmin && !convType ? (
                <div style={{ padding:20, display:'flex', flexDirection:'column', gap:12 }}>
                  <div style={{ fontSize:13, color:'#888', marginBottom:4 }}>¿Con quién querés hablar?</div>
                  <div onClick={() => setConvType('support')}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', border:'1.5px solid #eee', borderRadius:12, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.background = '#f0fdf9' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.background = '#fff' }}>
                    <div style={{ fontSize:28 }}>🛟</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:BLUE }}>Soporte MedTrack</div>
                      <div style={{ fontSize:12, color:'#888' }}>Contactá al equipo de soporte</div>
                    </div>
                  </div>
                  <div onClick={() => setConvType('internal')}
                    style={{ display:'flex', alignItems:'center', gap:14, padding:'16px', border:'1.5px solid #eee', borderRadius:12, cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = BLUE; e.currentTarget.style.background = '#f0f6ff' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#eee'; e.currentTarget.style.background = '#fff' }}>
                    <div style={{ fontSize:28 }}>👥</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:BLUE }}>Personal de la clínica</div>
                      <div style={{ fontSize:12, color:'#888' }}>Hablá con tu equipo</div>
                    </div>
                  </div>
                </div>
              ) : (!isSuperAdmin && convType === 'support') ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16 }}>
                  <div style={{ fontSize:48 }}>🛟</div>
                  <div style={{ fontSize:14, fontWeight:600, color:BLUE, textAlign:'center' }}>Iniciar chat con soporte</div>
                  <div style={{ fontSize:13, color:'#888', textAlign:'center', lineHeight:1.5 }}>Un agente de MedTrack recibirá tu mensaje y te responderá a la brevedad.</div>
                  <button onClick={createConversation} disabled={sending}
                    style={{ width:'100%', padding:'11px', background:G, color:'#fff', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                    {sending ? 'Iniciando...' : 'Iniciar conversación'}
                  </button>
                </div>
              ) : (!isSuperAdmin ? (
                <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px', borderBottom:'1px solid #eee', fontSize:12, color:'#888' }}>
                    Seleccioná una o más personas
                  </div>
                  <div style={{ flex:1, overflowY:'auto' }}>
                    {staff.map(s => {
                      const selected = selStaff.includes(s.id)
                      return (
                        <div key={s.id} onClick={() => setSelStaff(p => selected ? p.filter(x => x !== s.id) : [...p, s.id])}
                          style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', cursor:'pointer', background: selected ? '#f0fdf9' : '#fff', borderBottom:'1px solid #f5f5f5' }}
                          onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#f9f9f9' }}
                          onMouseLeave={e => { if (!selected) e.currentTarget.style.background = '#fff' }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background: selected ? G : '#e5e7eb', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, color: selected ? '#fff' : '#666', fontWeight:600, flexShrink:0 }}>
                            {selected ? '✓' : s.first_name?.[0]}{!selected && s.last_name?.[0]}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{s.first_name} {s.last_name}</div>
                            <div style={{ fontSize:11, color:'#aaa' }}>{roleLabel(s.role)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {selStaff.length > 0 && (
                    <div style={{ padding:12, borderTop:'1px solid #eee' }}>
                      <button onClick={createConversation} disabled={sending}
                        style={{ width:'100%', padding:'10px', background:G, color:'#fff', border:'none', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                        {sending ? 'Creando...' : `Iniciar chat con ${selStaff.length === 1 ? staff.find(s => s.id === selStaff[0])?.first_name : selStaff.length + ' personas'}`}
                      </button>
                    </div>
                  )}
                </div>
              ) : null)}
            </div>
          )}

          {/* Conversación */}
          {view === 'conversation' && (
            <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
              <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 0' }}>
                {messages.map((msg, idx) => {
                  const isMe = msg.sender_id === profile.id
                  const showName = !isMe && (idx === 0 || messages[idx-1]?.sender_id !== msg.sender_id)
                  return (
                    <div key={msg.id} style={{ marginBottom:8, display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                      {showName && (
                        <div style={{ fontSize:10, color:'#aaa', marginBottom:2, marginLeft:4 }}>
                          {msg.sender?.first_name} {msg.sender?.last_name}
                        </div>
                      )}
                      <div style={{ maxWidth:'80%', padding:'8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px', background: isMe ? G : '#f0f0f0', color: isMe ? '#fff' : '#1a1a1a', fontSize:13, lineHeight:1.5 }}>
                        {msg.content}
                      </div>
                      <div style={{ fontSize:10, color:'#bbb', marginTop:2, marginLeft:4, marginRight:4 }}>
                        {fmtTime(msg.created_at)}
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding:'10px 12px', borderTop:'1px solid #eee', display:'flex', gap:8, flexShrink:0 }}>
                <input ref={inputRef} value={newMsg} onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Escribí un mensaje..." maxLength={1000}
                  style={{ flex:1, padding:'9px 12px', border:'1.5px solid #e5e7eb', borderRadius:20, fontSize:13, outline:'none', fontFamily:'inherit' }}
                  onFocus={e => e.target.style.borderColor = G}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
                  style={{ width:36, height:36, borderRadius:'50%', background: newMsg.trim() ? G : '#e5e7eb', border:'none', cursor: newMsg.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background 0.2s' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill={newMsg.trim() ? '#fff' : '#aaa'}>
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Burbuja flotante */}
      <div onClick={() => { setOpen(p => !p); if (!open) loadConversations() }}
        style={{ position:'fixed', bottom:20, right: 84, zIndex:1000, width:48, height:48, borderRadius:'50%', background:BLUE, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 16px rgba(26,58,92,0.4)', transition:'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        {unread > 0 && (
          <div style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'#e53e3e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'#fff', border:'2px solid #fff' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </div>
    </>
  )
}
