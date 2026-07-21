import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { oldPatientId, profileId, migClinicOrigen, migClinicDestino } = await req.json()

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Obtener datos del paciente original
    const { data: oldPat } = await sb.from('patients').select('*').eq('id', oldPatientId).single()
    if (!oldPat) throw new Error('Paciente no encontrado')

    // 2. Verificar si ya existe en clínica destino
    const { data: existing } = await sb.from('patients').select('id')
      .eq('profile_id', profileId).eq('clinic_id', migClinicDestino).maybeSingle()

    let newPatientId = existing?.id

    if (!newPatientId) {
      const { data: newPat, error: patError } = await sb.from('patients').insert({
        profile_id: profileId,
        clinic_id: migClinicDestino,
        status: oldPat.status,
        birth_date: oldPat.birth_date,
        sex: oldPat.sex,
        id_number: oldPat.id_number,
        phone: oldPat.phone,
        province: oldPat.province,
        canton: oldPat.canton,
        district: oldPat.district,
        address: oldPat.address,
        height_cm: oldPat.height_cm,
      }).select('id').single()
      if (patError) throw new Error('Error creando paciente: ' + patError.message)
      newPatientId = newPat.id
    }

    // 3. Copiar preconsultas
    const { data: preconsults } = await sb.from('preconsult_records')
      .select('*').eq('patient_id', profileId).eq('clinic_id', migClinicOrigen)
    let preconsultCount = 0
    for (const r of (preconsults || [])) {
      const { id, created_at, updated_at, ...rest } = r
      await sb.from('preconsult_records').insert({ ...rest, clinic_id: migClinicDestino })
      preconsultCount++
    }

    // 4. Copiar notas clínicas
    const { data: notes } = await sb.from('clinical_notes')
      .select('*').eq('patient_id', oldPatientId).eq('clinic_id', migClinicOrigen)
    let notesCount = 0
    for (const n of (notes || [])) {
      const { id, created_at, ...rest } = n
      await sb.from('clinical_notes').insert({ ...rest, patient_id: newPatientId, clinic_id: migClinicDestino })
      notesCount++
    }

    // 5. Copiar diagnósticos
    const { data: diags } = await sb.from('patient_diagnoses')
      .select('*').eq('patient_id', oldPatientId)
    let diagsCount = 0
    for (const d of (diags || [])) {
      const { id, created_at, ...rest } = d
      await sb.from('patient_diagnoses').insert({ ...rest, patient_id: newPatientId })
      diagsCount++
    }

    // 6. Copiar antecedentes
    const { data: ant } = await sb.from('patient_antecedentes')
      .select('*').eq('patient_id', profileId).eq('clinic_id', migClinicOrigen).maybeSingle()
    if (ant) {
      const { id, created_at, updated_at, ...rest } = ant
      await sb.from('patient_antecedentes').insert({ ...rest, clinic_id: migClinicDestino })
    }

    // 7. Copiar documentos
    const { data: docs } = await sb.from('patient_documents')
      .select('*').eq('patient_id', oldPatientId).eq('clinic_id', migClinicOrigen)
    let docsCount = 0
    for (const d of (docs || [])) {
      const { id, created_at, ...rest } = d
      await sb.from('patient_documents').insert({ ...rest, patient_id: newPatientId, clinic_id: migClinicDestino })
      docsCount++
    }

    return new Response(JSON.stringify({
      ok: true,
      newPatientId,
      counts: { preconsults: preconsultCount, notes: notesCount, diags: diagsCount, docs: docsCount }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
