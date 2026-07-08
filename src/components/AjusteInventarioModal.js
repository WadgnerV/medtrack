import { useState } from 'react'
import { supabase } from '../lib/supabase'

const G = 'var(--clinic-primary, #0F6E56)'
const BLUE = '#1a3a5c'
const MOTIVOS_ENTRADA = ['Compra', 'Devolución', 'Donación', 'Corrección de conteo', 'Otro']
const MOTIVOS_SALIDA = ['Procedimiento médico', 'Vencimiento', 'Daño o deterioro', 'Corrección de conteo', 'Consumo interno', 'Otro']
const inp = { width:'100%', padding:'7px 9px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

export default function AjusteInventarioModal({ item, profile, onClose, onSaved }) {
  const [tipo, setTipo] = useState('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const motivos = tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SALIDA

  async function save() {
    if (!cantidad || parseFloat(cantidad) <= 0) { setError('Ingresá una cantidad válida'); return }
    if (!motivo) { setError('Seleccioná un motivo'); return }
    setSaving(true)
    const cant = parseFloat(cantidad)
    const nuevaCantidad = tipo === 'entrada' ? item.quantity + cant : item.quantity - cant
    await supabase.from('inventory_items').update({ quantity: nuevaCantidad, updated_at: new Date().toISOString() }).eq('id', item.id)
    await supabase.from('inventory_history').insert({
      item_id: item.id,
      clinic_id: profile.clinic_id,
      quantity_before: item.quantity,
      quantity_after: nuevaCantidad,
      change_type: tipo === 'entrada' ? `entrada_${motivo}` : `salida_${motivo}`,
      change_amount: tipo === 'entrada' ? cant : -cant,
      motivo,
      nota: nota || null,
      recorded_by: profile.id,
    })
    // Notificar si stock bajo
    if (nuevaCantidad <= item.min_quantity && item.min_quantity > 0) {
      const { data: admins } = await supabase.from('profiles').select('id').eq('clinic_id', profile.clinic_id).in('role', ['clinic_admin','admin','receptionist'])
      if (admins && admins.length > 0) {
        await supabase.from('notifications').insert(admins.map(a => ({
          profile_id: a.id, clinic_id: profile.clinic_id,
          type: 'low_stock', title: 'Stock bajo',
          message: `**${item.name}** ha llegado a ${nuevaCantidad} ${item.unit}${nuevaCantidad < 0 ? ' (stock negativo)' : ''} — mínimo: ${item.min_quantity}.`,
          is_read: false, sender_id: profile.id
        })))
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth:440 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:BLUE }}>Ajuste de inventario</div>
            <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{item.name} · Stock actual: <strong>{item.quantity} {item.unit}</strong></div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>

        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[['entrada','Entrada (+)'],['salida','Salida (-)']].map(([v,l]) => (
            <div key={v} onClick={() => { setTipo(v); setMotivo('') }}
              style={{ flex:1, padding:'10px', borderRadius:10, cursor:'pointer', textAlign:'center', fontSize:13, fontWeight:600,
                border: tipo===v ? `2px solid ${v==='entrada'?G:'#D85A30'}` : '1px solid #e0e0e0',
                background: tipo===v ? (v==='entrada'?'#E1F5EE':'#FAECE7') : '#fff',
                color: tipo===v ? (v==='entrada'?G:'#D85A30') : '#888' }}>
              {l}
            </div>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Cantidad ({item.unit})</label>
          <input style={inp} type="number" min="0.01" step="0.01" value={cantidad} onChange={e => setCantidad(e.target.value)} />
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={lbl}>Motivo</label>
          <select style={inp} value={motivo} onChange={e => setMotivo(e.target.value)}>
            <option value="">Seleccionar...</option>
            {motivos.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Nota (opcional)</label>
          <input style={inp} value={nota} onChange={e => setNota(e.target.value)} />
        </div>

        {cantidad && motivo && (
          <div style={{ padding:'10px 14px', borderRadius:10, marginBottom:16,
            background: tipo==='entrada'?'#E1F5EE':'#FAECE7',
            border: `0.5px solid ${tipo==='entrada'?'#9FE1CB':'#F5C4B3'}` }}>
            <span style={{ fontSize:13, color: tipo==='entrada'?G:'#D85A30', fontWeight:600 }}>
              {tipo==='entrada'?'+':'-'}{cantidad} {item.unit}
            </span>
            <span style={{ fontSize:12, color:'#888', marginLeft:8 }}>
              → Nuevo stock: {tipo==='entrada' ? item.quantity + parseFloat(cantidad||0) : item.quantity - parseFloat(cantidad||0)} {item.unit}
            </span>
          </div>
        )}

        {error && <div style={{ fontSize:12, color:'#D85A30', marginBottom:12 }}>{error}</div>}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>Cancelar</button>
          <button onClick={save} disabled={saving || !cantidad || !motivo}
            style={{ background: tipo==='entrada'?G:'#D85A30', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving||!cantidad||!motivo?0.5:1 }}>
            {saving ? 'Guardando...' : 'Registrar ajuste'}
          </button>
        </div>
      </div>
    </div>
  )
}
