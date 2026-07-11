import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'patient-documents'

export default function DocumentosTab({ patient, profile }) {
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const fileRef = useRef()

  useEffect(() => { loadDocs() }, [patient.id])

  async function loadDocs() {
    setLoading(true)
    const { data } = await supabase
      .from('patient_documents')
      .select('*')
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${patient.id}/${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
    if (upErr) { alert('Error al subir archivo'); setUploading(false); return }
    await supabase.from('patient_documents').insert({
      patient_id: patient.id,
      clinic_id: profile.active_clinic_id || profile.clinic_id,
      uploaded_by: profile.id,
      file_name: file.name,
      file_path: path,
      file_type: file.type,
      file_size: file.size,
    })
    await loadDocs()
    setUploading(false)
    fileRef.current.value = ''
  }

  async function handleDelete(doc) {
    if (!window.confirm(`¿Eliminar "${doc.file_name}"?`)) return
    await supabase.storage.from(BUCKET).remove([doc.file_path])
    await supabase.from('patient_documents').delete().eq('id', doc.id)
    setDocs(d => d.filter(x => x.id !== doc.id))
  }

  async function handleDownload(doc) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  function formatSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString('es-CR', { day:'2-digit', month:'short', year:'numeric' })
  }

  const s = {
    wrap: { padding:'16px 0' },
    toolbar: { display:'flex', justifyContent:'flex-end', marginBottom:14 },
    uploadBtn: { background:'var(--clinic-primary, #1D9E75)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer' },
    empty: { textAlign:'center', color:'#aaa', fontSize:14, padding:'40px 0' },
    table: { width:'100%', borderCollapse:'collapse', fontSize:13 },
    th: { textAlign:'left', padding:'8px 12px', color:'#888', fontWeight:500, borderBottom:'1px solid #eee' },
    td: { padding:'10px 12px', borderBottom:'0.5px solid #f0f0f0', color:'#333', verticalAlign:'middle' },
    iconBtn: { background:'none', border:'1px solid #eee', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#555', marginRight:6 },
    deleteBtn: { background:'none', border:'1px solid #fde0e0', borderRadius:6, padding:'4px 10px', fontSize:12, cursor:'pointer', color:'#d9534f' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={handleUpload} />
        <button style={s.uploadBtn} onClick={() => fileRef.current.click()} disabled={uploading}>
          {uploading ? 'Subiendo...' : '+ Subir documento'}
        </button>
      </div>

      {loading ? (
        <div style={s.empty}>Cargando...</div>
      ) : docs.length === 0 ? (
        <div style={s.empty}>No hay documentos registrados para este paciente.</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Nombre</th>
              <th style={s.th}>Tipo</th>
              <th style={s.th}>Tamaño</th>
              <th style={s.th}>Fecha</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {docs.map(doc => (
              <tr key={doc.id}>
                <td style={s.td}>{doc.file_name}</td>
                <td style={s.td}>{doc.file_type || '—'}</td>
                <td style={s.td}>{formatSize(doc.file_size)}</td>
                <td style={s.td}>{formatDate(doc.created_at)}</td>
                <td style={s.td}>
                  <button style={s.iconBtn} onClick={() => handleDownload(doc)}>Ver</button>
                  <button style={s.deleteBtn} onClick={() => handleDelete(doc)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
