import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

const s = {
  wrap: { display:'flex', height:'100vh', fontFamily:'"Inter", system-ui, sans-serif', background:'#f5f5f5' },
  sidebar: { width:220, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column', padding:'20px 0' },
  logo: { padding:'0 20px 20px', borderBottom:'0.5px solid #f0f0f0', marginBottom:16 },
  logoTitle: { fontSize:16, fontWeight:700, color:BLUE },
  logoSub: { fontSize:11, color:'#999' },
  menuItem: { padding:'9px 20px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:10, borderRadius:0 },
  main: { flex:1, overflowY:'auto', padding:28 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 },
  title: { fontSize:18, fontWeight:700, color:BLUE },
  sub: { fontSize:13, color:'#888', marginTop:2 },
  card: { background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'16px 18px', marginBottom:16 },
  btnPrimary: { background:BLUE, color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' },
  btnDanger: { background:'#fff', color:'#D85A30', border:'1px solid #D85A30', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' },
  btnEdit: { background:'#f0f4f8', color:BLUE, border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' },
  badge: { fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 },
  input: { width:'100%', padding:'8px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit', boxSizing:'border-box' },
  fieldLabel: { fontSize:12, color:'#666', marginBottom:4, display:'block' },
  modal: { position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 },
  modalBox: { background:'#fff', borderRadius:14, padding:28, width:440, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)' },
}

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth()
  const [view, setView] = useState('clinicas')
  const [clinics, setClinics] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [modalData, setModalData] = useState({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadClinics(), loadAdmins()])
    setLoading(false)
  }

  async function loadClinics() {
    const { data } = await supabase.from('clinics').select('*').order('name')
    setClinics(data || [])
  }

  async function loadAdmins() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'admin').order('last_name')
    setAdmins(data || [])
  }

  async function saveClinic() {
    setSaving(true)
    if (form.id) {
      await supabase.from('clinics').update({ name: form.name, plan: form.plan, is_active: form.is_active }).eq('id', form.id)
    } else {
      await supabase.from('clinics').insert({ name: form.name, plan: form.plan || 'basic', is_active: true })
    }
    await loadClinics(); setModal(null); setSaving(false)
  }

  async function deleteClinic(id) {
    if (!window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    await supabase.from('clinics').delete().eq('id', id)
    await loadClinics()
  }

  async function saveAdmin() {
    setSaving(true)
    if (form.id) {
      await supabase.from('profiles').update({ first_name: form.first_name, last_name: form.last_name, clinic_id: form.clinic_id, is_active: form.is_active }).eq('id', form.id)
    } else {
      // Crear usuario en Auth
      const { data: authData, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })
      if (error) { alert('Error: ' + error.message); setSaving(false); return }
      await supabase.from('profiles').update({ first_name: form.first_name, last_name: form.last_name, role: 'admin', clinic_id: form.clinic_id }).eq('id', authData.user.id)
    }
    await loadAdmins(); setModal(null); setSaving(false)
  }

  async function deleteAdmin(id) {
    if (!window.confirm('¿Estás seguro que querés eliminar este admin?')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    await loadAdmins()
  }

  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }

  const clinicAdminCount = (clinicId) => admins.filter(a => a.clinic_id === clinicId).length

  return (
    <div style={s.wrap}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoTitle}>MEDTRACK</div>
          <div style={s.logoSub}>Super Admin</div>
        </div>
        {[
          { key:'clinicas', label:'🏥 Clínicas' },
          { key:'admins', label:'👤 Administradores' },
        ].map(item => (
          <div key={item.key} onClick={() => setView(item.key)}
            style={{ ...s.menuItem, background: view===item.key ? '#f0fdf9' : 'transparent', color: view===item.key ? G : '#555', fontWeight: view===item.key ? 600 : 400 }}>
            {item.label}
          </div>
        ))}
        <div style={{ marginTop:'auto', padding:'16px 20px', borderTop:'0.5px solid #f0f0f0' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
          <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>Super Administrador</div>
          <button onClick={signOut} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:0 }}>Cerrar sesión</button>
        </div>
      </div>

      {/* Main */}
      <div style={s.main}>
        {/* Vista Clínicas */}
        {view === 'clinicas' && (
          <div>
            <div style={s.header}>
              <div>
                <div style={s.title}>Clínicas</div>
                <div style={s.sub}>Gestión de clínicas registradas en MedTrack</div>
              </div>
              <button style={s.btnPrimary} onClick={() => { setForm({ plan:'basic', is_active:true }); setModal('clinic') }}>+ Nueva clínica</button>
            </div>
            {loading ? <div style={{ color:'#999', fontSize:13 }}>Cargando...</div> : (
              <div style={s.card}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #f0f0f0' }}>
                      {['Clínica','Plan','Admins','Estado','Acciones'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clinics.map(clinic => (
                      <tr key={clinic.id} style={{ borderBottom:'0.5px solid #f5f5f5' }}>
                        <td style={{ padding:'10px 12px', fontWeight:500, color:'#1a1a1a' }}>{clinic.name}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ ...s.badge, background:'#E6F1FB', color:'#185FA5' }}>{clinic.plan}</span>
                        </td>
                        <td style={{ padding:'10px 12px', color:'#666' }}>{clinicAdminCount(clinic.id)}</td>
                        <td style={{ padding:'10px 12px' }}>
                          <span style={{ ...s.badge, background: clinic.is_active?'#E1F5EE':'#f5f5f5', color: clinic.is_active?'#0F6E56':'#999' }}>
                            {clinic.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td style={{ padding:'10px 12px' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            <button style={s.btnEdit} onClick={() => { setForm({ ...clinic }); setModal('clinic') }}>Editar</button>
                            <button style={s.btnDanger} onClick={() => deleteClinic(clinic.id)}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clinics.length === 0 && <div style={{ textAlign:'center', padding:24, color:'#999', fontSize:13 }}>No hay clínicas registradas</div>}
              </div>
            )}
          </div>
        )}

        {/* Vista Admins */}
        {view === 'admins' && (
          <div>
            <div style={s.header}>
              <div>
                <div style={s.title}>Administradores</div>
                <div style={s.sub}>Gestión de admins por clínica</div>
              </div>
            </div>
            {loading ? <div style={{ color:'#999', fontSize:13 }}>Cargando...</div> : (
              <div style={s.card}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid #f0f0f0' }}>
                      {['Administrador','Email','Clínica','Estado','Acciones'].map(h => (
                        <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => {
                      const clinic = clinics.find(c => c.id === admin.clinic_id)
                      return (
                        <tr key={admin.id} style={{ borderBottom:'0.5px solid #f5f5f5' }}>
                          <td style={{ padding:'10px 12px', fontWeight:500, color:'#1a1a1a' }}>{admin.last_name} {admin.first_name}</td>
                          <td style={{ padding:'10px 12px', color:'#666' }}>{admin.email}</td>
                          <td style={{ padding:'10px 12px' }}>
                            {clinic ? <span style={{ ...s.badge, background:'#E1F5EE', color:'#0F6E56' }}>{clinic.name}</span> : <span style={{ color:'#999' }}>Sin asignar</span>}
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <span style={{ ...s.badge, background: admin.is_active?'#E1F5EE':'#f5f5f5', color: admin.is_active?'#0F6E56':'#999' }}>
                              {admin.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td style={{ padding:'10px 12px' }}>
                            <div style={{ display:'flex', gap:6 }}>
                              <button style={s.btnEdit} onClick={() => { setForm({ ...admin }); setModal('admin') }}>Editar</button>
                              <button style={s.btnDanger} onClick={() => deleteAdmin(admin.id)}>Desactivar</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {admins.length === 0 && <div style={{ textAlign:'center', padding:24, color:'#999', fontSize:13 }}>No hay administradores registrados</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Clínica */}
      {modal === 'clinic' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:20 }}>{form.id ? 'Editar clínica' : 'Nueva clínica'}</div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Nombre de la clínica</label>
              <input value={form.name||''} onChange={f('name')} placeholder="Ej: Glow Clinic" style={s.input} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Plan</label>
              <select value={form.plan||'basic'} onChange={f('plan')} style={s.input}>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            {form.id && (
              <div style={{ marginBottom:14 }}>
                <label style={s.fieldLabel}>Estado</label>
                <select value={form.is_active?'true':'false'} onChange={e => setForm(p=>({...p,is_active:e.target.value==='true'}))} style={s.input}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setModal(null)} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
              <button onClick={saveClinic} disabled={saving} style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Admin */}
      {modal === 'admin' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:20 }}>Editar administrador</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={s.fieldLabel}>Nombre</label>
                <input value={form.first_name||''} onChange={f('first_name')} style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Apellido</label>
                <input value={form.last_name||''} onChange={f('last_name')} style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Clínica asignada</label>
              <select value={form.clinic_id||''} onChange={f('clinic_id')} style={s.input}>
                <option value="">Sin asignar</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Estado</label>
              <select value={form.is_active?'true':'false'} onChange={e => setForm(p=>({...p,is_active:e.target.value==='true'}))} style={s.input}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setModal(null)} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
              <button onClick={saveAdmin} disabled={saving} style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
