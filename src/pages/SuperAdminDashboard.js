import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const G = '#1D9E75'
const BLUE = '#1a3a5c'

const HEALTH_PROFESSIONS = ['Médico general','Médico especialista','Enfermero/a','Fisioterapeuta','Nutricionista','Psicólogo/a','Odontólogo/a','Otro profesional de la salud']
const ADMIN_PROFESSIONS = ['Administrador/a de clínica','Recepcionista','Contador/a','Asistente administrativo/a','Otro profesional administrativo']
const ALL_PROFESSIONS = [...HEALTH_PROFESSIONS, ...ADMIN_PROFESSIONS]

const CR_DATA = {
  'San José': ['San José','Escazú','Desamparados','Puriscal','Tarrazú','Aserrí','Mora','Goicoechea','Santa Ana','Alajuelita','Vázquez de Coronado','Acosta','Tibás','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Pérez Zeledón','León Cortés'],
  'Alajuela': ['Alajuela','San Ramón','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poás','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Río Cuarto'],
  'Cartago': ['Cartago','Paraíso','La Unión','Jiménez','Turrialba','Alvarado','Oreamuno','El Guarco'],
  'Heredia': ['Heredia','Barva','Santo Domingo','Santa Bárbara','San Rafael','San Isidro','Belén','Flores','San Pablo','Sarapiquí'],
  'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Cañas','Abangares','Tilarán','Nandayure','La Cruz','Hojancha'],
  'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Río Nuevo','Monteverde','Puerto Jiménez'],
  'Limón': ['Limón','Pococí','Siquirres','Talamanca','Matina','Guácimo'],
}
const isHealthPro = (prof) => HEALTH_PROFESSIONS.includes(prof)

const s = {
  wrap: { display:'flex', height:'100vh', fontFamily:'"Inter", system-ui, sans-serif', background:'#f5f5f5' },
  sidebar: { width:220, background:'#fff', borderRight:'0.5px solid #eee', display:'flex', flexDirection:'column', padding:'20px 0' },
  logo: { padding:'0 20px 20px', borderBottom:'0.5px solid #f0f0f0', marginBottom:16 },
  logoTitle: { fontSize:16, fontWeight:700, color:BLUE },
  logoSub: { fontSize:11, color:'#999' },
  menuItem: { padding:'9px 20px', fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:10 },
  main: { flex:1, overflowY:'auto', padding:28 },
  header: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:10 },
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
  modalBox: { background:'#fff', borderRadius:14, padding:28, width:480, maxWidth:'95vw', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', maxHeight:'90vh', overflowY:'auto' },
  th: { padding:'8px 12px', textAlign:'left', fontSize:11, color:'#999', textTransform:'uppercase', letterSpacing:'0.06em' },
  td: { padding:'10px 12px' },
}

export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth()
  const [view, setView] = useState(() => localStorage.getItem('superadminView') || 'clinicas')
  const [adminViewMode, setAdminViewMode] = useState('lista')
  const [branches, setBranches] = useState([])
  const [branchStaff, setBranchStaff] = useState([])
  const [clinics, setClinics] = useState([])
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [branchReport, setBranchReport] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [searchClinic, setSearchClinic] = useState('')
  const [filterPlan, setFilterPlan] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [searchAdmin, setSearchAdmin] = useState('')
  const [filterClinic, setFilterClinic] = useState('')

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showDrawer, setShowDrawer] = useState(false)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  function setViewPersist(v) { localStorage.setItem('superadminView', v); setView(v) }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadClinics(), loadAdmins()])
    setLoading(false)
  }

  async function loadClinics() {
    const { data } = await supabase.from('clinics').select('*').order('name')
    setClinics(data || [])
    const { data: br } = await supabase.from('branches').select('*').order('created_at', { ascending: true })
    setBranches(br || [])
    const { data: bs } = await supabase.from('branch_staff').select('branch_id, profile_id').order('created_at')
    setBranchStaff(bs || [])
  }

  async function saveBranch() {
    setSaving(true)
    if (form.id) {
      await supabase.from('branches').update({
        name: form.name, address: form.address || null,
        district: form.district || null, canton: form.canton || null,
        province: form.province || null, is_active: form.is_active !== false,
      }).eq('id', form.id)
    } else {
      await supabase.from('branches').insert({
        clinic_id: form.clinic_id, name: form.name,
        address: form.address || null, district: form.district || null,
        canton: form.canton || null, province: form.province || null,
        is_active: true,
      })
    }
    await loadClinics(); setModal(null); setSaving(false)
  }

  async function loadBranchReport(branch) {
    const [{ data: staff }, { data: patients }] = await Promise.all([
      supabase.from('branch_staff').select('profile:profile_id(first_name, last_name, role)').eq('branch_id', branch.id),
      supabase.from('branch_patients').select('patient:patient_id(profile:profile_id(first_name, last_name))').eq('branch_id', branch.id),
    ])
    const admins = (staff || []).filter(s => ['admin','branch_admin','clinic_admin'].includes(s.profile?.role))
    const personal = (staff || []).filter(s => !['admin','branch_admin','clinic_admin'].includes(s.profile?.role))
    setBranchReport({
      branch,
      admins: admins.map(s => `${s.profile?.first_name} ${s.profile?.last_name}`),
      personal: personal.map(s => `${s.profile?.first_name} ${s.profile?.last_name}`),
      patients: (patients || []).map(p => `${p.patient?.profile?.first_name} ${p.patient?.profile?.last_name}`),
    })
    setModal('confirm-delete-branch')
  }

  async function deleteBranch(branchId) {
    await supabase.from('branches').delete().eq('id', branchId)
    await loadClinics(); setModal(null); setBranchReport(null)
  }

  async function loadAdmins() {
    const { data } = await supabase.from('profiles').select('*').in('role', ['admin','clinic_admin','branch_admin']).order('last_name')
    setAdmins(data || [])
  }

  async function saveClinic() {
    if (!form.name || !form.legal_id || !form.plan) { alert('Nombre, cédula y plan son obligatorios'); return }
    setSaving(true)
    const payload = {
      name: form.name, legal_name: form.legal_name||null, legal_id: form.legal_id||null,
      country: form.country||'Costa Rica', province: form.province||null, canton: form.canton||null,
      district: form.district||null, address: form.address||null,
      phone: form.phone||null, phone_country_code: form.phone_country_code||'+506',
      whatsapp: form.whatsapp||null, email: form.email||null, website: form.website||null,
      plan: form.plan||'basic', contract_ref: form.contract_ref||null,
      municipal_permit: form.municipal_permit||'no', health_permit: form.health_permit||'no',
      operational: form.operational||'no', send_welcome_email: form.send_welcome_email!==false,
      enabled_modules: ['enterprise_plus','enterprise'].includes(form.plan) ? ['integral','metabolica','estetica','fisioterapia','enfermeria'] : (form.enabled_modules||[]),
    }
    if (form.id) {
      const { error: updateErr } = await supabase.from('clinics').update({ ...payload, is_active: form.is_active }).eq('id', form.id)
      if (updateErr) { alert('Error al actualizar: ' + updateErr.message); setSaving(false); return }
    } else {
      const { error: insertErr } = await supabase.from('clinics').insert({ ...payload, is_active: true })
      if (insertErr) { alert('Error al crear: ' + insertErr.message); setSaving(false); return }
    }
    // Crear sucursal y correo si es clínica nueva
    if (!form.id) {
      const { data: newClinic } = await supabase.from('clinics').select('id').eq('name', form.name).order('created_at', { ascending: false }).limit(1).single()
      if (newClinic?.id) {
        await supabase.from('branches').insert({
          clinic_id: newClinic.id,
          name: form.name,
          address: form.address || null,
          district: form.district || null,
          canton: form.canton || null,
          province: form.province || null,
          is_active: true,
        })
      }
      if (form.send_welcome_email !== false && form.email) {
        await supabase.functions.invoke('clinic-welcome', {
          body: { clinic_name: form.name, clinic_email: form.email, plan: form.plan || 'basic', legal_name: form.legal_name || null, clinic_id: newClinic?.id || '' }
        })
      }
    }
    // Cambio de plan si es edición y el plan cambió
    if (form.id && form.email) {
      const prevClinic = clinics.find(c => c.id === form.id)
      if (prevClinic && prevClinic.plan !== form.plan) {
        // Si tiene suscripción activa, actualizar via API de Lemon
        if (prevClinic.lemon_subscription_id) {
          await supabase.functions.invoke('lemon-update-plan', {
            body: { clinic_id: form.id, new_plan: form.plan }
          })
        }
        // Siempre enviar correo informando el cambio
        await supabase.functions.invoke('clinic-plan-change', {
          body: { clinic_name: form.name, clinic_email: form.email, old_plan: prevClinic.plan, new_plan: form.plan, legal_name: form.legal_name || null }
        })
      }
    }
    await loadClinics(); setModal(null); setSaving(false)
  }

  async function deleteClinic(id) {
    if (!window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) return
    await supabase.from('clinics').delete().eq('id', id)
    await loadClinics()
  }

  async function createAdmin() {
    setError('')
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.clinic_id || !form.profession) {
      setError('Todos los campos son obligatorios'); return
    }
    if (form.role === 'branch_admin' && !form.branch_id) {
      setError('Debes seleccionar una sucursal para el admin de sucursal'); return
    }
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres'); return
    }
    setSaving(true)
    try {
      // Guardar sesión actual del superadmin
      const { data: { session: currentSession } } = await supabase.auth.getSession()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { first_name: form.first_name, last_name: form.last_name, role: form.role || 'admin' } }
      })
      if (authError) { setError('Error: ' + authError.message); setSaving(false); return }
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 600))
        const { data } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single()
        if (data?.id) break
      }
      await supabase.from('profiles').update({
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role || 'admin',
        clinic_id: form.clinic_id,
        profession: form.profession,
        is_active: true,
        is_health_professional: isHealthPro(form.profession),
      }).eq('id', authData.user.id)
      if (form.role === 'branch_admin' && form.branch_id) {
        await supabase.from('branch_staff').insert({ branch_id: form.branch_id, profile_id: authData.user.id })
      }

      // Restaurar sesión del superadmin
      if (currentSession) {
        await supabase.auth.setSession({ access_token: currentSession.access_token, refresh_token: currentSession.refresh_token })
      }

      await loadAdmins(); setModal(null)
    } catch(e) { setError('Error: ' + e.message) }
    setSaving(false)
  }

  async function saveAdmin() {
    setSaving(true)
    await supabase.from('profiles').update({
      first_name: form.first_name,
      last_name: form.last_name,
      clinic_id: form.clinic_id,
      profession: form.profession,
      is_active: form.is_active,
      is_health_professional: isHealthPro(form.profession),
    }).eq('id', form.id)
    // Actualizar sucursal si es branch_admin
    if ((form.role === 'branch_admin' || form.role === 'admin') && form.branch_id) {
      await supabase.from('branch_staff').upsert({ profile_id: form.id, branch_id: form.branch_id }, { onConflict: 'profile_id' })
    }
    await loadClinics(); await loadAdmins(); setModal(null); setSaving(false)
  }

  async function deleteAdmin(id) {
    if (!window.confirm('¿Estás seguro que querés desactivar este admin?')) return
    await supabase.from('profiles').update({ is_active: false }).eq('id', id)
    await loadAdmins()
  }

  const f = key => e => setForm(p => ({ ...p, [key]: e.target.value }))
  const clinicAdminCount = (clinicId) => admins.filter(a => a.clinic_id === clinicId).length

  const ProfessionSelect = ({ value, onChange }) => (
    <select value={value||''} onChange={onChange} style={s.input}>
      <option value="">Seleccioná una profesión...</option>
      <optgroup label="Profesionales de salud">
        {HEALTH_PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </optgroup>
      <optgroup label="Profesionales administrativos">
        {ADMIN_PROFESSIONS.map(p => <option key={p} value={p}>{p}</option>)}
      </optgroup>
    </select>
  )

  const menuItems = [
    { key:'clinicas', label:'🏥 Clínicas' },
    { key:'admins', label:'👤 Administradores' },
  ]

  return (
    <div style={s.wrap}>
      {/* Header móvil */}
      {isMobile && (
        <div style={{ position:'fixed', top:0, left:0, right:0, height:52, background:'#fff', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', zIndex:100 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>MEDTRACK</div>
            <div style={{ fontSize:9, color:'#999' }}>Super Admin</div>
          </div>
          <button onClick={() => setShowDrawer(true)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:BLUE }}>☰</button>
        </div>
      )}

      {/* Drawer móvil */}
      {isMobile && showDrawer && (
        <>
          <div onClick={() => setShowDrawer(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200 }} />
          <div style={{ position:'fixed', top:0, left:0, bottom:0, width:'75vw', maxWidth:280, background:'#fff', zIndex:201, display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'16px 14px', borderBottom:'0.5px solid #eee', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:BLUE }}>MEDTRACK</div>
                <div style={{ fontSize:10, color:'#999' }}>Super Admin</div>
              </div>
              <button onClick={() => setShowDrawer(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
            </div>
            <div style={{ flex:1, padding:'8px 0' }}>
              {menuItems.map(item => (
                <div key={item.key} onClick={() => { setViewPersist(item.key); setShowDrawer(false) }}
                  style={{ padding:'12px 16px', cursor:'pointer', fontSize:14, borderLeft: view === item.key ? `3px solid ${G}` : '3px solid transparent', background: view === item.key ? '#E1F5EE' : 'transparent', color: view === item.key ? G : '#444', fontWeight: view === item.key ? 500 : 400 }}>
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{ padding:'16px', borderTop:'0.5px solid #eee' }}>
              <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
              <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>Super Administrador</div>
              <button onClick={signOut} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:0 }}>Cerrar sesión</button>
            </div>
          </div>
        </>
      )}

      {/* Sidebar desktop */}
      {!isMobile && <div style={s.sidebar}>
        <div style={s.logo}>
          <div style={s.logoTitle}>MEDTRACK</div>
          <div style={s.logoSub}>Super Admin</div>
        </div>
        {menuItems.map(item => (
          <div key={item.key} onClick={() => setViewPersist(item.key)}
            style={{ ...s.menuItem, background: view===item.key?'#f0fdf9':'transparent', color: view===item.key?G:'#555', fontWeight: view===item.key?600:400 }}>
            {item.label}
          </div>
        ))}
        <div style={{ marginTop:'auto', padding:'16px 20px', borderTop:'0.5px solid #f0f0f0' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
          <div style={{ fontSize:11, color:'#999', marginBottom:8 }}>Super Administrador</div>
          <button onClick={signOut} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:0 }}>Cerrar sesión</button>
        </div>
      </div>

      <div style={{ ...s.main, padding: isMobile ? '68px 12px 16px' : 28 }}>
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
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#bbb' }}>🔍</span>
                <input value={searchClinic} onChange={e=>setSearchClinic(e.target.value)} placeholder="Buscar clínica..." style={{ width:'100%', padding:'7px 10px 7px 30px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
              <select value={filterPlan} onChange={e=>setFilterPlan(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', color: filterPlan?'#1a3a5c':'#999' }}>
                <option value="">Todos los planes</option>
                <option value="basic">Basic</option>
                <option value="starter">Starter</option>
                <option value="gold">Gold</option>
                <option value="gold_plus">Gold+</option>
                <option value="enterprise">Enterprise</option>
                <option value="enterprise_plus">Enterprise+</option>
              </select>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', color: filterStatus?'#1a3a5c':'#999' }}>
                <option value="">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="inactive">Inactivas</option>
              </select>
              {(searchClinic||filterPlan||filterStatus) && <button onClick={()=>{setSearchClinic('');setFilterPlan('');setFilterStatus('')}} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>✕ Limpiar</button>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:16 }}>
              {clinics.filter(clinic => {
                const q = searchClinic.toLowerCase()
                if (q && !clinic.name?.toLowerCase().includes(q) && !clinic.legal_name?.toLowerCase().includes(q) && !clinic.email?.toLowerCase().includes(q)) return false
                if (filterPlan && clinic.plan !== filterPlan) return false
                if (filterStatus === 'active' && !clinic.is_active) return false
                if (filterStatus === 'inactive' && clinic.is_active) return false
                return true
              }).map(clinic => {
                const permitLabel = { yes:'✅ Sí', in_progress:'🟡 En trámite', no:'❌ No' }
                const planLabel = { basic:'Basic', starter:'Starter', gold:'Gold', gold_plus:'Gold+', enterprise:'Enterprise', enterprise_plus:'Enterprise+' }
                const planColor = { basic:'#185FA5', starter:'#0F6E56', gold:'#854F0B', gold_plus:'#b45309', enterprise:'#553c9a', enterprise_plus:'#1a1a2e' }
                const planBg = { basic:'#E6F1FB', starter:'#e6f7f3', gold:'#FAEEDA', gold_plus:'#fef3c7', enterprise:'#f0ebff', enterprise_plus:'#e8e8f0' }
                return (
                  <div key={clinic.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
                    {/* Header card */}
                    <div style={{ background: clinic.is_active ? BLUE : '#718096', padding:'16px 18px' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ fontSize:16, fontWeight:700, color:'#fff', lineHeight:1.3 }}>{clinic.name}</div>
                        <span style={{ ...s.badge, background:'rgba(255,255,255,0.2)', color:'#fff', fontSize:10, flexShrink:0, marginLeft:8 }}>{clinic.is_active?'Activa':'Inactiva'}</span>
                      </div>
                      <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                        <span style={{ ...s.badge, background: planBg[clinic.plan]||'#E6F1FB', color: planColor[clinic.plan]||'#185FA5', fontSize:10 }}>{planLabel[clinic.plan]||clinic.plan}</span>
                        <span style={{ ...s.badge, background:'rgba(255,255,255,0.15)', color:'#fff', fontSize:10 }}>{clinicAdminCount(clinic.id)} admin{clinicAdminCount(clinic.id)!==1?'s':''}</span>
                      </div>
                    </div>
                    {/* Body card */}
                    <div style={{ padding:'14px 18px' }}>
                      {[
                        ['Razón social', clinic.legal_name],
                        ['Cédula jurídica/física', clinic.legal_id],
                        ['País', clinic.country],
                        ['Provincia', clinic.province],
                        ['Cantón', clinic.canton],
                        ['Distrito', clinic.district],
                        ['Dirección', clinic.address],
                        ['Teléfono', clinic.phone ? `${clinic.phone_country_code||''} ${clinic.phone}` : null],
                        ['WhatsApp', clinic.whatsapp],
                        ['Correo', clinic.email],
                        ['Sitio web', clinic.website],
                        ['Contrato', clinic.contract_ref],
                        ['Permiso municipal', clinic.municipal_permit ? permitLabel[clinic.municipal_permit] : null],
                        ['Permiso sanitario', clinic.health_permit ? permitLabel[clinic.health_permit] : null],
                        ['Lista para operar', clinic.operational ? permitLabel[clinic.operational] : null],
                      ].map(([label, value]) => value ? (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'0.5px solid #f5f5f5', gap:8 }}>
                          <span style={{ fontSize:11, color:'#999', flexShrink:0 }}>{label}</span>
                          <span style={{ fontSize:11, color:'#444', textAlign:'right', wordBreak:'break-word', maxWidth:'60%' }}>{value}</span>
                        </div>
                      ) : null)}
                    </div>
                    {/* Sucursales */}
                    <div style={{ padding:'10px 18px', borderTop:'0.5px solid #f0f0f0' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#1a3a5c', textTransform:'uppercase', letterSpacing:'0.05em' }}>Sucursales</span>
                        <button onClick={() => { setForm({ clinic_id: clinic.id, name: clinic.name, is_active: true }); setModal('branch') }}
                          style={{ fontSize:10, background:'#1a3a5c', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', cursor:'pointer' }}>
                          + Agregar
                        </button>
                      </div>
                      {branches.filter(b => b.clinic_id === clinic.id).map(branch => (
                        <div key={branch.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background:'#f7fafc', borderRadius:8, marginBottom:6, gap:8 }}>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:600, color:'#222' }}>{branch.name}</div>
                            {(branch.canton || branch.province) && <div style={{ fontSize:10, color:'#999' }}>{[branch.canton, branch.province].filter(Boolean).join(', ')}</div>}
                          </div>
                          <span style={{ fontSize:10, color: branch.is_active ? '#0F6E56' : '#999', background: branch.is_active ? '#e6f7f3' : '#f5f5f5', padding:'2px 8px', borderRadius:10, flexShrink:0 }}>{branch.is_active ? 'Activa' : 'Inactiva'}</span>
                          <button onClick={() => { setForm({ ...branch }); setModal('branch') }}
                            style={{ fontSize:10, background:'none', border:'1px solid #e2e8f0', borderRadius:6, padding:'2px 8px', cursor:'pointer', color:'#555', flexShrink:0 }}>
                            Editar
                          </button>
                          <button onClick={() => loadBranchReport(branch)}
                            style={{ fontSize:10, background:'none', border:'1px solid #fca5a5', borderRadius:6, padding:'2px 8px', cursor:'pointer', color:'#dc2626', flexShrink:0 }}>
                            Eliminar
                          </button>
                        </div>
                      ))}
                      {branches.filter(b => b.clinic_id === clinic.id).length === 0 && <div style={{ fontSize:11, color:'#ccc', textAlign:'center', padding:8 }}>Sin sucursales</div>}
                    </div>
                    {/* Footer card */}
                    <div style={{ padding:'10px 18px', borderTop:'0.5px solid #f0f0f0', display:'flex', gap:8 }}>
                      <button style={{ ...s.btnEdit, flex:1, textAlign:'center' }} onClick={() => { setForm({ ...clinic }); setModal('clinic') }}>Editar</button>
                      <button style={{ ...s.btnDanger, flex:1, textAlign:'center' }} onClick={() => deleteClinic(clinic.id)}>Eliminar</button>
                    </div>
                  </div>
                )
              })}
              {clinics.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:40, color:'#999', fontSize:13 }}>No hay clínicas registradas</div>}
            </div>
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
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <div style={{ display:'flex', background:'#f5f5f5', borderRadius:8, padding:3, gap:2 }}>
                  {[['lista','☰ Lista'],['diagrama','⬡ Diagrama']].map(([k,l]) => (
                    <button key={k} onClick={() => setAdminViewMode(k)}
                      style={{ padding:'5px 12px', borderRadius:6, border:'none', cursor:'pointer', fontSize:12, fontWeight: adminViewMode===k?600:400, background: adminViewMode===k?'#fff':'transparent', color: adminViewMode===k?BLUE:'#888', boxShadow: adminViewMode===k?'0 1px 4px rgba(0,0,0,0.08)':'none' }}>
                      {l}
                    </button>
                  ))}
                </div>
                <button style={s.btnPrimary} onClick={() => { setForm({ profession:'', clinic_id:'', role:'clinic_admin' }); setError(''); setModal('new-admin') }}>+ Nuevo admin</button>
              </div>
            </div>

            {/* Vista Diagrama */}
            {adminViewMode === 'diagrama' && (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap:16 }}>
                {clinics.map(clinic => {
                  const clinicAdmins = admins.filter(a => a.clinic_id === clinic.id && a.role === 'clinic_admin')
                  const branchAdmins = admins.filter(a => a.clinic_id === clinic.id && ['admin','branch_admin'].includes(a.role))
                  return (
                    <div key={clinic.id} style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:20 }}>
                      {/* Clínica */}
                      <div style={{ textAlign:'center', marginBottom:16 }}>
                        <div style={{ display:'inline-block', background:BLUE, color:'#fff', borderRadius:10, padding:'8px 24px', fontSize:14, fontWeight:700 }}>{clinic.name}</div>
                        <div style={{ fontSize:11, color:'#999', marginTop:4 }}>{clinic.plan?.toUpperCase()}</div>
                      </div>

                      {/* Clinic Admins */}
                      {clinicAdmins.length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:16 }}>
                          <div style={{ width:1, height:20, background:'#e2e8f0' }} />
                          <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Admin de clínica</div>
                          <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
                            {clinicAdmins.map(a => (
                              <div key={a.id} style={{ background:'#e6f7f3', border:'1px solid #0F6E56', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:500, color:'#0F6E56', textAlign:'center' }}>
                                {a.first_name} {a.last_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Branch Admins por sucursal */}
                      {branches.filter(b => b.clinic_id === clinic.id).length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                          <div style={{ width:1, height:20, background:'#e2e8f0' }} />
                          <div style={{ display:'flex', gap:16, flexWrap:'wrap', justifyContent:'center' }}>
                            {branches.filter(b => b.clinic_id === clinic.id).map(branch => {
                              const bAdmins = branchAdmins.filter(a => {
                                const inBranchStaff = branchStaff?.some(bs => bs.branch_id === branch.id && bs.profile_id === a.id)
                                return inBranchStaff
                              })
                              return (
                                <div key={branch.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', minWidth:140 }}>
                                  <div style={{ fontSize:10, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Admin de sucursal</div>
                                  <div style={{ fontSize:11, color:'#1a3a5c', fontWeight:600, marginBottom:8 }}>{branch.name}</div>
                                  {bAdmins.length > 0 ? bAdmins.map(a => (
                                    <div key={a.id} style={{ background:'#e6f1fb', border:'1px solid #1a3a5c', borderRadius:8, padding:'6px 14px', fontSize:12, fontWeight:500, color:'#1a3a5c', textAlign:'center', marginBottom:4 }}>
                                      {a.first_name} {a.last_name}
                                    </div>
                                  )) : <div style={{ fontSize:11, color:'#ccc' }}>Sin admin asignado</div>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Vista Lista */}
            {adminViewMode === 'lista' && <>
            <div style={{ background:'#fff', border:'0.5px solid #eee', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'#bbb' }}>🔍</span>
                <input value={searchAdmin} onChange={e=>setSearchAdmin(e.target.value)} placeholder="Buscar por nombre o email..." style={{ width:'100%', padding:'7px 10px 7px 30px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
              <select value={filterClinic} onChange={e=>setFilterClinic(e.target.value)} style={{ padding:'7px 10px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, outline:'none', color: filterClinic?'#1a3a5c':'#999' }}>
                <option value="">Todas las clínicas</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {(searchAdmin||filterClinic) && <button onClick={()=>{setSearchAdmin('');setFilterClinic('')}} style={{ fontSize:12, color:'#D85A30', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>✕ Limpiar</button>}
            </div>
            <div style={s.card}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #f0f0f0' }}>
                    {['Administrador','Email','Profesión','Clínica','Perfil','Estado','Acciones'].map(h => <th key={h} style={s.th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {admins.filter(admin => {
                    const q = searchAdmin.toLowerCase()
                    if (q && !`${admin.first_name} ${admin.last_name}`.toLowerCase().includes(q) && !admin.email?.toLowerCase().includes(q)) return false
                    if (filterClinic && admin.clinic_id !== filterClinic) return false
                    return true
                  }).map(admin => {
                    const clinic = clinics.find(c => c.id === admin.clinic_id)
                    return (
                      <tr key={admin.id} style={{ borderBottom:'0.5px solid #f5f5f5' }}>
                        <td style={{ ...s.td, fontWeight:500, color:'#1a1a1a' }}>{admin.last_name} {admin.first_name}</td>
                        <td style={{ ...s.td, color:'#666', fontSize:12 }}>{admin.email}</td>
                        <td style={{ ...s.td, color:'#666', fontSize:12 }}>{admin.profession || '—'}</td>
                        <td style={s.td}>{clinic ? <span style={{ ...s.badge, background:'#E1F5EE', color:'#0F6E56' }}>{clinic.name}</span> : <span style={{ color:'#999' }}>Sin asignar</span>}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: admin.is_health_professional?'#E6F1FB':'#f5f5f5', color: admin.is_health_professional?'#185FA5':'#666' }}>
                            {admin.is_health_professional ? '🩺 Salud' : '📋 Admin'}
                          </span>
                        </td>
                        <td style={s.td}><span style={{ ...s.badge, background: admin.is_active?'#E1F5EE':'#f5f5f5', color: admin.is_active?'#0F6E56':'#999' }}>{admin.is_active?'Activo':'Inactivo'}</span></td>
                        <td style={s.td}>
                          <div style={{ display:'flex', gap:6 }}>
                            <button style={s.btnEdit} onClick={() => { setForm({ ...admin }); setModal('edit-admin') }}>Editar</button>
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
            </>}
          </div>
        )}
      </div>

      {/* Modal Clínica */}
      {modal === 'clinic' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:20 }}>{form.id?'Editar clínica':'Nueva clínica'}</div>

            <div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Información general</div>
            <div style={{ marginBottom:12 }}>
              <label style={s.fieldLabel}>Nombre comercial <span style={{ color:'#D85A30' }}>*</span></label>
              <input value={form.name||''} onChange={f('name')} placeholder="Ej: Glow Clinic" style={s.input} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>Cédula jurídica o física <span style={{ color:'#D85A30' }}>*</span></label>
                <input value={form.legal_id||''} onChange={f('legal_id')} placeholder="3-101-123456" style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Razón social</label>
                <input value={form.legal_name||''} onChange={f('legal_name')} placeholder="Clínica XYZ S.A." style={s.input} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>Correo de contacto</label>
                <input value={form.email||''} onChange={f('email')} type="email" placeholder="info@clinica.com" style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Sitio web</label>
                <input value={form.website||''} onChange={f('website')} placeholder="www.clinica.com" style={s.input} />
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>Teléfono</label>
                <div style={{ display:'flex', gap:6 }}>
                  <input value={form.phone_country_code||'+506'} onChange={f('phone_country_code')} style={{ ...s.input, width:70 }} placeholder="+506" />
                  <input value={form.phone||''} onChange={f('phone')} placeholder="2222-2222" style={s.input} />
                </div>
              </div>
              <div>
                <label style={s.fieldLabel}>WhatsApp</label>
                <input value={form.whatsapp||''} onChange={f('whatsapp')} placeholder="+506 8888-8888" style={s.input} />
              </div>
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, marginTop:16 }}>Ubicación</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>País</label>
                <select value={form.country||'Costa Rica'} onChange={f('country')} style={s.input}>
                  <option value="Costa Rica">Costa Rica</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Provincia</label>
                <select value={form.province||''} onChange={e => setForm(p=>({...p, province:e.target.value, canton:'', district:''}))} style={s.input}>
                  <option value="">Seleccioná...</option>
                  {Object.keys(CR_DATA).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Cantón</label>
                <select value={form.canton||''} onChange={e => setForm(p=>({...p, canton:e.target.value, district:''}))} style={s.input} disabled={!form.province}>
                  <option value="">Seleccioná...</option>
                  {(CR_DATA[form.province]||[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Distrito</label>
                <input value={form.district||''} onChange={f('district')} placeholder="Distrito" style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={s.fieldLabel}>Dirección detallada</label>
              <input value={form.address||''} onChange={f('address')} placeholder="200m norte del parque..." style={s.input} />
            </div>

            <div style={{ fontSize:12, fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10, marginTop:16 }}>Plan y permisos</div>
            <div style={{ marginBottom:12 }}>
              <label style={s.fieldLabel}>Plan adquirido <span style={{ color:'#D85A30' }}>*</span></label>
              <select value={form.plan||'basic'} onChange={e => {
                const newPlan = e.target.value
                setForm(p => ({
                  ...p,
                  plan: newPlan,
                  enabled_modules: newPlan === 'enterprise' 
                    ? ['integral','metabolica','estetica','fisioterapia','enfermeria']
                    : (p.enabled_modules||[]).slice(0, newPlan === 'basic' ? 2 : 5)
                }))
              }} style={s.input}>
                <option value="basic">Basic</option>
                <option value="starter">Starter</option>
                <option value="gold">Gold</option>
                <option value="gold_plus">Gold+</option>
                <option value="enterprise">Enterprise</option>
                <option value="enterprise_plus">Enterprise+</option>
              </select>
              {form.plan && (
                <div style={{ marginTop:8, background:'#f7fafc', border:'1px solid #e2e8f0', borderRadius:8, padding:'10px 12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                    <div style={{ fontSize:11, fontWeight:600, color:BLUE }}>Incluye:</div>
                    <div style={{ fontSize:12, fontWeight:700, color:BLUE, background:'#e8f0f8', padding:'2px 10px', borderRadius:20 }}>
                      {{'basic':'$14.99/mes','starter':'$49.99/mes','gold':'$109.99/mes','gold_plus':'$249.99/mes','enterprise':'$499.99/mes','enterprise_plus':'$999.99/mes'}[form.plan]}
                    </div>
                  </div>
                  {{'basic':['Agenda ilimitada','Hasta 100 pacientes','Sin módulos clínicos','Sin correos automáticos','1 sucursal'],'starter':['Agenda ilimitada','Hasta 100 pacientes','Hasta 2 profesionales','2 módulos clínicos por paciente','Correos automáticos','1 sucursal'],'gold':['Agenda ilimitada','Hasta 300 pacientes','Hasta 10 profesionales','4 módulos clínicos por paciente','Correos automáticos','Reportes básicos','1 sucursal'],'gold_plus':['Agenda ilimitada','Hasta 500 pacientes','Hasta 20 profesionales','6 módulos por paciente incluyendo exclusivos','Correos automáticos','Reportes avanzados con exportación','Personalización de marca','Soporte prioritario','Hasta 2 sucursales'],'enterprise':['Agenda ilimitada','Hasta 1500 pacientes','Hasta 50 profesionales','10 módulos por paciente incluyendo exclusivos','Correos automáticos','Reportes avanzados con exportación','Personalización de marca','Soporte prioritario + marketing','Hasta 5 sucursales'],'enterprise_plus':['Agenda ilimitada','Pacientes ilimitados','Profesionales ilimitados','Módulos ilimitados todos exclusivos','Correos automáticos','Reportes avanzados con exportación','Personalización de marca','Soporte dedicado + marketing','Sucursales ilimitadas']}[form.plan]?.map((item,i) => (
                    <div key={i} style={{ fontSize:12, color:'#555', marginBottom:3 }}>✓ {item}</div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={s.fieldLabel}>Módulos habilitados <span style={{ color:'#D85A30' }}>*</span></label>
              <div style={{ fontSize:11, color:'#718096', marginBottom:8 }}>
                {{'basic':'Sin módulos clínicos','starter':'Seleccioná hasta 2 módulos','gold':'Seleccioná hasta 4 módulos','gold_plus':'Seleccioná hasta 6 módulos','enterprise':'Seleccioná hasta 10 módulos','enterprise_plus':'Todos los módulos disponibles'}[form.plan||'basic']}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                {[['integral','Atención Integral'],['metabolica','Atención Metabólica'],['estetica','Atención Estética'],['fisioterapia','Fisioterapia'],['enfermeria','Enfermería']].map(([key, label]) => {
                  const selected = (form.enabled_modules||[]).includes(key)
                  const maxModules = {'basic':0,'starter':2,'gold':4,'gold_plus':6,'enterprise':10,'enterprise_plus':99}[form.plan||'basic']
                  const atMax = (form.enabled_modules||[]).length >= maxModules && !selected
                  return (
                    <div key={key} onClick={() => {
                      if (form.plan === 'enterprise') {
                        const all = ['integral','metabolica','estetica','fisioterapia','enfermeria']
                        setForm(p => ({...p, enabled_modules: all}))
                        return
                      }
                      if (atMax) return
                      setForm(p => ({
                        ...p,
                        enabled_modules: selected
                          ? (p.enabled_modules||[]).filter(m => m !== key)
                          : [...(p.enabled_modules||[]), key]
                      }))
                    }}
                    style={{ padding:'6px 14px', borderRadius:20, border:`1px solid ${selected?'#1a3a5c':'#e2e8f0'}`, background: selected?'#1a3a5c': atMax?'#f5f5f5':'#f7fafc', color: selected?'#fff': atMax?'#ccc':'#555', fontSize:12, fontWeight: selected?600:400, cursor: atMax?'not-allowed':'pointer', userSelect:'none' }}>
                      {label}
                    </div>
                  )
                })}
              </div>
              {form.plan === 'enterprise' && (
                <div style={{ fontSize:11, color:'#0F6E56', marginTop:6 }}>✅ Plan Enterprise — todos los módulos habilitados automáticamente</div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>Permiso municipal</label>
                <select value={form.municipal_permit||'no'} onChange={f('municipal_permit')} style={s.input}>
                  <option value="yes">Sí</option>
                  <option value="in_progress">En trámite</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Permiso sanitario</label>
                <select value={form.health_permit||'no'} onChange={f('health_permit')} style={s.input}>
                  <option value="yes">Sí</option>
                  <option value="in_progress">En trámite</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Lista para operar</label>
                <select value={form.operational||'no'} onChange={f('operational')} style={s.input}>
                  <option value="yes">Sí</option>
                  <option value="in_progress">En trámite</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>
            {(form.municipal_permit === 'no' || form.health_permit === 'no') && (
              <div style={{ background:'#FAEEDA', border:'1px solid #F59E0B', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:12, color:'#854F0B' }}>
                ⚠️ <strong>Atención:</strong> Esta clínica tiene permisos pendientes. Verifique esta información nuevamente en un lapso de tiempo oportuno antes de autorizar operaciones.
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={s.fieldLabel}>Referencia de contrato</label>
                <input value={form.contract_ref||''} onChange={f('contract_ref')} placeholder="MT-2026-001" style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Enviar correo de bienvenida</label>
                <select value={form.send_welcome_email===false?'false':'true'} onChange={e => setForm(p=>({...p,send_welcome_email:e.target.value==='true'}))} style={s.input}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            {form.id && (
              <div style={{ marginBottom:12 }}>
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

      {/* Modal Nuevo Admin */}
      {modal === 'new-admin' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:20 }}>Nuevo administrador</div>
            {error && <div style={{ background:'#FAECE7', color:'#C24B2A', fontSize:13, padding:'8px 12px', borderRadius:8, marginBottom:14 }}>{error}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={s.fieldLabel}>Nombre <span style={{ color:'#D85A30' }}>*</span></label>
                <input value={form.first_name||''} onChange={f('first_name')} placeholder="María" style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Apellido <span style={{ color:'#D85A30' }}>*</span></label>
                <input value={form.last_name||''} onChange={f('last_name')} placeholder="Rodríguez" style={s.input} />
              </div>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Correo electrónico <span style={{ color:'#D85A30' }}>*</span></label>
              <input value={form.email||''} onChange={f('email')} type="email" placeholder="admin@clinica.com" style={s.input} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Contraseña temporal <span style={{ color:'#D85A30' }}>*</span></label>
              <input value={form.password||''} onChange={f('password')} type="password" placeholder="Mínimo 6 caracteres" style={s.input} />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Profesión <span style={{ color:'#D85A30' }}>*</span></label>
              <ProfessionSelect value={form.profession} onChange={f('profession')} />
              {form.profession && (
                <div style={{ fontSize:11, marginTop:4, color: isHealthPro(form.profession)?'#0F6E56':'#718096' }}>
                  {isHealthPro(form.profession) ? '✅ Aparecerá en lista de médicos y podrá ser asignado a módulos' : 'ℹ️ Solo acceso administrativo, no aparecerá en lista de médicos'}
                </div>
              )}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Rol <span style={{ color:'#D85A30' }}>*</span></label>
              <select value={form.role||'clinic_admin'} onChange={e => setForm(p=>({...p, role:e.target.value, branch_id:''}))} style={s.input}>
                <option value="clinic_admin">Admin de clínica</option>
                <option value="branch_admin">Admin de sucursal</option>
              </select>
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Clínica asignada <span style={{ color:'#D85A30' }}>*</span></label>
              <select value={form.clinic_id||''} onChange={e => setForm(p=>({...p, clinic_id:e.target.value, branch_id:''}))} style={s.input}>
                <option value="">Seleccioná una clínica...</option>
                {clinics.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {form.role === 'branch_admin' && form.clinic_id && (
              <div style={{ marginBottom:14 }}>
                <label style={s.fieldLabel}>Sucursal asignada <span style={{ color:'#D85A30' }}>*</span></label>
                <select value={form.branch_id||''} onChange={f('branch_id')} style={s.input}>
                  <option value="">Seleccioná una sucursal...</option>
                  {branches.filter(b => b.clinic_id === form.clinic_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setModal(null)} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
              <button onClick={createAdmin} disabled={saving} style={{ ...s.btnPrimary, flex:1, opacity:saving?0.7:1 }}>{saving?'Creando...':'Crear admin'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Admin */}
      {modal === 'edit-admin' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:8 }}>Editar administrador</div>
            {(() => {
              const clinic = clinics.find(c => c.id === form.clinic_id)
              const bStaff = branchStaff.find(bs => bs.profile_id === form.id)
              const branch = bStaff ? branches.find(b => b.id === bStaff.branch_id) : null
              return (
                <div style={{ background:'#f0f4f8', borderRadius:8, padding:'8px 12px', marginBottom:16, fontSize:12, color:'#1a3a5c' }}>
                  {form.role === 'clinic_admin' && clinic && `Este usuario es administrador de la clínica ${clinic.name}`}
                  {(form.role === 'branch_admin' || form.role === 'admin') && clinic && branch && `Este usuario es administrador de la sucursal ${branch.name} de la clínica ${clinic.name}`}
                  {(form.role === 'branch_admin' || form.role === 'admin') && clinic && !branch && `Este usuario es administrador de la clínica ${clinic.name} (sin sucursal asignada)`}
                </div>
              )
            })()}
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
              <label style={s.fieldLabel}>Profesión</label>
              <ProfessionSelect value={form.profession} onChange={f('profession')} />
              {form.profession && (
                <div style={{ fontSize:11, marginTop:4, color: isHealthPro(form.profession)?'#0F6E56':'#718096' }}>
                  {isHealthPro(form.profession) ? '✅ Aparecerá en lista de médicos' : 'ℹ️ Solo acceso administrativo'}
                </div>
              )}
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Clínica asignada</label>
              <select value={form.clinic_id||''} onChange={e => setForm(p=>({...p, clinic_id:e.target.value, branch_id:''}))} style={s.input}>
                <option value="">Sin asignar</option>
                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {(form.role === 'branch_admin' || form.role === 'admin') && form.clinic_id && (
              <div style={{ marginBottom:14 }}>
                <label style={s.fieldLabel}>Sucursal asignada</label>
                <select value={form.branch_id||branchStaff.find(bs=>bs.profile_id===form.id)?.branch_id||''} onChange={e => setForm(p=>({...p, branch_id:e.target.value}))} style={s.input}>
                  <option value="">Sin sucursal</option>
                  {branches.filter(b => b.clinic_id === form.clinic_id).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            )}
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

      {/* Modal Sucursal */}
      {modal === 'branch' && (
        <div style={s.modal} onClick={() => setModal(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:BLUE, marginBottom:20 }}>{form.id ? 'Editar sucursal' : 'Nueva sucursal'}</div>
            <div style={{ marginBottom:14 }}>
              <label style={s.fieldLabel}>Nombre de la sucursal</label>
              <input value={form.name||''} onChange={e => setForm(p=>({...p, name:e.target.value}))} style={s.input} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={s.fieldLabel}>Provincia</label>
                <select value={form.province||''} onChange={e => setForm(p=>({...p, province:e.target.value, canton:'', district:''}))} style={s.input}>
                  <option value="">Seleccionar provincia</option>
                  {Object.keys(CR_DATA).map(prov => <option key={prov} value={prov}>{prov}</option>)}
                </select>
              </div>
              <div>
                <label style={s.fieldLabel}>Cantón</label>
                <select value={form.canton||''} onChange={e => setForm(p=>({...p, canton:e.target.value, district:''}))} style={s.input} disabled={!form.province}>
                  <option value="">Seleccionar cantón</option>
                  {(CR_DATA[form.province]||[]).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
              <div>
                <label style={s.fieldLabel}>Distrito</label>
                <input value={form.district||''} onChange={e => setForm(p=>({...p, district:e.target.value}))} placeholder="Ej: San Francisco" style={s.input} />
              </div>
              <div>
                <label style={s.fieldLabel}>Dirección</label>
                <input value={form.address||''} onChange={e => setForm(p=>({...p, address:e.target.value}))} style={s.input} />
              </div>
            </div>
            {form.id && (
              <div style={{ marginBottom:14 }}>
                <label style={s.fieldLabel}>Estado</label>
                <select value={form.is_active?'true':'false'} onChange={e => setForm(p=>({...p, is_active:e.target.value==='true'}))} style={s.input}>
                  <option value="true">Activa</option>
                  <option value="false">Inactiva</option>
                </select>
              </div>
            )}
            <div style={{ display:'flex', gap:8, marginTop:20 }}>
              <button onClick={() => setModal(null)} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
              <button onClick={saveBranch} disabled={saving||!form.name} style={{ ...s.btnPrimary, flex:1, opacity:(saving||!form.name)?0.7:1 }}>{saving?'Guardando...':'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar Sucursal */}
      {modal === 'confirm-delete-branch' && branchReport && (
        <div style={s.modal} onClick={() => { setModal(null); setBranchReport(null) }}>
          <div style={{ ...s.modalBox, maxWidth:520 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:600, color:'#dc2626', marginBottom:4 }}>Eliminar sucursal</div>
            <div style={{ fontSize:13, color:'#555', marginBottom:16 }}>Esta acción no se puede deshacer. A continuación el resumen de la sucursal:</div>
            <div style={{ background:'#f7fafc', borderRadius:10, padding:16, marginBottom:16, fontSize:13 }}>
              <div style={{ fontWeight:700, fontSize:15, color:BLUE, marginBottom:12 }}>{branchReport.branch.name}</div>
              <div style={{ marginBottom:8 }}>
                <span style={{ fontWeight:600 }}>Administradores ({branchReport.admins.length}):</span>
                {branchReport.admins.length > 0
                  ? <ul style={{ margin:'4px 0 0 16px', padding:0 }}>{branchReport.admins.map((a,i) => <li key={i}>{a}</li>)}</ul>
                  : <span style={{ color:'#999', marginLeft:8 }}>Ninguno</span>}
              </div>
              <div style={{ marginBottom:8 }}>
                <span style={{ fontWeight:600 }}>Personal ({branchReport.personal.length}):</span>
                {branchReport.personal.length > 0
                  ? <ul style={{ margin:'4px 0 0 16px', padding:0 }}>{branchReport.personal.map((p,i) => <li key={i}>{p}</li>)}</ul>
                  : <span style={{ color:'#999', marginLeft:8 }}>Ninguno</span>}
              </div>
              <div>
                <span style={{ fontWeight:600 }}>Pacientes ({branchReport.patients.length}):</span>
                {branchReport.patients.length > 0
                  ? <ul style={{ margin:'4px 0 0 16px', padding:0 }}>{branchReport.patients.map((p,i) => <li key={i}>{p}</li>)}</ul>
                  : <span style={{ color:'#999', marginLeft:8 }}>Ninguno</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => { setModal(null); setBranchReport(null) }} style={{ ...s.btnEdit, flex:1, textAlign:'center' }}>Cancelar</button>
              <button onClick={() => deleteBranch(branchReport.branch.id)} disabled={saving} style={{ ...s.btnDanger, flex:1, textAlign:'center', opacity:saving?0.7:1 }}>Eliminar sucursal</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
