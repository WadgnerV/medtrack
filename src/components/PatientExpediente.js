import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import IntegralModule from '../pages/IntegralModule'
import MetabolicModule from '../pages/MetabolicModule'
import AestheticModule from '../pages/AestheticModule'
import FisioterapiaModule from '../pages/FisioterapiaModule'
import EnfermeriaModule from '../pages/EnfermeriaModule'
import OdontologiaModule from '../pages/OdontologiaModule'
import NutricionModule from '../pages/NutricionModule'
import CareModulesAdmin from './CareModulesAdmin'
import PreconsultaTab from './PreconsultaTab'
import DocumentosTab from './DocumentosTab'
import ConsentimientosTab from './ConsentimientosTab'
import ModuleChat from './ModuleChat'
import {
  Stethoscope, BarChart2, Sparkles, Paperclip, ClipboardList,
  Settings, Phone, Mail, CreditCard, Calendar,
  ChevronRight, ChevronDown, ChevronLeft,
  FileText, Activity, Clipboard, Dumbbell, Heart, Scale, Syringe,
  CheckSquare, MessageSquare, Smile, Salad
} from 'lucide-react'

const G = '#1D9E75'
const DARK_G = '#0F6E56'
const BLUE = '#1a3a5c'
const LIGHT_BG = '#f4f7f6'
const SIDEBAR_W = 272

const MODULE_CONFIG = {
  integral: {
    label: 'Medicina Integral', icon: Stethoscope,
    subsecciones: [
      { id: 'notas',        label: 'Notas clínicas',   icon: FileText    },
      { id: 'signos',       label: 'Signos clínicos',  icon: Activity    },
      { id: 'diagnosticos', label: 'Diagnósticos',     icon: Clipboard   },
      { id: 'tareas',       label: 'Tareas',           icon: CheckSquare },
    ],
  },
  metabolica: {
    label: 'Metabólica', icon: BarChart2,
    subsecciones: [
      { id: 'notas',        label: 'Notas clínicas',       icon: FileText    },
      { id: 'composicion',  label: 'Composición corporal', icon: Scale       },
      { id: 'diagnosticos', label: 'Diagnósticos',         icon: Clipboard   },
      { id: 'tareas',       label: 'Tareas',               icon: CheckSquare },
    ],
  },
  estetica: {
    label: 'Estética', icon: Sparkles,
    subsecciones: [
      { id: 'notas',          label: 'Notas clínicas', icon: FileText  },
      { id: 'procedimientos', label: 'Procedimientos', icon: Syringe   },
      { id: 'diagnosticos',   label: 'Diagnósticos',  icon: Clipboard },
    ],
  },
  fisioterapia: {
    label: 'Fisioterapia', icon: Dumbbell,
    subsecciones: [
      { id: 'notas',        label: 'Notas clínicas',       icon: FileText  },
      { id: 'ejercicios',   label: 'Ejercicios prescritos', icon: Dumbbell  },
      { id: 'diagnosticos', label: 'Diagnósticos',         icon: Clipboard },
    ],
  },
  enfermeria: {
    label: 'Enfermería', icon: Heart,
    subsecciones: [
      { id: 'notas',        label: 'Notas clínicas', icon: FileText  },
      { id: 'tratamientos', label: 'Tratamientos',   icon: Heart     },
      { id: 'diagnosticos', label: 'Diagnósticos',   icon: Clipboard },
    ],
  },
  odontologia: {
    label: 'Odontología', icon: Smile,
    subsecciones: [
      { id: 'notas',       label: 'Notas clínicas', icon: FileText },
      { id: 'odontograma', label: 'Odontograma',    icon: Smile    },
    ],
  },
  nutricion: {
    label: 'Nutrición', icon: Salad,
    subsecciones: [
      { id: 'notas',          label: 'Notas clínicas',  icon: FileText  },
      { id: 'plan',           label: 'Plan nutricional', icon: Salad     },
      { id: 'antropometria',  label: 'Antropometría',   icon: Scale     },
      { id: 'diagnosticos',   label: 'Diagnósticos',    icon: Clipboard },
    ],
  },
}

const MODULE_ORDER = ['integral', 'metabolica', 'estetica', 'fisioterapia', 'enfermeria', 'odontologia', 'nutricion']

function pName(patient) {
  return `${patient?.profile?.first_name || patient?.first_name || ''} ${patient?.profile?.last_name || patient?.last_name || ''}`.trim()
}

function calcularEdad(dob) {
  if (!dob) return '--'
  return Math.floor((Date.now() - new Date(dob + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function formatFecha(f) {
  if (!f) return '--'
  return new Date(f + 'T12:00:00').toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function initiales(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('')
}

function ModuleRenderer({ moduleType, sub, patient, careModule, canEdit, profile }) {
  const props = { patient, careModule, canEdit, profile }
  if (moduleType === 'integral')     return <IntegralModule {...props} defaultTab={sub} />
  if (moduleType === 'metabolica')   return <MetabolicModule {...props} canEditMeasurements={canEdit} defaultTab={sub} />
  if (moduleType === 'estetica')     return <AestheticModule {...props} defaultTab={sub} />
  if (moduleType === 'fisioterapia') return <FisioterapiaModule {...props} defaultTab={sub} />
  if (moduleType === 'enfermeria')   return <EnfermeriaModule {...props} defaultTab={sub} />
  if (moduleType === 'odontologia')  return <OdontologiaModule {...props} defaultTab={sub} />
  if (moduleType === 'nutricion')    return <NutricionModule {...props} defaultTab={sub} />
  return null
}

export default function PatientExpediente({ patient, profile, onBack, canEdit = true, senderRole = 'admin', enabledModules, clinicPlan, doctors }) {
  const [todayAppointment, setTodayAppointment] = useState(null)

  useEffect(() => {
    async function loadTodayAppointment() {
      const patientId = patient.id
      const today = new Date().toISOString().split('T')[0]
      console.log('Buscando cita para patient.id:', patientId, 'fecha:', today)
      console.log('patient completo:', JSON.stringify({id: patient.id, profile_id: patient.profile_id, pid: patient.profile?.id}))
      const { data, error } = await supabase.from('appointments')
        .select('id, doctor_id, appointment_date, appointment_time, status')
        .eq('patient_id', patientId)
        .eq('appointment_date', today)
        .order('appointment_time', { ascending: true })
        .limit(1)
        .maybeSingle()
      console.log('Cita encontrada:', data, 'error:', error)
      if (data) setTodayAppointment(data)
    }
    loadTodayAppointment()
  }, [patient])

  const [careModules, setCareModules] = useState([])
  const [expandidos, setExpandidos] = useState({})
  const [seccion, setSeccion] = useState(() => {
    const saved = localStorage.getItem('expedienteSeccion')
    if (saved) try { return JSON.parse(saved) } catch {}
    return { type: 'extra', key: 'preconsulta' }
  })

  const setSeccionPersist = (s) => {
    localStorage.setItem('expedienteSeccion', JSON.stringify(s))
    setSeccion(s)
  }

  useEffect(() => {
    if (patient?.id) loadCareModules(true)
  }, [patient?.id])

  async function loadCareModules(preserveSeccion = false) {
    const { data } = await supabase
      .from('patient_care_modules')
      .select('*, professional:assigned_professional_id(id, first_name, last_name)')
      .eq('patient_id', patient.id)
      .eq('is_active', true)
    const mods = data || []
    setCareModules(mods)
    if (preserveSeccion) return
    const ordered = MODULE_ORDER.filter(mt => mods.some(m => m.module_type === mt))
    if (ordered.length > 0) {
      const first = ordered[0]
      const firstSub = MODULE_CONFIG[first]?.subsecciones[0]?.id
      setExpandidos({ [first]: true })
      setSeccionPersist({ type: 'modulo', moduleType: first, sub: firstSub })
    }
  }

  const nombre = pName(patient)
  const edad = calcularEdad(patient.birth_date)
  const ini = initiales(nombre)

  const orderedModules = MODULE_ORDER
    .filter(mt => careModules.some(m => m.module_type === mt))
    .map(mt => ({ ...MODULE_CONFIG[mt], id: mt, careModule: careModules.find(m => m.module_type === mt) }))

  function toggleExpandir(id) {
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function seleccionarModulo(mod) {
    toggleExpandir(mod.id)
    const yaTieneActiva = seccion?.type === 'modulo' && seccion?.moduleType === mod.id
    if (!yaTieneActiva) setSeccionPersist({ type: 'modulo', moduleType: mod.id, sub: mod.subsecciones[0].id })
  }

  function seleccionarSub(moduleType, subId) {
    setSeccionPersist({ type: 'modulo', moduleType, sub: subId })
  }

  function seleccionarExtra(key) {
    setSeccionPersist({ type: 'extra', key })
  }

  function getHeaderInfo() {
    if (!seccion) return { label: '', Icon: null, moduloLabel: '' }
    if (seccion.type === 'extra') {
      const extraMap = {
        chat:            { label: 'Chat',                  Icon: MessageSquare },
        asignacion:      { label: 'Asignación de módulos', Icon: Settings      },
        documentos:      { label: 'Documentos',            Icon: Paperclip     },
        consentimientos: { label: 'Consentimientos',       Icon: ClipboardList },
      }
      return { ...extraMap[seccion.key], moduloLabel: '' }
    }
    const modConfig = MODULE_CONFIG[seccion.moduleType]
    const subConfig = modConfig?.subsecciones?.find(s => s.id === seccion.sub)
    return { label: subConfig?.label || '', Icon: subConfig?.icon || null, moduloLabel: modConfig?.label || '' }
  }

  const { label: seccionLabel, Icon: SeccionIcon, moduloLabel } = getHeaderInfo()

  function renderContenido() {
    if (!seccion) return <div style={{ color: '#8aab9a', fontSize: 14 }}>Seleccioná una sección.</div>
    if (seccion.type === 'extra') {
      const { key } = seccion
      if (key === 'preconsulta') return <PreconsultaTab patient={patient} profile={profile} todayAppointment={todayAppointment} />
      if (key === 'chat') return <ModuleChat patient={patient} careModules={careModules} profile={profile} senderRole={senderRole} />
      if (key === 'documentos') return <DocumentosTab patient={patient} profile={profile} />
      if (key === 'consentimientos') return <ConsentimientosTab patient={patient} profile={profile} />
      if (key === 'asignacion') return (
        <CareModulesAdmin
          patient={patient}
          doctors={doctors || []}
          onModulesUpdated={() => loadCareModules(true)}
          enabledModules={enabledModules}
          clinicPlan={clinicPlan}
        />
      )
    }
    if (seccion.type === 'modulo') {
      const { moduleType, sub } = seccion
      const mod = careModules.find(m => m.module_type === moduleType)
      return <ModuleRenderer moduleType={moduleType} sub={sub} patient={patient} careModule={mod} canEdit={canEdit} profile={profile} />
    }
    return null
  }

  const menuExtras = [
    { key: 'preconsulta',     label: 'Pre-consulta',        Icon: Stethoscope   },
    { key: 'chat',            label: 'Chat',                  Icon: MessageSquare },
    { key: 'documentos',      label: 'Documentos',            Icon: Paperclip     },
    { key: 'consentimientos', label: 'Consentimientos',       Icon: ClipboardList },
    ...(canEdit ? [{ key: 'asignacion', label: 'Asignación de módulos', Icon: Settings }] : []),
  ]

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '80vh', background: LIGHT_BG, borderRadius: 14, overflow: 'hidden', border: '1px solid #e2ede9' }}>

      <aside style={{ width: SIDEBAR_W, minWidth: SIDEBAR_W, background: '#fff', borderRight: '1px solid #e2ede9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #e8f0ed', cursor: 'pointer', fontSize: 12, color: '#6b8f7e', fontWeight: 500, fontFamily: 'inherit' }}>
          <ChevronLeft size={14} color='#6b8f7e' />
          Volver a pacientes
        </button>

        <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid #e8f0ed' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: `linear-gradient(135deg, ${G}, ${DARK_G})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            {ini}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: BLUE, lineHeight: 1.3, marginBottom: 14 }}>{nombre}</div>
          {[
            { label: 'Cédula',     valor: patient.id_number || '--',                           Icon: CreditCard },
            { label: 'Nacimiento', valor: `${formatFecha(patient.birth_date)} · ${edad} años`, Icon: Calendar   },
            { label: 'Teléfono',   valor: patient.phone || patient.profile?.phone || '--',     Icon: Phone      },
            { label: 'Correo',     valor: patient.profile?.email || '--',                      Icon: Mail       },
          ].map(campo => (
            <div key={campo.label} style={{ marginBottom: 9, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <campo.Icon size={12} color='#8aab9a' style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: '#8aab9a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{campo.label}</div>
                <div style={{ fontSize: 12, color: '#2d4a3e', fontWeight: 500, wordBreak: 'break-word' }}>{campo.valor}</div>
              </div>
            </div>
          ))}
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {orderedModules.length > 0 && (
            <div style={{ padding: '0 14px 6px', fontSize: 10, color: '#8aab9a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Módulos activos
            </div>
          )}
          {orderedModules.map(mod => {
            const Icono = mod.icon
            const expandido = expandidos[mod.id]
            const moduloActivo = seccion?.type === 'modulo' && seccion?.moduleType === mod.id
            return (
              <div key={mod.id}>
                <button onClick={() => seleccionarModulo(mod)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderLeft: moduloActivo ? `3px solid ${G}` : '3px solid transparent', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: moduloActivo ? 700 : 500, color: moduloActivo ? DARK_G : '#3a5a4a', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (!moduloActivo) e.currentTarget.style.background = '#f4faf7' }}
                  onMouseLeave={e => { if (!moduloActivo) e.currentTarget.style.background = 'transparent' }}>
                  <Icono size={14} color={moduloActivo ? G : '#6b8f7e'} />
                  <span style={{ flex: 1 }}>{mod.label}</span>
                  {expandido ? <ChevronDown size={13} color='#8aab9a' /> : <ChevronRight size={13} color='#8aab9a' />}
                </button>
                {expandido && (
                  <div style={{ borderLeft: `3px solid ${G}` }}>
                    {mod.subsecciones.map(sub => {
                      const SubIcono = sub.icon
                      const subActiva = seccion?.type === 'modulo' && seccion?.moduleType === mod.id && seccion?.sub === sub.id
                      return (
                        <button key={sub.id} onClick={() => seleccionarSub(mod.id, sub.id)} style={{ width: '100%', textAlign: 'left', background: subActiva ? '#e8f5ef' : 'transparent', border: 'none', padding: '8px 14px 8px 32px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: subActiva ? 700 : 400, color: subActiva ? DARK_G : '#5a7a6a', cursor: 'pointer', transition: 'all 0.1s', fontFamily: 'inherit' }}
                          onMouseEnter={e => { if (!subActiva) e.currentTarget.style.background = '#f4faf7' }}
                          onMouseLeave={e => { if (!subActiva) e.currentTarget.style.background = 'transparent' }}>
                          <SubIcono size={12} color={subActiva ? G : '#8aab9a'} />
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ padding: '12px 14px 6px', fontSize: 10, color: '#8aab9a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
            Expediente
          </div>
          {menuExtras.map(item => {
            const activo = seccion?.type === 'extra' && seccion?.key === item.key
            return (
              <button key={item.key} onClick={() => seleccionarExtra(item.key)} style={{ width: '100%', textAlign: 'left', background: activo ? '#e8f5ef' : 'transparent', border: 'none', borderLeft: activo ? `3px solid ${G}` : '3px solid transparent', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: activo ? 700 : 500, color: activo ? DARK_G : '#3a5a4a', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (!activo) e.currentTarget.style.background = '#f4faf7' }}
                onMouseLeave={e => { if (!activo) e.currentTarget.style.background = 'transparent' }}>
                <item.Icon size={14} color={activo ? G : '#6b8f7e'} />
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 24, overflowY: 'auto', minWidth: 0 }}>
        {seccionLabel && (
          <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            {SeccionIcon && <SeccionIcon size={20} color={G} />}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {moduloLabel && (
                  <>
                    <span style={{ fontSize: 13, color: '#8aab9a', fontWeight: 500 }}>{moduloLabel}</span>
                    <ChevronRight size={13} color='#c0d0ca' />
                  </>
                )}
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: BLUE }}>{seccionLabel}</h2>
              </div>
              <div style={{ fontSize: 12, color: '#8aab9a', marginTop: 2 }}>{nombre} · Expediente clínico</div>
            </div>
          </div>
        )}
        {renderContenido()}
      </main>
    </div>
  )
}
