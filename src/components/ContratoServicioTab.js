import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

function SigPad({ label, value, onChange }) {
  const ref = useRef()
  const drawing = useRef(false)
  const ctx = useRef()

  useEffect(() => {
    const canvas = ref.current
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width || 500
    canvas.height = 120
    ctx.current = canvas.getContext('2d')
    ctx.current.strokeStyle = '#1a1a1a'
    ctx.current.lineWidth = 2
    ctx.current.lineCap = 'round'
  }, [])

  function getPos(e) {
    const r = ref.current.getBoundingClientRect()
    const src = e.touches ? e.touches[0] : e
    return { x: src.clientX - r.left, y: src.clientY - r.top }
  }

  function start(e) { e.preventDefault(); drawing.current = true; const p = getPos(e); ctx.current.beginPath(); ctx.current.moveTo(p.x, p.y) }
  function move(e) { e.preventDefault(); if (!drawing.current) return; const p = getPos(e); ctx.current.lineTo(p.x, p.y); ctx.current.stroke() }
  function end(e) { e.preventDefault(); drawing.current = false; onChange(ref.current.toDataURL()) }
  function clear() { ctx.current.clearRect(0, 0, ref.current.width, ref.current.height); onChange('') }

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:6, color:'#333' }}>{label}</div>
      <canvas ref={ref}
        style={{ width:'100%', height:120, border:'0.5px solid #e0e0e0', borderRadius:8, cursor:'crosshair', touchAction:'none', background:'transparent' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <button type="button" onClick={clear} style={{ marginTop:4, background:'none', border:'none', fontSize:12, color:'#999', cursor:'pointer' }}>Limpiar</button>
      {value && <div style={{ fontSize:11, color:'#1D9E75', marginTop:2 }}>Firma registrada</div>}
    </div>
  )
}

const CONTRATO_TEXTO = (patientName, patientId, fecha) => `
CONTRATO DE SERVICIO MÉDICO
GLOW CLINIC® — VARCOSTA Y ASOCIADOS S.R.L. — CED. 3-102-876315

Fecha: ${fecha}

Entre:
Sr(a). ${patientName}, identificado con cédula de identidad No. ${patientId}, en adelante "el Paciente".

Y:
Varcosta y asociados S.R.L., representada por David Felipe Acosta Solórzano, con cédula de identidad No. 3-102-876315, en adelante "la Clínica", y Wadgner Vargas Fonseca, código profesional MED16837, en adelante "el Médico".

PREÁMBULO:
Por medio del presente contrato, las partes acuerdan los términos y condiciones para la prestación de los servicios médicos en el marco de un procedimiento relacionado con tratamiento para disminución de peso y optimización metabólica, con la intervención de diferentes modalidades terapéuticas según se detalla a continuación. Las partes reconocen que la firma de este contrato implica la aceptación total de las condiciones aquí contenidas.

PRIMERA: OBJETO DEL CONTRATO
El Médico se compromete a proporcionar al Paciente los siguientes servicios médicos en el marco de un tratamiento personalizado que incluye, pero no se limita a:

1. Agonista dual de GLP-1 Certificado por la FDA:
Se administrarán 10 semanas de un agonista GLP-1 certificado por la FDA, que será recetado y aplicado conforme a las indicaciones médicas y la supervisión del Médico. Las citas presenciales serán de un total de 10. Además, dicho medicamento cuenta exclusivamente con el permiso sanitario correspondiente según los lineamientos y estipulaciones del Ministerio de Salud de Costa Rica.

2. Suero de Glutatión + NAD + DMSO:
Se realizará una colocación de sueros entre la semana 4 y 10 con dosificaciones supermáximas del mismo para lograr la estabilización metabólica y la producción de músculo.

3. Mediciones Semanales:
Durante las 10 sesiones semanales, se realizará la toma de peso, porcentaje de grasa corporal, grasa visceral, porcentaje de agua y tasa metabólica basal, con el objetivo de evaluar la evolución del tratamiento y ajustar las dosis conforme sea necesario.

SEGUNDA: CONTROL MÉDICO Y MODIFICACIÓN DE DOSIS
El Médico proporcionará un control guiado estricto a lo largo de todo el tratamiento, con ajustes periódicos en las dosificaciones de los medicamentos y sueros administrados, basándose en las condiciones clínicas y la respuesta del Paciente al tratamiento. El Médico podrá modificar la dosis o cambiar los medicamentos según lo considere necesario para alcanzar los objetivos terapéuticos del Paciente. La decisión del Médico para la estratificación de 6 semanas, dependerá explícitamente de un criterio objetivo y de riesgo para el paciente, tomando como herramientas su conocimiento base y las escalas objetivas de riesgo de paciente. Asimismo, el tratamiento deberá ser de manera personalizada, lo que significa que no podrán extrapolarse la misma posología a ningún paciente, ya que la valoración debe ser estrictamente individualizada.

TERCERA: OBLIGACIONES DEL PACIENTE
El Paciente se compromete a:

1. Asistir puntualmente a todas las sesiones programadas por el Médico, conforme a lo pactado para el tratamiento. Cualquier tardía mayor o igual a 15 minutos respecto a la cita agendada, incurrirá en una ausencia, y el espacio podrá ser liberado a criterio de la Clínica. Por lo tanto, el Paciente deberá coordinar nuevamente una cita para hacer efectiva la colocación del medicamento y las pautas dadas.

2. Seguir las indicaciones del Médico en cuanto a las recomendaciones generales, dieta, ejercicio y cualquier otra aclaración médica que se indique para la correcta evolución del tratamiento.

3. Informar oportunamente al Médico sobre cualquier efecto secundario, malestar o alteración en su estado de salud durante el tratamiento.

4. Proporcionar información veraz sobre su historial médico, medicamentos actuales y condiciones de salud que puedan influir en el tratamiento.

CUARTA: IMPOSIBILIDAD DE CUMPLIMIENTO POR PARTE DEL PACIENTE
El Paciente reconoce y acepta que el incumplimiento de las indicaciones médicas o la falta de asistencia a las sesiones programadas puede afectar de manera significativa la efectividad del tratamiento y los resultados esperados. En caso de incumplimiento de las recomendaciones del Médico, el Paciente asumirá las consecuencias derivadas de tal falta de seguimiento, siendo estas exclusivamente de su responsabilidad. Asimismo, no se realizará la devolución de la inversión realizada para el tratamiento como tal.

QUINTA: DEVOLUCIONES Y CANCELACIONES
El monto de inversión estipulado para este programa queda sujeto a la valoración administrativa de la Clínica y deberá ser cancelado en una única cuota, en la primera cita de valoración y/o colocación de medicamento basal. No aplicará para tales efectos pagos en cuotas o financiamiento interno.

En lo referente a la devolución de la inversión a este programa si el Paciente desea no continuar con el mismo, se tienen los siguientes puntos:

1. Si el paciente solicita una devolución de la inversión, y esta solicitud se encuentra en las próximas 24 horas al pago y el tratamiento no ha sido aplicado aún, se procederá con la devolución del 100% del pago inicial realizado. Después de 24 horas pero antes de la aplicación del medicamento basal, se procederá con una devolución del 75% del total de la inversión inicial.

2. Si el paciente solicita una devolución de la inversión, y esta solicitud se encuentra en las próximas 24 horas al pago, pero el tratamiento inicial ya fue aplicado en la primera cita, se procederá con la devolución del 50% del pago inicial realizado.

3. Si el paciente solicita una devolución del pago, antes o igual a la semana 3 del tratamiento, se procederá con una devolución del 20% del pago inicial realizado.

4. Si el paciente solicita una devolución del pago después de la semana 3, no aplicará para ningún porcentaje de devolución del pago inicial realizado.

La devolución será realizada únicamente mediante transferencia bancaria a la entidad financiera preferida por el Paciente, en un periodo mínimo de 5 días después de la solicitud pero máximo 30 días naturales. El comprobante de la devolución, será enviado mediante correo electrónico solicitando el recibido por parte del Paciente.

SEXTA: LIBERTAD DE RESPONSABILIDAD
El Paciente entiende que, a pesar de que el Médico ha tomado todas las precauciones necesarias y cuenta con la formación adecuada, existen ciertos riesgos inherentes a cualquier procedimiento médico o terapia. El Paciente acepta que, en caso de reacciones adversas, complicaciones o resultados no deseados durante o después del tratamiento, el Médico o la Clínica no serán responsables por daños directos o indirectos, excepto en casos de negligencia médica comprobada. El Paciente libera al Médico y a la Clínica de toda responsabilidad por efectos adversos derivados de la aplicación de los tratamientos y procedimientos realizados conforme a las indicaciones médicas y bajo supervisión profesional.

SÉPTIMA: CONFIDENCIALIDAD
El Médico y la Clínica se comprometen a mantener la confidencialidad de toda la información médica y personal proporcionada por el Paciente, y a no divulgarla sin su consentimiento, salvo por obligación legal o ética profesional.

OCTAVA: DURACIÓN DEL CONTRATO
Este contrato tendrá la misma duración del paquete contratado, y termina su jurisdicción en el momento en el Médico indique que el tratamiento ya ha finalizado, dejando una nota médica clara en el expediente del paciente, que dicho tratamiento ya ha llegado a su fin exponiendo el resultado final obtenido.

NOVENA: VALOR Y FORMA DE PAGO
El valor total del tratamiento será de $1390 + IVA que será pagado de acuerdo con las condiciones acordadas entre las partes. El desglose de las tarifas por los servicios será el siguiente (precio incluye las 10 semanas de tratamiento):

1. Agonista dual de GLP-1: $600.
2. Suero de NAD+Glutatión+DMSO: $400.
3. Sesiones de medición y valoración médica acorde: $390.

El pago puede ser realizado mediante efectivo, transferencia, tarjeta de débito o tarjeta de crédito. El costo total excluye el IVA presente como beneficio de los usuarios de servicios de salud en pagos con tarjeta de crédito o débito. Para los pagos realizados en efectivo o transferencia bancaria, deberá sumarse un 4% de IVA al monto final, correspondiente al monto timbrado para servicios de salud. Se le entregará la factura electrónica al Paciente por medio de correo electrónico o factura física, en un periodo no mayor a las 24 horas después de efectuado el pago total del servicio.

A la fecha de la firma de este contrato, el valor total del servicio podrá tener un descuento variable sobre el costo base como beneficio premium de este paquete. Dicho descuento estará disponible por tiempo limitado y sujeto a condiciones de la Clínica.

DÉCIMA: LEGISLACIÓN APLICABLE Y JURISDICCIÓN
Este contrato se regirá por las leyes de la República de Costa Rica. En caso de conflicto o disputa que no se resuelva amigablemente, las partes se someten a la jurisdicción de los tribunales de la ciudad de San José, Costa Rica.

DÉCIMA-PRIMERA: FIRMA DE LAS PARTES
El Paciente declara que ha leído, entendido y aceptado todas las condiciones contenidas en este contrato y lo firma en señal de su conformidad.
`

export default function ContratoServicioTab({ patient, profile, clinic }) {
  const [contratos, setContratos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [step, setStep] = useState(1)
  const [patientSig, setPatientSig] = useState('')
  const [doctorSig, setDoctorSig] = useState('')

  const pName = `${patient.profile?.first_name || ''} ${patient.profile?.last_name || ''}`.trim()
  const pId = patient.id_number || ''
  const fecha = new Date().toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
  const doctorName = `${profile?.prefix ? profile.prefix + ' ' : ''}${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  const doctorCode = profile?.medical_code || ''

  useEffect(() => { loadContratos() }, [patient.id])

  async function loadContratos() {
    setLoading(true)
    const { data } = await supabase.from('service_contracts')
      .select('*, doctor:signed_by(first_name, last_name, prefix, medical_code)')
      .eq('patient_id', patient.profile?.id || patient.id)
      .order('created_at', { ascending: false })
    setContratos(data || [])
    setLoading(false)
  }

  function resetModal() {
    setStep(1)
    setPatientSig('')
    setDoctorSig('')
  }

  async function handleSave() {
    if (!patientSig || !doctorSig) { alert('Se requieren ambas firmas.'); return }
    setSaving(true)
    await supabase.from('service_contracts').insert({
      patient_id: patient.profile?.id || patient.id,
      clinic_id: profile.clinic_id,
      contract_type: 'perdida_peso',
      patient_name: pName,
      patient_id_number: pId,
      signed_by: profile.id,
      patient_signature: patientSig,
      doctor_signature: doctorSig,
      status: 'signed',
    })
    await loadContratos()
    setModal(false)
    resetModal()
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este contrato?')) return
    await supabase.from('service_contracts').delete().eq('id', id)
    setContratos(p => p.filter(c => c.id !== id))
  }

  function handlePrint(c) {
    const fechaContrato = new Date(c.signed_at).toLocaleDateString('es-CR', { day:'2-digit', month:'long', year:'numeric' })
    const prefix = c.doctor?.prefix ? c.doctor.prefix + ' ' : ''
    const dName = c.doctor ? `${prefix}${c.doctor.first_name} ${c.doctor.last_name}` : doctorName
    const dCode = c.doctor?.medical_code || doctorCode

    const miniSigs = `
      <div style="position:fixed;bottom:12px;right:16px;display:flex;gap:24px;align-items:flex-end;font-size:9pt;">
        <div style="text-align:center;">
          ${c.patient_signature ? `<img src="${c.patient_signature}" style="height:36px;display:block;margin:0 auto 2px;background:transparent;">` : '<div style="height:36px;"></div>'}
          <div style="border-top:0.5px solid #555;padding-top:2px;font-size:8pt;">Paciente</div>
        </div>
        <div style="text-align:center;">
          ${c.doctor_signature ? `<img src="${c.doctor_signature}" style="height:36px;display:block;margin:0 auto 2px;background:transparent;">` : '<div style="height:36px;"></div>'}
          <div style="border-top:0.5px solid #555;padding-top:2px;font-size:8pt;">Médico</div>
        </div>
      </div>`

    const textoContrato = CONTRATO_TEXTO(c.patient_name || pName, c.patient_id_number || pId, fechaContrato)
    const parrafos = textoContrato.trim().split('\n').filter(l => l.trim())

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.7; }
      .page { max-width: 760px; margin: 0 auto; padding: 28px 40px 70px; position: relative; }
      .header { text-align: center; border-bottom: 2px solid #1a3a5c; padding-bottom: 14px; margin-bottom: 20px; }
      .clinic-name { font-size: 16pt; font-weight: 700; color: #1a3a5c; }
      .clinic-sub { font-size: 10pt; color: #666; margin-top: 2px; }
      .doc-title { font-size: 14pt; font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.08em; margin: 18px 0 16px; border-top: 1px solid #1a3a5c; border-bottom: 1px solid #1a3a5c; padding: 8px 0; color: #1a3a5c; }
      p { margin-bottom: 10px; }
      .section-title { font-weight: 700; text-transform: uppercase; margin-top: 16px; margin-bottom: 6px; color: #1a3a5c; border-bottom: 1px solid #e0e0e0; padding-bottom: 3px; }
      .sig-page { padding: 20px 40px 40px; }
      .sig-row { display: flex; justify-content: space-around; margin-top: 60px; gap: 40px; }
      .sig-box { flex: 1; text-align: center; }
      .sig-box img { max-width: 260px; height: 110px; display: block; margin: 0 auto 6px; object-fit: contain; }
      .sig-line { border-top: 1px solid #1a3a5c; padding-top: 8px; margin-top: 4px; }
      .sig-box p { font-size: 11pt; margin: 2px 0; }
        .page-footer { position: fixed; bottom: 10px; right: 20px; display: flex; gap: 20px; align-items: flex-end; font-size: 7pt; z-index: 100; background: white; padding: 4px 8px; border-top: 0.5px solid #ddd; }
      .mini-sig { text-align: center; }
      .mini-sig img { height: 28px; display: block; margin: 0 auto 1px; background: transparent; }
      .mini-sig-line { border-top: 0.5px solid #555; padding-top: 1px; font-size: 6pt; color: #555; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-footer { position: fixed; bottom: 10px; right: 20px; display: flex; gap: 20px; align-items: flex-end; font-size: 7pt; z-index: 100; background: white; padding: 4px 8px; border-top: 0.5px solid #ddd; }
      }
    </style></head><body>
    <div class="page">
      <div class="header">
        <div class="clinic-name">Glow Clinic</div>
        <div class="clinic-sub">Varcosta y Asociados S.R.L. &nbsp;|&nbsp; Ced. 3-102-876315</div>
      </div>
      <div class="doc-title">Contrato de Servicio Médico<br><span style="font-size:11pt;">Programa de Pérdida de Peso y Optimización Metabólica</span></div>
      ${parrafos.map(p => {
        if (p.startsWith('PRIMERA') || p.startsWith('SEGUNDA') || p.startsWith('TERCERA') ||
            p.startsWith('CUARTA') || p.startsWith('QUINTA') || p.startsWith('SEXTA') ||
            p.startsWith('SÉPTIMA') || p.startsWith('OCTAVA') || p.startsWith('NOVENA') ||
            p.startsWith('DÉCIMA') || p.startsWith('PREÁMBULO')) {
          return `<p class="section-title">${p}</p>`
        }
        return `<p>${p}</p>`
      }).join('')}
      <div class="page-footer">
        <div class="mini-sig">
          ${c.patient_signature ? `<img src="${c.patient_signature}">` : '<div style="height:32px;"></div>'}
          <div class="mini-sig-line">Paciente</div>
        </div>
        <div class="mini-sig">
          ${c.doctor_signature ? `<img src="${c.doctor_signature}">` : '<div style="height:32px;"></div>'}
          <div class="mini-sig-line">Médico</div>
        </div>
      </div>
    </div>
    <div class="sig-page">
      <p style="margin-bottom:24px;font-size:10pt;color:#555;">Fecha de firma: <strong>${fechaContrato}</strong></p>
      <div class="sig-row">
        <div class="sig-box">
          ${c.patient_signature ? `<img src="${c.patient_signature}" style="max-width:200px;height:80px;display:block;margin:0 auto;object-fit:contain;">` : '<div style="height:80px;"></div>'}
          <div class="sig-line">
            <p><strong>${c.patient_name || pName}</strong></p>
            ${c.patient_id_number ? `<p>Cédula: ${c.patient_id_number}</p>` : ''}
            <p>Firma del Paciente</p>
          </div>
        </div>
        <div class="sig-box">
          ${c.doctor_signature ? `<img src="${c.doctor_signature}" style="max-width:200px;height:80px;display:block;margin:0 auto;object-fit:contain;">` : '<div style="height:80px;"></div>'}
          <div class="sig-line">
            <p><strong>${dName}</strong></p>
            ${dCode ? `<p>Cód. MED: ${dCode}</p>` : ''}
            <p>Firma del Médico o Representante de la Clínica</p>
          </div>
        </div>
      </div>
    </div>
    </body></html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 800)
  }

  const s = {
    btn: { background:'#1a3a5c', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' },
    iconBtn: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    deleteBtn: { background:'none', border:'1px solid #fde0e0', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#d9534f' },
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' },
    modalBox: { background:'#fff', borderRadius:14, padding:0, width:'100%', maxWidth:640, maxHeight:'92vh', display:'flex', flexDirection:'column', overflow:'hidden' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', color:'#333', verticalAlign:'middle' },
  }

  if (profile?.clinic_id !== 'c49f2d94-a599-423a-b0d4-5f57f77cd95f') return null

  return (
    <div style={{ marginTop:28, paddingTop:20, borderTop:'0.5px solid #e2ede9' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:'#1a3a5c' }}>Contratos de servicio</div>
        <button style={s.btn} onClick={() => { resetModal(); setModal(true) }}>+ Nuevo contrato de servicio</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'#aaa', padding:20, fontSize:13 }}>Cargando...</div>
      ) : contratos.length === 0 ? (
        <div style={{ textAlign:'center', color:'#aaa', fontSize:13, padding:'20px 0' }}>No hay contratos de servicio registrados.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Tipo</th>
              <th style={s.th}>Fecha</th>
              <th style={s.th}>Estado</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {contratos.map(c => (
              <tr key={c.id}>
                <td style={s.td}>Programa pérdida de peso</td>
                <td style={s.td}>{new Date(c.created_at).toLocaleDateString('es-CR')}</td>
                <td style={s.td}>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:12, background:'#E1F5EE', color:'#0F6E56' }}>Firmado</span>
                </td>
                <td style={s.td}>
                  <button style={s.iconBtn} onClick={() => handlePrint(c)}>Imprimir</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(c.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div style={s.overlay} onClick={e => { if(e.target===e.currentTarget){setModal(false);resetModal()} }}>
          <div style={s.modalBox}>
            <div style={{ padding:'18px 24px', borderBottom:'0.5px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
              <div style={{ fontSize:15, fontWeight:600, color:'#1a3a5c' }}>Contrato de servicio — Pérdida de peso</div>
              <button onClick={() => { setModal(false); resetModal() }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
              {step === 1 && (
                <div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:12 }}>El paciente debe leer el contrato completo antes de firmar.</div>
                  <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, padding:'16px 20px', maxHeight:380, overflowY:'auto', fontSize:12, lineHeight:1.8, color:'#333', whiteSpace:'pre-wrap', fontFamily:'inherit' }}>
                    {CONTRATO_TEXTO(pName, pId, fecha)}
                  </div>
                  <div style={{ marginTop:16, padding:'10px 14px', background:'#E6F1FB', borderRadius:8, fontSize:12, color:'#1a3a5c' }}>
                    El paciente <strong>{pName}</strong> debe leer el contrato completo antes de proceder a firmar.
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
                    <button onClick={() => setStep(2)}
                      style={{ ...s.btn, background:'#0F6E56' }}>
                      El paciente ha leído el contrato — Proceder a firmar
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div style={{ fontSize:13, color:'#555', marginBottom:16, padding:'10px 14px', background:'#f8fafc', borderRadius:8 }}>
                    Paso 1: El paciente firma primero. Luego el médico firma.
                  </div>
                  <SigPad label={`Firma del paciente — ${pName}`} value={patientSig} onChange={setPatientSig} />
                  <div style={{ height:1, background:'#eee', margin:'8px 0 16px' }} />
                  <SigPad label={`Firma del médico — ${doctorName}`} value={doctorSig} onChange={setDoctorSig} />
                  <div style={{ display:'flex', gap:8, justifyContent:'space-between', marginTop:8 }}>
                    <button onClick={() => setStep(1)} style={{ padding:'8px 16px', border:'1px solid #e0e0e0', borderRadius:8, cursor:'pointer', fontSize:13, color:'#666', background:'#fff' }}>
                      Volver al contrato
                    </button>
                    <button onClick={handleSave} disabled={saving || !patientSig || !doctorSig}
                      style={{ ...s.btn, background:'#0F6E56', opacity: (!patientSig||!doctorSig||saving)?0.5:1 }}>
                      {saving ? 'Guardando...' : 'Guardar contrato firmado'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
