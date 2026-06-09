import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function CareModulesAdmin({ patient, doctors = [], onModulesUpdated, enabledModules = ['integral','metabolica','estetica','fisioterapia','enfermeria','odontologia'], clinicPlan = 'basic' }) {
  const G = '#0F6E56'
  const [modules, setModules] = useState([])
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState(null)

  const MODULE_TYPES = [
    { key:'integral',    label:'Atención médica integral'    },
    { key:'metabolica',  label:'Atención médica metabólica'  },
    { key:'estetica',    label:'Atención médica estética'    },
    { key:'fisioterapia',label:'Atención de fisioterapia'    },
    { key:'enfermeria',  label:'Atención de enfermería'      },
    { key:'odontologia', label:'Odontología'                 },
  ].filter(m => enabledModules.includes(m.key))

  useEffect(() => { if (patient?.id) loadModules() }, [patient])

  async function loadModules() {
    const { data } = await supabase.from('patient_care_modules')
      .select('*').eq('patient_id', patient.id)
    setModules(data || [])
  }

  function getModule(type) {
    return modules.find(m => m.module_type === type)
  }

  async function toggleModule(type) {
    const existing = getModule(type)
    if (!existing || !existing.is_active) {
      const activeModules = modules.filter(m => m.is_active).length
      const limits = { basic:0, starter:2, gold:4, gold_plus:6, enterprise:10, enterprise_plus:Infinity }
      const planLabel = { basic:'Basic', starter:'Starter', gold:'Gold', gold_plus:'Gold+', enterprise:'Enterprise', enterprise_plus:'Enterprise+' }
      const limit = limits[clinicPlan] ?? 2
      if (activeModules >= limit && limit !== Infinity) {
        alert(`Tu plan ${planLabel[clinicPlan]} permite un máximo de ${limit} módulo${limit!==1?'s':''} activo${limit!==1?'s':''}. Para activar más, actualizá tu plan.`)
        return
      }
    }
    setSaving(type)
    if (existing) {
      await supabase.from('patient_care_modules').update({ is_active: !existing.is_active }).eq('id', existing.id)
    } else {
      await supabase.from('patient_care_modules').insert({
        clinic_id: patient.clinic_id,
        patient_id: patient.id,
        module_type: type,
        is_active: true,
      })
    }
    await loadModules()
    if (onModulesUpdated) onModulesUpdated()
    setSaving(null); setSaved(type); setTimeout(() => setSaved(null), 2000)
  }

  async function assignProfessional(type, professionalId) {
    const existing = getModule(type)
    setSaving(type + '_prof')
    if (existing) {
      await supabase.from('patient_care_modules').update({ assigned_professional_id: professionalId || null }).eq('id', existing.id)
      if (type === 'integral') {
        await supabase.from('patients').update({ assigned_doctor_id: professionalId || null }).eq('id', patient.id)
      }
    }
    await loadModules()
    setSaving(null); setSaved(type + '_prof'); setTimeout(() => setSaved(null), 2000)
  }

  const inp = { width:'100%', padding:'7px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }

  return (
    <div>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Módulos de atención</div>
      <div style={{ fontSize:12, color:'#888', marginBottom:14 }}>
        Activá los módulos de atención asignados a este paciente y asigná un profesional a cada uno.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        {MODULE_TYPES.map(m => {
          const mod = getModule(m.key)
          const isActive = mod?.is_active || false
          return (
            <div key={m.key} style={{ background:'#fff', border: isActive ? `1.5px solid ${G}` : '1px solid #eee', borderRadius:12, padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: isActive ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: isActive ? G : '#555' }}>{m.label}</div>
                  {!isActive && <div style={{ fontSize:11, color:'#bbb' }}>No asignado</div>}
                </div>
                <div onClick={() => toggleModule(m.key)}
                  style={{ width:40, height:22, borderRadius:11, cursor:'pointer', transition:'background 0.2s', position:'relative', background: isActive ? G : '#e0e0e0', flexShrink:0 }}>
                  <div style={{ position:'absolute', width:16, height:16, borderRadius:'50%', background:'#fff', top:3, left: isActive ? 21 : 3, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              {isActive && (
                <div>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>Profesional asignado</div>
                  <div style={{ display:'flex', gap:8 }}>
                    <select style={{ ...inp, flex:1 }}
                      value={mod?.assigned_professional_id || ''}
                      onChange={e => assignProfessional(m.key, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.prefix || (d.sex === 'female' ? 'Dra.' : 'Dr.')} {d.last_name} {d.first_name} · {d.specialty || ''}
                        </option>
                      ))}
                    </select>
                    {saving === m.key + '_prof' && <span style={{ fontSize:12, color:'#aaa', alignSelf:'center' }}>Guardando...</span>}
                    {saved === m.key + '_prof' && <span style={{ fontSize:12, color:G, alignSelf:'center' }}>✓</span>}
                  </div>
                  {!mod?.assigned_professional_id && (
                    <div style={{ fontSize:11, color:'#e67e22', marginTop:4 }}>
                      Aún no ha sido asignado un profesional para esta categoría
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
