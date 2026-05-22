import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const MODULE_COLORS = {
  integral:     '#1a5c8a',
  metabolica:   '#0F6E56',
  estetica:     '#8e44ad',
  fisioterapia: '#e67e22',
  enfermeria:   '#c0392b',
}

const MODULE_LABELS = {
  integral:     'Atención médica integral',
  metabolica:   'Atención médica metabólica',
  estetica:     'Atención médica estética',
  fisioterapia: 'Atención de fisioterapia',
  enfermeria:   'Atención de enfermería',
}

function initials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase()
}

function ChatWindow({ patientId, moduleType, professional, senderRole, profile }) {
  const [msgs, setMsgs] = useState([])
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const color = MODULE_COLORS[moduleType] || '#0F6E56'

  useEffect(() => {
    if (patientId && moduleType) {
      loadMsgs()
      const sub = supabase.channel(`chat_${patientId}_${moduleType}`)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages',
          filter:`patient_id=eq.${patientId}` }, () => loadMsgs())
        .subscribe()
      return () => supabase.removeChannel(sub)
    }
  }, [patientId, moduleType])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [msgs])

  async function loadMsgs() {
    const { data } = await supabase.from('messages')
      .select('*, sender:sender_id(first_name, last_name)')
      .eq('patient_id', patientId)
      .eq('module_type', moduleType)
      .order('created_at', { ascending: true })
    setMsgs(data || [])
    // Marcar como leídos
    await supabase.from('messages').update({ is_read: true })
      .eq('patient_id', patientId)
      .eq('module_type', moduleType)
      .neq('sender_id', profile?.id)
  }

  async function send() {
    if (!msg.trim()) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('messages').insert({
      patient_id: patientId,
      sender_id: user.id,
      module_type: moduleType,
      content: msg.trim(),
      sender_role: senderRole,
      is_read: false,
    })
    setMsg('')
    setSending(false)
    await loadMsgs()
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 200px)', background:'#fff', border:'0.5px solid #eee', borderRadius:12, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'12px 14px', borderBottom:'0.5px solid #eee', background: color+'08', display:'flex', alignItems:'center', gap:10 }}>
        {professional ? (
          <>
            <div style={{ width:32, height:32, borderRadius:'50%', background: color+'20', color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, flexShrink:0 }}>
              {initials(professional.first_name, professional.last_name)}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>
                {professional.sex === 'female' ? 'Dra.' : 'Dr.'} {professional.first_name} {professional.last_name}
              </div>
              <div style={{ fontSize:11, color:'#888' }}>{MODULE_LABELS[moduleType]}</div>
            </div>
          </>
        ) : (
          <div style={{ fontSize:13, color:'#888' }}>Sin profesional asignado</div>
        )}
      </div>

      {/* Mensajes */}
      <div style={{ flex:1, overflowY:'auto', padding:14, display:'flex', flexDirection:'column', gap:8 }}>
        {msgs.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'#bbb', marginTop:60 }}>
            <span style={{ fontSize:32 }}>💬</span>
            <div style={{ fontSize:13 }}>Iniciá la conversación</div>
          </div>
        )}
        {msgs.map(m => {
          const isMe = m.sender_id === profile?.id || m.sender_role === senderRole
          return (
            <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && m.sender && (
                <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>
                  {m.sender.first_name} {m.sender.last_name}
                </div>
              )}
              <div style={{ maxWidth:'78%', padding:'9px 12px', borderRadius:12, fontSize:13, lineHeight:1.5, background: isMe ? color : '#f0f0f0', color: isMe ? '#fff' : '#1a1a1a', borderBottomRightRadius: isMe ? 3 : 12, borderBottomLeftRadius: !isMe ? 3 : 12 }}>
                {m.content}
              </div>
              <div style={{ fontSize:10, color:'#bbb', marginTop:2 }}>
                {new Date(m.created_at).toLocaleTimeString('es-CR', { hour:'2-digit', minute:'2-digit' })}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'10px 14px', borderTop:'0.5px solid #eee', display:'flex', gap:8 }}>
        <input value={msg} onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Escribí un mensaje..."
          style={{ flex:1, padding:'9px 12px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
        <button onClick={send} disabled={sending || !msg.trim()}
          style={{ width:36, height:36, borderRadius:'50%', background: color, border:'none', cursor:'pointer', color:'#fff', fontSize:16, opacity: !msg.trim() ? 0.5 : 1 }}>›</button>
      </div>
    </div>
  )
}

export default function ModuleChat({ patient, careModules, profile, senderRole }) {
  const [activeModule, setActiveModule] = useState(null)
  const [unread, setUnread] = useState({})

  useEffect(() => {
    if (careModules?.length > 0 && !activeModule) {
      setActiveModule(careModules[0].module_type)
    }
  }, [careModules])

  useEffect(() => {
    if (patient?.id) loadUnread()
  }, [patient, careModules])

  async function loadUnread() {
    if (!careModules?.length) return
    const counts = {}
    for (const mod of careModules) {
      const { count } = await supabase.from('messages')
        .select('*', { count:'exact', head:true })
        .eq('patient_id', patient.id)
        .eq('module_type', mod.module_type)
        .eq('is_read', false)
        .neq('sender_role', senderRole)
      counts[mod.module_type] = count || 0
    }
    setUnread(counts)
  }

  if (!careModules?.length) {
    return (
      <div style={{ textAlign:'center', padding:40, color:'#bbb', fontSize:13 }}>
        No hay módulos de atención asignados aún.
      </div>
    )
  }

  const MODULE_ORDER = ['integral','metabolica','estetica','fisioterapia','enfermeria']
  const sorted = [...careModules].sort((a,b) => MODULE_ORDER.indexOf(a.module_type) - MODULE_ORDER.indexOf(b.module_type))
  const activeMod = sorted.find(m => m.module_type === activeModule)

  return (
    <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:12, height:'calc(100vh - 160px)' }}>
      {/* Lista de chats */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {sorted.map(mod => {
          const color = MODULE_COLORS[mod.module_type] || '#666'
          const isActive = activeModule === mod.module_type
          const unreadCount = unread[mod.module_type] || 0
          return (
            <div key={mod.module_type} onClick={() => { setActiveModule(mod.module_type); setUnread(p => ({ ...p, [mod.module_type]: 0 })) }}
              style={{ padding:'12px 14px', borderRadius:12, cursor:'pointer', background: isActive ? color+'15' : '#fff', border: isActive ? `1.5px solid ${color}` : '0.5px solid #eee', position:'relative' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:color, flexShrink:0 }} />
                <div style={{ fontSize:12, fontWeight:600, color: isActive ? color : '#1a1a1a', lineHeight:1.3 }}>
                  {MODULE_LABELS[mod.module_type]}
                </div>
                {unreadCount > 0 && (
                  <div style={{ marginLeft:'auto', width:18, height:18, borderRadius:'50%', background:color, color:'#fff', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, flexShrink:0 }}>
                    {unreadCount}
                  </div>
                )}
              </div>
              {mod.professional && (
                <div style={{ fontSize:11, color:'#888' }}>
                  {mod.professional.sex === 'female' ? 'Dra.' : 'Dr.'} {mod.professional.first_name} {mod.professional.last_name}
                </div>
              )}
              {!mod.professional && (
                <div style={{ fontSize:11, color:'#bbb' }}>Sin profesional asignado</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Ventana de chat */}
      <div>
        {activeMod && (
          <ChatWindow
            key={activeModule}
            patientId={patient?.id}
            moduleType={activeModule}
            professional={activeMod.professional}
            senderRole={senderRole}
            profile={profile}
          />
        )}
      </div>
    </div>
  )
}
