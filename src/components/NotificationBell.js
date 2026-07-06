import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const BLUE = '#1a3a5c'
const G = '#1D9E75'

export default function NotificationBell({ profile }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [popup, setPopup] = useState(null)
  const popupTimer = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!profile?.id) return
    loadNotifications()

    const channel = supabase.channel('notifications-' + profile.id)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${profile.id}`
      }, payload => {
        setNotifications(p => [payload.new, ...p])
        setUnread(p => p + 1)
        if (payload.new.type === 'preconsult_ready') {
          setPopup(payload.new)
          clearTimeout(popupTimer.current)
          popupTimer.current = setTimeout(() => setPopup(null), 8000)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [profile])

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function loadNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
    setUnread((data || []).filter(n => !n.is_read).length)
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('profile_id', profile.id)
      .eq('is_read', false)
    setNotifications(p => p.map(n => ({ ...n, is_read: true })))
    setUnread(0)
  }

  async function toggleOpen() {
    setOpen(p => !p)
    if (!open && unread > 0) {
      setTimeout(markAllRead, 1500)
    }
  }

  const fmtTime = ts => {
    const d = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now - d) / 1000)
    if (diff < 60) return 'Ahora'
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)}d`
    return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short' })
  }

  const typeIcon = type => ({
    appointment: '📅',
    staff: '👤',
    branch: '🏥',
    patient: '🧑‍⚕️',
    clinic: '🏢',
    admin: '👔',
    preconsult_ready: '🟢',
  }[type] || '🔔')

  return (
    <>
    {popup && (
      <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, width:300, background:'#fff', borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,0.18)', border:`2px solid #0F6E56`, overflow:'hidden', fontFamily:'Inter, sans-serif', animation:'slideIn 0.3s ease' }}>
        <div style={{ background:'#0F6E56', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:16 }}>🟢</span>
            <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Paciente listo</span>
          </div>
          <button onClick={() => setPopup(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.8)', fontSize:18, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:'12px 14px' }}>
          <div style={{ fontSize:13, color:'#333', marginBottom:4 }}>{popup.message}</div>
          <div style={{ fontSize:11, color:'#aaa' }}>{fmtTime(popup.created_at)}</div>
        </div>
      </div>
    )}
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Campanita */}
      <button onClick={toggleOpen}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill={unread > 0 ? BLUE : '#bbb'}>
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
        {unread > 0 && (
          <div style={{ position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8, background: '#e53e3e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', border: '1.5px solid #fff', padding: '0 3px' }}>
            {unread > 9 ? '9+' : unread}
          </div>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, width: 320, background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', border: '1px solid #eee', zIndex: 500, overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: BLUE }}>Notificaciones</div>
            {unread > 0 && (
              <button onClick={markAllRead}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: G, fontWeight: 600, padding: 0 }}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#bbb', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                No hay notificaciones
              </div>
            )}
            {notifications.map(n => (
              <div key={n.id}
                style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f5f5f5', background: n.is_read ? '#fff' : '#f0fdf9', transition: 'background 0.2s' }}>
                <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{typeIcon(n.type)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, marginBottom: 4 }}>{n.message}</div>
                  <div style={{ fontSize: 11, color: '#bbb' }}>{fmtTime(n.created_at)}</div>
                </div>
                {!n.is_read && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, flexShrink: 0, marginTop: 5 }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
