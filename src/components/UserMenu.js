import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const G = '#1D9E75'

export default function UserMenu() {
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
  const [patientData, setPatientData] = useState({ birth_date:'', sex:'', province:'', phone:'' })
  const [doctor, setDoctor] = useState(null)

  const PROVINCIAS = ['San Jose','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limon']
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
    async function loadPatientData() {
      if (profile?.role !== 'patient' || !profile?.id) return
      const { data } = await supabase.from('patients')
        .select('birth_date, sex, province, phone, doctor:assigned_doctor_id(first_name, last_name)')
        .eq('profile_id', profile.id)
        .single()
      if (data) {
        setPatientData({
          birth_date: data.birth_date || '',
          sex: data.sex || '',
          province: data.province || '',
          phone: data.phone || '',
        })
        if (data.doctor) setDoctor(data.doctor)
      }
    }
    loadPatientData()
  }, [profile])

  function initials() {
    return ((profile?.first_name || '')[0] || '') + ((profile?.last_name || '')[0] || '')
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  async function saveCredentials() {
    setSaving(true); setMsg('')
    const { error } = await supabase.from('profiles').update({ credentials }).eq('id', profile.id)
    setSaving(false)
    setMsg(error ? 'Error al guardar' : 'Guardado correctamente')
    setTimeout(() => setMsg(''), 2500)
  }

  async function savePatientData() {
    setSaving(true); setMsg('')
    await supabase.from('patients').update({
      birth_date: patientData.birth_date || null,
      sex: patientData.sex || null,
      province: patientData.province || null,
      phone: patientData.phone || null,
    }).eq('profile_id', profile.id)
    setSaving(false)
    setMsg('Guardado correctamente')
    setTimeout(() => setMsg(''), 2500)
  }

  function addCredential() {
    if (!newCred.description.trim()) return
    setCredentials(prev => [...prev, { ...newCred, id: Date.now() }])
    setNewCred({ type: 'Titulo', description: '' })
  }

  function removeCredential(id) {
    setCredentials(prev => prev.filter(c => c.id !== id))
  }

  async function changePassword() {
    if (!passForm.next || passForm.next !== passForm.confirm) { setMsg('Las contrasenas no coinciden'); return }
    if (passForm.next.length < 6) { setMsg('Minimo 6 caracteres'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: passForm.next })
    setSaving(false)
    if (error) setMsg('Error: ' + error.message)
    else { setMsg('Contrasena actualizada'); setPassForm({ next: '', confirm: '' }) }
    setTimeout(() => setMsg(''), 3000)
  }

  const isPatient = profile?.role === 'patient'

  return (
    <>
      {view && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.42)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50 }}
          onClick={e => { if (e.target === e.currentTarget) { setView(null); setMsg('') } }}>
          <div style={{ width:480, background:'#fff', borderRadius:16, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', maxHeight:'85vh', overflowY:'auto' }}>

            {view === 'profile' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:500, flexShrink:0 }}>
                    {initials()}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:16, fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</div>
                    <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{profile?.email}</div>
                    {profile?.medical_code && <div style={{ fontSize:11, color:G, marginTop:2 }}>Cod. {profile.medical_code}</div>}
                  </div>
                  <button style={{ background:'#f5f5f5', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:13, color:'#666' }} onClick={() => { setView(null); setMsg('') }}>x</button>
                </div>

                {isPatient ? (
                  <div>
                    <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px', fontSize:12, marginBottom:14 }}>
                      <div style={{ marginBottom:6 }}><span style={{ color:'#999' }}>Nombre: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.first_name} {profile?.last_name}</span></div>
                      <div style={{ marginBottom:6 }}><span style={{ color:'#999' }}>Correo: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.email}</span></div>
                      <div><span style={{ color:'#999' }}>Medico tratante: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{doctor ? 'Dr. ' + doctor.first_name + ' ' + doctor.last_name : 'Sin asignar'}</span></div>
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Informacion personal</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                      <div>
                        <label style={s.lbl}>Fecha de nacimiento</label>
                        <input type="date" value={patientData.birth_date} onChange={e => setPatientData(p => ({ ...p, birth_date:e.target.value }))} style={s.inp} />
                      </div>
                      <div>
                        <label style={s.lbl}>Sexo</label>
                        <select value={patientData.sex} onChange={e => setPatientData(p => ({ ...p, sex:e.target.value }))} style={s.inp}>
                          <option value="">Selecciona...</option>
                          <option value="female">Femenino</option>
                          <option value="male">Masculino</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label style={s.lbl}>Provincia</label>
                        <select value={patientData.province} onChange={e => setPatientData(p => ({ ...p, province:e.target.value }))} style={s.inp}>
                          <option value="">Selecciona...</option>
                          {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={s.lbl}>Telefono</label>
                        <input type="tel" value={patientData.phone} onChange={e => setPatientData(p => ({ ...p, phone:e.target.value }))} placeholder="+506 8888-8888" style={s.inp} />
                      </div>
                    </div>
                    {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12, background: msg.includes('Error') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cerrar</button>
                      <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={savePatientData}>
                        {saving ? 'Guardando...' : 'Guardar informacion'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ background:'#f8f8f8', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:12 }}>
                      <div style={{ marginBottom:6 }}><span style={{ color:'#999' }}>Rol: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.role === 'admin' ? 'Administrador' : 'Medico colaborador'}</span></div>
                      <div style={{ marginBottom:6 }}><span style={{ color:'#999' }}>Especialidad: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{profile?.specialty || '--'}</span></div>
                      {profile?.medical_code && <div><span style={{ color:'#999' }}>Codigo profesional: </span><span style={{ fontWeight:500, color:'#1a1a1a' }}>{profile.medical_code}</span></div>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', marginBottom:12 }}>Credenciales y formacion academica</div>
                    {credentials.map(c => (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderRadius:8, border:'0.5px solid #eee', marginBottom:6, background:'#fafafa' }}>
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:'#E1F5EE', color:'#0F6E56', whiteSpace:'nowrap', fontWeight:500 }}>{c.type}</span>
                        <span style={{ fontSize:12, flex:1, color:'#444' }}>{c.description}</span>
                        <button style={{ background:'none', border:'none', cursor:'pointer', color:'#D85A30', fontSize:13 }} onClick={() => removeCredential(c.id)}>x</button>
                      </div>
                    ))}
                    {credentials.length === 0 && <div style={{ fontSize:12, color:'#bbb', textAlign:'center', padding:'12px 0' }}>Sin credenciales agregadas aun</div>}
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
                    {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12, background: msg.includes('Error') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                    <div style={{ display:'flex', gap:8 }}>
                      <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cerrar</button>
                      <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={saveCredentials}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {view === 'password' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                  <div style={{ fontSize:15, fontWeight:500, color:'#1a1a1a' }}>Cambiar contrasena</div>
                  <button style={{ background:'#f5f5f5', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', fontSize:13, color:'#666' }} onClick={() => { setView(null); setMsg('') }}>x</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                  <div>
                    <label style={s.lbl}>Nueva contrasena</label>
                    <input type="password" value={passForm.next} onChange={e => setPassForm(p => ({ ...p, next:e.target.value }))} placeholder="Minimo 6 caracteres" style={s.inp} />
                  </div>
                  <div>
                    <label style={s.lbl}>Confirmar contrasena</label>
                    <input type="password" value={passForm.confirm} onChange={e => setPassForm(p => ({ ...p, confirm:e.target.value }))} placeholder="Repite la contrasena" style={s.inp} />
                  </div>
                </div>
                {msg && <div style={{ fontSize:12, padding:'8px 11px', borderRadius:8, marginBottom:12, background: msg.includes('Error') || msg.includes('no coinciden') || msg.includes('Minimo') ? '#FAECE7' : '#E1F5EE', color: msg.includes('Error') || msg.includes('no coinciden') || msg.includes('Minimo') ? '#C24B2A' : '#0F6E56' }}>{msg}</div>}
                <div style={{ display:'flex', gap:8 }}>
                  <button style={s.btnCancel} onClick={() => { setView(null); setMsg('') }}>Cancelar</button>
                  <button style={{ ...s.btnPrimary, flex:1, justifyContent:'center', opacity:saving?0.7:1 }} disabled={saving} onClick={changePassword}>
                    {saving ? 'Guardando...' : 'Actualizar contrasena'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <div ref={menuRef} style={{ position:'relative' }}>
        <div onClick={() => setOpen(o => !o)}
          style={{ padding:'10px 14px', borderTop:'0.5px solid #eee', display:'flex', alignItems:'center', gap:8, cursor:'pointer', background: open ? '#f8f8f8' : 'transparent' }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:'#E1F5EE', color:'#0F6E56', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:500, flexShrink:0 }}>
            {initials()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, fontWeight:500, color:'#1a1a1a', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize:10, color:'#999' }}>{profile?.role === 'admin' ? 'Administrador' : profile?.role === 'doctor' ? 'Medico colaborador' : 'Paciente'}</div>
          </div>
          <span style={{ fontSize:10, color:'#bbb' }}>{open ? '▲' : '▼'}</span>
        </div>

        {open && (
          <div style={{ position:'absolute', bottom:'100%', left:0, right:0, background:'#fff', border:'0.5px solid #eee', borderRadius:10, boxShadow:'0 -4px 20px rgba(0,0,0,0.1)', overflow:'hidden', zIndex:30 }}>
            <div onClick={() => { setView('profile'); setOpen(false) }} style={s.menuItem}>
              <span style={{ fontSize:14 }}>👤</span><span>Mi perfil</span>
            </div>
            <div onClick={() => { setView('password'); setOpen(false) }} style={s.menuItem}>
              <span style={{ fontSize:14 }}>🔑</span><span>Cambiar contrasena</span>
            </div>
            <div style={{ height:'0.5px', background:'#f0f0f0' }} />
            <div onClick={handleSignOut} style={{ ...s.menuItem, color:'#D85A30' }}>
              <span style={{ fontSize:14 }}>⏻</span><span>Cerrar sesion</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const s = {
  menuItem:  { display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer', fontSize:12, color:'#444' },
  btnPrimary:{ background:'#1D9E75', color:'#fff', border:'none', fontSize:12, fontWeight:500, padding:'7px 14px', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:5 },
  btnCancel: { background:'none', border:'1px solid #e0e0e0', fontSize:12, color:'#666', padding:'7px 12px', borderRadius:8, cursor:'pointer' },
  lbl:       { display:'block', fontSize:11, color:'#666', marginBottom:4, fontWeight:500 },
  inp:       { width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box', color:'#1a1a1a', appearance:'none', background:'#fff' },
}
