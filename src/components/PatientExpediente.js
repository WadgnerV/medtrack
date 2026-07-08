import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PreconsultaTab from './PreconsultaTab'
import ClinicalNoteForm from './ClinicalNoteForm'
import DiagnosticosTab from './DiagnosticosTab'
import EvolucionSignosTab from './EvolucionSignosTab'
import LaboratoriosTab from './LaboratoriosTab'
import ImagenesTab from './ImagenesTab'
import RecetasTab from './RecetasTab'
import DocumentosTab from './DocumentosTab'
import ConsentimientosTab from './ConsentimientosTab'

const BLUE = '#1a3a5c'

const TABS = [
  { key: 'preconsulta',      label: 'Pre-consulta',           icon: 'ti-stethoscope'    },
  { key: 'evolucion_signos', label: 'Evolución de signos',    icon: 'ti-activity'       },
  { key: 'nota_medica',      label: 'Nota médica',            icon: 'ti-notes'          },
  { key: 'diagnosticos',     label: 'Diagnósticos',           icon: 'ti-clipboard-list' },
  { key: 'laboratorios',     label: 'Laboratorios',           icon: 'ti-flask'          },
  { key: 'imagenes',         label: 'Imágenes',               icon: 'ti-scan'           },
  { key: 'recetas',          label: 'Recetas',                icon: 'ti-pill'           },
  { key: 'documentos',       label: 'Documentos',             icon: 'ti-paperclip'      },
  { key: 'consentimientos',  label: 'Consentimientos',        icon: 'ti-writing'        },
  { key: 'historial_citas',  label: 'Historial de citas',     icon: 'ti-calendar-event' },
]

function pName(patient) {
  return `${patient?.profile?.first_name || ''} ${patient?.profile?.last_name || ''}`.trim()
}

function calcularEdad(dob) {
  if (!dob) return '--'
  return Math.floor((Date.now() - new Date(dob + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function formatFecha(f) {
  if (!f) return '--'
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function initiales(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

function HistorialCitasTab({ patient }) {
  const [citas, setCitas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('appointments')
        .select('*, doctor:doctor_id(first_name, last_name, prefix)')
        .eq('patient_id', patient.id)
        .order('appointment_date', { ascending: false })
      setCitas(data || [])
      setLoading(false)
    }
    load()
  }, [patient.id])

  const today = new Date().toISOString().split('T')[0]
  const STATUS = {
    scheduled:         { label: 'Agendada',    bg:'#E6F1FB', color:'#185FA5' },
    confirmed_patient: { label: 'Confirmada',  bg:'#E1F5EE', color:'#0F6E56' },
    completed:         { label: 'Completada',  bg:'#E1F5EE', color:'#0F6E56' },
    cancelled:         { label: 'Cancelada',   bg:'#FAECE7', color:'#D85A30' },
    no_show:           { label: 'No asistió',  bg:'#FAEEDA', color:'#BA7517' },
  }

  return (
    <div>
      <div style={{ fontSize:14, fontWeight:600, color:BLUE, marginBottom:16 }}>Historial de citas</div>
      {loading ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Cargando...</div>
      ) : citas.length === 0 ? (
        <div style={{ textAlign:'center', padding:30, color:'#bbb', fontSize:13 }}>Sin citas registradas.</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {citas.map(c => {
            const isFuture = c.appointment_date >= today
            const st = STATUS[c.status] || { label: c.status, bg:'#f0f0f0', color:'#555' }
            const doctorName = c.doctor ? `${c.doctor.prefix||''} ${c.doctor.first_name} ${c.doctor.last_name}`.trim() : '—'
            const fecha = new Date(c.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
            return (
              <div key={c.id} style={{ background:'#fff', border: isFuture ? `1px solid var(--clinic-primary, #0F6E56)` : '0.5px solid #e2ede9', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:42, height:42, borderRadius:8, background: isFuture ? 'var(--clinic-primary-light, #E1F5EE)' : '#f5f5f5', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:700, color: isFuture ? 'var(--clinic-primary, #0F6E56)' : '#888', lineHeight:1 }}>
                    {new Date(c.appointment_date + 'T12:00:00').getDate()}
                  </div>
                  <div style={{ fontSize:10, color: isFuture ? 'var(--clinic-primary, #0F6E56)' : '#aaa', textTransform:'uppercase' }}>
                    {new Date(c.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { month:'short' })}
                  </div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500, color:BLUE }}>{fecha} {c.appointment_time ? `· ${c.appointment_time.slice(0,5)}` : ''}</div>
                  <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{doctorName}</div>
                  {c.notes && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{c.notes}</div>}
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  {isFuture && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--clinic-primary-light, #E1F5EE)', color:'var(--clinic-primary, #0F6E56)', fontWeight:500 }}>Próxima</span>}
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:st.bg, color:st.color, fontWeight:500 }}>{st.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PatientExpediente({ patient, profile, onBack, canEdit = true }) {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('expedienteTab') || 'preconsulta'
  })
  const [todayAppointment, setTodayAppointment] = useState(null)
  const [lastVisit, setLastVisit] = useState(null)
  const [nextAppointment, setNextAppointment] = useState(null)
  const [diagCount, setDiagCount] = useState(0)

  const nombre = pName(patient)
  const edad = calcularEdad(patient.birth_date)
  const ini = initiales(nombre)
  const sexo = patient.sex === 'F' ? 'Femenina' : patient.sex === 'M' ? 'Masculino' : ''

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    // Cita de hoy
    supabase.from('appointments').select('id, doctor_id, appointment_date, appointment_time, status')
      .eq('patient_id', patient.id).eq('appointment_date', today)
      .order('appointment_time', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setTodayAppointment(data) })

    // Última visita (pre-consulta más reciente)
    supabase.from('preconsult_records').select('recorded_at, pas, pad, frecuencia_cardiaca, spo2, peso_kg, estatura_cm')
      .eq('patient_id', patient.profile?.id || patient.id)
      .order('recorded_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setLastVisit(data) })

    // Próxima cita
    supabase.from('appointments').select('appointment_date, appointment_time, doctor:doctor_id(first_name, last_name)')
      .eq('patient_id', patient.id).gt('appointment_date', today)
      .in('status', ['scheduled','confirmed_patient'])
      .order('appointment_date', { ascending: true }).limit(1).maybeSingle()
      .then(({ data }) => { if (data) setNextAppointment(data) })

    // Diagnósticos activos
    supabase.from('diagnoses').select('id', { count: 'exact' })
      .eq('patient_id', patient.id).eq('is_active', true)
      .then(({ count }) => { if (count) setDiagCount(count) })
  }, [patient.id])

  function setTab(key) {
    setActiveTab(key)
    localStorage.setItem('expedienteTab', key)
  }

  function renderContent() {
    if (activeTab === 'preconsulta') return <PreconsultaTab patient={patient} profile={profile} todayAppointment={todayAppointment} />
    if (activeTab === 'evolucion_signos') return <EvolucionSignosTab patient={patient} />
    if (activeTab === 'nota_medica') {
      const canEditNote = ['clinic_admin','admin','branch_admin','doctor'].includes(profile?.role)
      return <ClinicalNoteForm patientId={patient.id} moduleType="general" color="var(--clinic-primary, #0F6E56)" patient={patient} profile={profile} canEdit={canEditNote} />
    }
    if (activeTab === 'diagnosticos') return <DiagnosticosTab patient={patient} profile={profile} />
    if (activeTab === 'laboratorios') return <LaboratoriosTab patient={patient} />
    if (activeTab === 'imagenes') return <ImagenesTab patient={patient} />
    if (activeTab === 'recetas') return <RecetasTab patient={patient} profile={profile} />
    if (activeTab === 'documentos') return <DocumentosTab patient={patient} profile={profile} />
    if (activeTab === 'consentimientos') return <ConsentimientosTab patient={patient} profile={profile} />
    if (activeTab === 'historial_citas') return <HistorialCitasTab patient={patient} />
    return null
  }

  // Calcular IMC
  const imc = lastVisit?.peso_kg && lastVisit?.estatura_cm
    ? (lastVisit.peso_kg / Math.pow(lastVisit.estatura_cm / 100, 2)).toFixed(1)
    : null

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:'80vh', background:'#f0f2f5', borderRadius:14, overflow:'hidden', border:'0.5px solid #ddd' }}>

      {/* Header del paciente */}
      <div style={{ background:BLUE, padding:'10px 16px', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.7)', fontSize:12, display:'flex', alignItems:'center', gap:4, padding:0, fontFamily:'inherit', flexShrink:0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize:13 }} aria-hidden="true"></i> Volver
        </button>
        <div style={{ width:1, height:20, background:'rgba(255,255,255,0.2)' }} />
        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:500, color:'#fff', flexShrink:0 }}>{ini}</div>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:20, flexWrap:'wrap' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:500, color:'#fff' }}>{nombre}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{edad} años · {sexo}{patient.birth_date ? ` · ${formatFecha(patient.birth_date)}` : ''}</div>
          </div>
          <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
            {patient.id_number && <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:3 }}><i className="ti ti-id" style={{ fontSize:11 }} aria-hidden="true"></i> {patient.id_number}</span>}
            {(patient.phone || patient.profile?.phone) && <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:3 }}><i className="ti ti-phone" style={{ fontSize:11 }} aria-hidden="true"></i> {patient.phone || patient.profile?.phone}</span>}
            {patient.profile?.email && <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:3 }}><i className="ti ti-mail" style={{ fontSize:11 }} aria-hidden="true"></i> {patient.profile.email}</span>}
            {patient.province && <span style={{ fontSize:11, color:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', gap:3 }}><i className="ti ti-map-pin" style={{ fontSize:11 }} aria-hidden="true"></i> {patient.province}</span>}
          </div>
        </div>
        <button onClick={() => {}} style={{ background:'rgba(255,255,255,0.12)', border:'0.5px solid rgba(255,255,255,0.2)', borderRadius:6, padding:'5px 10px', cursor:'pointer', fontSize:11, color:'#fff', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-edit" style={{ fontSize:12 }} aria-hidden="true"></i> Editar
        </button>
      </div>

      {/* Barra de resumen */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid #e2e8f0', padding:'7px 16px', display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
        {lastVisit ? (
          <>
            <span style={{ fontSize:10, fontWeight:600, color:'#aaa', textTransform:'uppercase', letterSpacing:'0.6px', whiteSpace:'nowrap' }}>
              Última visita {new Date(lastVisit.recorded_at).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })}
            </span>
            <div style={{ width:1, height:14, background:'#e2e8f0' }} />
            {lastVisit.pas && <span style={{ fontSize:11, color:'#555' }}><span style={{ color:'#aaa' }}>PA </span>{lastVisit.pas}/{lastVisit.pad}</span>}
            {lastVisit.frecuencia_cardiaca && <span style={{ fontSize:11, color:'#555' }}><span style={{ color:'#aaa' }}>FC </span>{lastVisit.frecuencia_cardiaca} lpm</span>}
            {lastVisit.spo2 && <span style={{ fontSize:11, color:'#555' }}><span style={{ color:'#aaa' }}>SpO2 </span>{lastVisit.spo2}%</span>}
            {lastVisit.peso_kg && <span style={{ fontSize:11, color:'#555' }}><span style={{ color:'#aaa' }}>Peso </span>{lastVisit.peso_kg} kg{imc ? ` · IMC ${imc}` : ''}</span>}
          </>
        ) : (
          <span style={{ fontSize:11, color:'#bbb' }}>Sin visitas previas registradas</span>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {diagCount > 0 && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'#FAEEDA', color:'#BA7517', fontWeight:500 }}>{diagCount} diagnóstico{diagCount !== 1 ? 's' : ''} activo{diagCount !== 1 ? 's' : ''}</span>}
          {nextAppointment && <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, background:'var(--clinic-primary-light, #E1F5EE)', color:'var(--clinic-primary, #0F6E56)', fontWeight:500 }}>
            Próx. cita {new Date(nextAppointment.appointment_date + 'T12:00:00').toLocaleDateString('es-CR', { day:'2-digit', month:'short' })}
          </span>}
        </div>
      </div>

      {/* Tabs de navegación */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid #e2e8f0', padding:'0 16px', display:'flex', gap:0, overflowX:'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setTab(tab.key)}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'10px 14px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap',
              color: activeTab === tab.key ? BLUE : '#888',
              fontWeight: activeTab === tab.key ? 500 : 400,
              borderBottom: activeTab === tab.key ? `2px solid ${BLUE}` : '2px solid transparent',
              marginBottom:'-0.5px' }}>
            <i className={`ti ${tab.icon}`} style={{ fontSize:13 }} aria-hidden="true"></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex:1, padding:16, overflowY:'auto', background:'#f0f2f5' }}>
        <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:10, padding:20, minHeight:400 }}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
