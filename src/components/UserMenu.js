import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'

const PROVINCIAS = {
  'San José': ['San José','Escazú','Desamparados','Puriscal','Tarrazú','Aserrí','Mora','Goicoechea','Santa Ana','Alajuelita','Vásquez de Coronado','Acosta','Tibás','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Pérez Zeledón','León Cortés'],
  'Alajuela': ['Alajuela','San Ramón','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poás','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Río Cuarto'],
  'Cartago': ['Cartago','Paraíso','La Unión','Jiménez','Turrialba','Alvarado','Oreamuno','El Guarco'],
  'Heredia': ['Heredia','Barva','Santo Domingo','Santa Bárbara','San Rafael','San Isidro','Belén','Flores','San Pablo','Sarapiquí'],
  'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Cañas','Abangares','Tilarán','Nandayure','La Cruz','Hojancha'],
  'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Monteverde'],
  'Limón': ['Limón','Pococí','Siquirres','Talamanca','Matina','Guácimo'],
}

function calcAge(dob) {
  if (!dob) return null
  const diff = Date.now() - new Date(dob + 'T12:00:00').getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}


function MenuDropdown({ dropUp, menuRef, onProfile, onPassword, onSignOut, menuItemStyle }) {
  return (
    <div style={{ position:'absolute', ...(dropUp ? { bottom:'calc(100% + 4px)' } : { top:'calc(100% + 4px)' }), left:0, minWidth:200, background:'#fff', border:'0.5px solid #eee', borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.12)', overflow:'hidden', zIndex:300 }}>
      <div onClick={onProfile} style={menuItemStyle}>
        <i className="ti ti-user" style={{ fontSize:15, color:'#888' }} aria-hidden="true"></i><span>Mi perfil</span>
      </div>
      <div onClick={onPassword} style={menuItemStyle}>
        <i className="ti ti-lock" style={{ fontSize:15, color:'#888' }} aria-hidden="true"></i><span>Cambiar contraseña</span>
      </div>
      <div style={{ height:'0.5px', background:'#f0f0f0' }} />
      <div onClick={onSignOut} style={{ ...menuItemStyle, color:'#D85A30' }}>
        <i className="ti ti-logout" style={{ fontSize:15, color:'#D85A30' }} aria-hidden="true"></i><span>Cerrar sesión</span>
      </div>
    </div>
  )
}

export default function UserMenu({ dropUp = true }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const menuRef = useRef(null)
  const [credentials, setCredentials] = useState([])
  const [newCred, setNewCred] = useState({ type: 'Titulo', description: '' })
  const [passForm, setPassForm] = useState({ next: '', confirm: '' })
  const [doctorForm, setDoctorForm] = useState(null)

  const CANTONES_DOC = {
    'San Jose': ['San Jose','Escazu','Desamparados','Puriscal','Tarrazu','Aserri','Mora','Goicoechea','Santa Ana','Alajuelita','Vazquez de Coronado','Acosta','Tibas','Moravia','Montes de Oca','Turrubares','Dota','Curridabat','Perez Zeledon','Leon Cortes'],
    'Alajuela': ['Alajuela','San Ramon','Grecia','San Mateo','Atenas','Naranjo','Palmares','Poas','Orotina','San Carlos','Zarcero','Valverde Vega','Upala','Los Chiles','Guatuso','Rio Cuarto'],
    'Cartago': ['Cartago','Paraiso','La Union','Jimenez','Turrialba','Alvarado','Oreamuno','El Guarco'],
    'Heredia': ['Heredia','Barva','Santo Domingo','Santa Barbara','San Rafael','San Isidro','Belen','Flores','San Pablo','Sarapiqui'],
    'Guanacaste': ['Liberia','Nicoya','Santa Cruz','Bagaces','Carrillo','Canas','Abangares','Tilaran','Nandayure','La Cruz','Hojancha'],
    'Puntarenas': ['Puntarenas','Esparza','Buenos Aires','Montes de Oro','Osa','Quepos','Golfito','Coto Brus','Parrita','Corredores','Garabito','Monteverde'],
    'Limon': ['Limon','Pococi','Siquirres','Talamanca','Matina','Guacimo'],
  }
  const [patientData, setPatientData] = useState({
    first_name: '', last_name: '', id_number: '', phone: '',
    birth_date: '', sex: '', province: '', canton: '', height_cm: '',
    is_menopause: false
  })
  const [doctor, setDoctor] = useState(null)
  const credTypes = ['Titulo','Maestria','Doctorado','Especialidad','Certificacion','Reconocimiento','Otro']

  useEffect(() => {
    if (profile?.credentials) {
      setCredentials(Array.isArray(profile.credentials) ? profile.credentials : [])
    }
  }, [profile])

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (profile && (profile.role === 'doctor' || profile.role === 'admin')) {
      setDoctorForm({
        firstName:   profile.first_name   || '',
        lastName:    profile.last_name    || '',
        sex:         profile.sex          || '',
        idNumber:    profile.id_number    || '',
        phone:       profile.phone        || '',
        province:    profile.province     || '',
        canton:      profile.canton       || '',
        specialty:   profile.specialty    || '',
        medicalCode: profile.medical_code || '',
      })
    }
  }, [profile])

  useEffect(() => {
    async function loadPatientData() {
      if (profile?.role !== 'patient' || !profile?.id) return
      const { data } = await supabase.from('patients')
        .select('birth_date, sex, province, canton, phone, height_cm, id_number, is_menopause, doctor:assigned_doctor_id(first_name, last_name)')
        .eq('profile_id', profile.id)
        .single()
      if (data) {
        setPatientData({
          first_name:  profile.first_name || '',
          last_name:   profile.last_name  || '',
          id_number:   data.id_number     || profile.id_number || '',
          phone:       data.phone         || '',
          birth_date:  data.birth_date    || '',
          sex:         data.sex           || '',
          province:    data.province      || '',
          canton:      data.canton        || '',
          height_cm:   data.height_cm     || '',
          is_menopause: data.is_menopause || false,
        })
        if (data.doctor) setDoctor(data.doctor)
      }
    }
    loadPatientData()
  }, [profile])

  function setP(field, value) {
    setPatientData(p => ({ ...p, [field]: value, ...(field === 'province' ? { canton: '' } : {}) }))
  }

  function initials() {
    return ((profile?.first_name || '')[0] || '') + ((profile?.last_name || '')[0] || '')
  }

  async function handleSignOut() { await signOut(); navigate('/login') }

  async function saveDoctorProfile() {
    if (!doctorForm?.firstName?.trim() || !doctorForm?.lastName?.trim()) {
      setMsg('El nombre y apellido son obligatorios.'); return
    }
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles').update({
      first_name:   doctorForm.firstName.trim(),
      last_name:    doctorForm.lastName.trim(),
      sex:          doctorForm.sex         || null,
      id_number:    doctorForm.idNumber    || null,
      phone:        doctorForm.phone       || null,
      province:     doctorForm.province    || null,
      canton:       doctorForm.canton      || null,
      specialty:    doctorForm.specialty   || null,
      medical_code: doctorForm.medicalCode || null,
    }).eq('id', profile.id)
    setSaving(false)
    setMsg(error ? 'Error: ' + error.message : 'Información actualizada correctamente')
    setTimeout(() => setMsg(''), 3000)
  }

  async function saveCredentials() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles').update({ credentials }).eq('id', profile.id)
    setSaving(false)
    setMsg(error ? 'Error al guardar' : 'Guardado correctamente')
    setTimeout(() => setMsg(''), 2500)
  }

  async function savePatientData() {
    if (!patientData.first_name.trim() || !patientData.last_name.trim()) {
      setMsg('El nombre y apellido son obligatorios.'); return
    }
    setSaving(true); setMsg('')
    const [profRes, patRes] = await Promise.all([
      supabase.from('profiles').update({
        first_name: patientData.first_name.trim(),
        last_name:  patientData.last_name.trim(),
      }).eq('id', profile.id),
      supabase.from('patients').update({
        phone:        patientData.phone.trim()    || null,
        birth_date:   patientData.birth_date      || null,
        sex:          patientData.sex             || null,
        province:     patientData.province        || null,
        canton:       patientData.canton          || null,
        height_cm:    patientData.height_cm ? parseInt(patientData.height_cm) : null,
        id_number:    patientData.id_number.trim() || null,
        is_menopause: patientData.is_menopause || false,
      }).eq('profile_id', profile.id)
    ])
    setSaving(false)
    const err = profRes.error || patRes.error
    setMsg(err ? 'Error al guardar: ' + err.message : 'Información actualizada correctamente')
    setTimeout(() => setMsg(''), 3000)
  }

  function addCredential() {
    if (!newCred.description.trim()) return
    setCredentials(prev => [...prev, { ...newCred, id: Date.now() }])
    setNewCred({ type: 'Titulo', description: '' })
  }

  function removeCredential(id) { setCredentials(prev => prev.filter(c => c.id !== id)) }

  async function changePassword() {
    if (!passForm.next || passForm.next !== passForm.confirm) { setMsg('Las contraseñas no coinciden'); return }
    if (passForm.next.length < 6) { setMsg('Mínimo 6 caracteres'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: passForm.next })
    setSaving(false)
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Contraseña actualizada'); setPassForm({ next: '', confirm: '' }) }
    setTimeout(() => setMsg(''), 3000)
  }

  const isPatient = profile?.role === 'patient'
  const age = calcAge(patientData.birth_date)
  const cantones = patientData.province ? PROVINCIAS[patientData.province] || [] : []

  return (
    <>
      {view && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
          onClick={e => { if (e.target === e.currentTarget) { setView(null); setMsg('') } }}>
          <div style={{ width:500, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'88vh', overflowY:'auto' }}>

            {view === 'profile' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'#E1F5EE', color:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:500, flexShrink:0 }}>
                    {initials()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
                    <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{profile?.email}</div>
                  </div>
                  <button style={{ background:'#f5f5f5', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:13, color:'#666' }} onClick={() => { setView(null); setMsg('') }}>✕</button>
                </div>

                {isPatient ? (
                  <div>
                    <div style={{ background:'#f0fdf9', borderRadius:10, padding:'10px 14px', fontSize:12, marginBottom:16, color:'#0F6E56', border:'1px solid #c8e6da' }}>
                      <span style={{ fontWeight:500 }}>Médico tratante: </span>
                      {doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : 'Sin asignar'}
                    </div>

                    <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>Información personal</div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={s.lbl}>Nombre<span style={{ color:'#c0392b' }}>*</span></label>
                        <input style={s.inp} value={patientData.first_name} onChange={e=>setP('first_name',e.target.value)} placeholder="Juan" />
                      </div>
                      <div>
                        <label style={s.lbl}>Apellidos<span style={{ color:'#c0392b' }}>*</span></label>
                        <input style={s.inp} value={patientData.last_name} onChange={e=>setP('last_name',e.target.value)} placeholder="Pérez Mora" />
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={s.lbl}>Cédula / ID</label>
                        <input style={s.inp} value={patientData.id_number} onChange={e=>setP('id_number',e.target.value)} placeholder="1-1234-5678" />
                      </div>
                      <div>
                        <label style={s.lbl}>Teléfono</label>
                        <input style={s.inp} type="tel" value={patientData.phone} onChange={e=>setP('phone',e.target.value)} placeholder="8888-8888" />
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={s.lbl}>
                          Fecha de nacimiento
                          {age !== null && <span style={{ color:G, marginLeft:6, fontWeight:500 }}>{age} años</span>}
                        </label>
                        <input style={s.inp} type="date" value={patientData.birth_date} onChange={e=>setP('birth_date',e.target.value)} />
                      </div>
                      <div>
                        <label style={s.lbl}>Sexo</label>
                        <select style={s.inp} value={patientData.sex} onChange={e=>setP('sex',e.target.value)}>
                          <option value="">Seleccionar</option>
                          <option value="female">Femenino</option>
                          <option value="male">Masculino</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                      <div>
                        <label style={s.lbl}>Provincia</label>
                        <select style={s.inp} value={patientData.province} onChange={e=>setP('province',e.target.value)}>
                          <option value="">Seleccionar</option>
                          {Object.keys(PROVINCIAS).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.lbl}>Cantón</label>
                        <select style={s.inp} value={patientData.canton} onChange={e=>setP('canton',e.target.value)} disabled={!patientData.province}>
                          <option value="">Seleccionar</option>
                          {cantones.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom:14 }}>
                      <label style={s.lbl}>Estatura (cm)</label>
                      <input style={s.inp} type="number" min="100" max="250" value={patientData.height_cm} onChange={e=>setP('height_cm',e.target.value)} placeholder="170" />
                    </div>

                    {patientData.sex === 'female' && (
                      <div style={{ marginBottom:14, background:'#f8f8f8', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <div>
                          <div style={{ fontSize:12, fontWeight:500, color:'#555' }}>En menopausia</div>
                          <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Activa esta opción si ya no tenés ciclos menstruales</div>
                        </div>
                        <div onClick={() => setP('is_menopause', !patientData.is_menopause)}
                          style={{ width:40, height:22, borderRadius:11, cursor:'pointer', transition:'background 0.2s', position:'relative', background: patientData.is_menopause ? G : '#e0e0e0', flexShrink:0 }}>
                          <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, left: patientData.is_menopause ? 21 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    )}

                    {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12, background: msg.includes('Error') || msg.includes('obligatorio') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') || msg.includes('obligatorio') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cerrar</button>
                      <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={savePatientData}>
                        {saving ? 'Guardando...' : 'Guardar información'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Info editable del doctor */}
                    {doctorForm && (
                      <div style={{ marginBottom:16 }}>
                        <div style={{ background:'#f0fdf9', borderRadius:10, padding:'8px 14px', fontSize:12, marginBottom:12, color:'#0F6E56', border:'1px solid #c8e6da' }}>
                          <span style={{ fontWeight:500 }}>Rol: </span>{profile?.role === 'admin' ? 'Administrador' : 'Médico colaborador'}
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color:'#555', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.05em' }}>Información personal</div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                          <div>
                            <label style={s.lbl}>Nombre<span style={{ color:'#c0392b' }}>*</span></label>
                            <input style={s.inp} value={doctorForm.firstName} onChange={e => setDoctorForm(p => ({ ...p, firstName: e.target.value }))} />
                          </div>
                          <div>
                            <label style={s.lbl}>Apellidos<span style={{ color:'#c0392b' }}>*</span></label>
                            <input style={s.inp} value={doctorForm.lastName} onChange={e => setDoctorForm(p => ({ ...p, lastName: e.target.value }))} />
                          </div>
                          <div>
                            <label style={s.lbl}>Sexo</label>
                            <select style={s.inp} value={doctorForm.sex} onChange={e => setDoctorForm(p => ({ ...p, sex: e.target.value }))}>
                              <option value="">Seleccionar</option>
                              <option value="male">Masculino</option>
                              <option value="female">Femenino</option>
                              <option value="other">Otro</option>
                            </select>
                          </div>
                          <div>
                            <label style={s.lbl}>Cédula / ID</label>
                            <input style={s.inp} value={doctorForm.idNumber} onChange={e => setDoctorForm(p => ({ ...p, idNumber: e.target.value }))} placeholder="1-1234-5678" />
                          </div>
                          <div>
                            <label style={s.lbl}>Teléfono</label>
                            <input style={s.inp} type="tel" value={doctorForm.phone} onChange={e => setDoctorForm(p => ({ ...p, phone: e.target.value }))} placeholder="8888-8888" />
                          </div>
                          <div>
                            <label style={s.lbl}>Código profesional</label>
                            <input style={s.inp} value={doctorForm.medicalCode} onChange={e => setDoctorForm(p => ({ ...p, medicalCode: e.target.value }))} placeholder="MED-12345" />
                          </div>
                          <div>
                            <label style={s.lbl}>Provincia</label>
                            <select style={s.inp} value={doctorForm.province} onChange={e => setDoctorForm(p => ({ ...p, province: e.target.value, canton: '' }))}>
                              <option value="">Seleccionar</option>
                              {Object.keys(CANTONES_DOC).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={s.lbl}>Cantón</label>
                            <select style={s.inp} value={doctorForm.canton} onChange={e => setDoctorForm(p => ({ ...p, canton: e.target.value }))} disabled={!doctorForm.province}>
                              <option value="">Seleccionar</option>
                              {doctorForm.province && CANTONES_DOC[doctorForm.province] && CANTONES_DOC[doctorForm.province].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:10, background: msg.includes('Error') || msg.includes('obligatorio') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') || msg.includes('obligatorio') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                        <button style={{ ...s.btnPrimary, width:'100%', justifyContent:'center', opacity:saving?0.7:1, marginBottom:16 }} disabled={saving} onClick={saveDoctorProfile}>
                          {saving ? 'Guardando...' : 'Guardar información'}
                        </button>
                      </div>
                    )}
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Credenciales y formación académica</div>
                    {credentials.map(c => (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'0.5px solid #eee', marginBottom:6, background:'#fafafa' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:G, whiteSpace:'nowrap', fontWeight:500 }}>{c.type}</span>
                        <span style={{ fontSize:12, flex:1, color:'#444' }}>{c.description}</span>
                        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:13 }} onClick={() => removeCredential(c.id)}>✕</button>
                      </div>
                    ))}
                    {credentials.length === 0 && <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:'12px 0' }}>Sin credenciales agregadas aún</div>}
                    <div style={{ background:'#f8f8f8', borderRadius:10, padding:12, marginTop:10, marginBottom:14 }}>
                      <div style={{ fontSize:11, color:'#888', marginBottom:8, fontWeight:500 }}>Agregar credencial</div>
                      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                        <select value={newCred.type} onChange={e => setNewCred(p => ({ ...p, type:e.target.value }))}
                          style={{ padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', background:'#fff', color:'#1a1a1a' }}>
                          {credTypes.map(t => <option key={t}>{t}</option>)}
                        </select>
                        <input value={newCred.description} onChange={e => setNewCred(p => ({ ...p, description:e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') addCredential() }}
                          placeholder="Ej. Licenciatura en Medicina, UCR"
                          style={{ flex:1, padding:'7px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit' }} />
                      </div>
                      <button style={{ ...s.btnCancel, width:'100%' }} onClick={addCredential}>+ Agregar</button>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cerrar</button>
                      <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={saveCredentials}>
                        {saving ? 'Guardando...' : 'Guardar credenciales'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'password' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a' }}>Cambiar contraseña</div>
                  <button style={{ background:'#f5f5f5', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:13, color:'#666' }} onClick={() => { setView(null); setMsg('') }}>✕</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  <div>
                    <label style={s.lbl}>Nueva contraseña</label>
                    <input type="password" value={passForm.next} onChange={e => setPassForm(p => ({ ...p, next:e.target.value }))} placeholder="Mínimo 6 caracteres" style={s.inp} />
                  </div>
                  <div>
                    <label style={s.lbl}>Confirmar contraseña</label>
                    <input type="password" value={passForm.confirm} onChange={e => setPassForm(p => ({ ...p, confirm:e.target.value }))} placeholder="Repite la contraseña" style={s.inp} />
                  </div>
                </div>
                {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12, background: msg.includes('Error') || msg.includes('coinciden') || msg.includes('nimo') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') || msg.includes('coinciden') || msg.includes('nimo') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cancelar</button>
                  <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={changePassword}>
                    {saving ? 'Guardando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div ref={menuRef} style={{ position:'relative' }}>
        <div onClick={() => setOpen(o => !o)}
          style={{ padding:'10px 14px', borderTop:'0.5px solid rgba(255,255,255,0.15)', display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: open ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#E1F5EE', color:G, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, flexShrink:0 }}>
            {initials()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize:10, color:'#999' }}>{
              profile?.role === 'clinic_admin' ? 'Admin de clínica' :
              profile?.role === 'branch_admin' ? 'Admin de sucursal' :
              profile?.role === 'admin' ? 'Administrador' :
              profile?.role === 'doctor' ? 'Médico colaborador' : 'Paciente'
            }</div>
          </div>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{open ? '▲' : '▼'}</span>
        </div>

        {open && <MenuDropdown dropUp={dropUp} menuRef={menuRef} onProfile={() => { setView('profile'); setOpen(false) }} onPassword={() => { setView('password'); setOpen(false) }} onSignOut={handleSignOut} menuItemStyle={s.menuItem} />}
      </div>
    </>
  )
}

const s = {
  menuItem:  { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', fontSize:12, color:'#444' },
  btnPrimary:{ background:G, color:'#fff', border:'none', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5 },
  btnCancel: { background:'none', border:'1px solid #e0e0e0', fontSize:12, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  lbl:       { display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 },
  inp:       { width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', background:'#fff' },
}
