import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const G = '#0F6E56'
const BLUE = '#1a3a5c'
const inp = { width:'100%', padding:'8px 10px', fontSize:13, border:'1px solid #e0e0e0', borderRadius:8, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }
const lbl = { fontSize:11, fontWeight:700, color:'#555', textTransform:'uppercase', letterSpacing:'0.7px', marginBottom:4, display:'block' }

export default function BodegasModal({ profile, onClose }) {
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', description:'', address:'', lat:'', lng:'' })
  const [editingId, setEditingId] = useState(null)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const autocompleteRef = useRef(null)
  const addressInputRef = useRef(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('warehouses').select('*').eq('clinic_id', profile.active_clinic_id || profile.clinic_id).order('name')
    setBodegas(data || [])
    setLoading(false)
  }

  useEffect(() => {
    if (!showForm) return
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY
    if (!apiKey) return
    if (window.google && window.google.maps) {
      initMap()
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.onload = initMap
    document.head.appendChild(script)
  }, [showForm])

  function initMap() {
    if (!mapRef.current || !window.google) return
    const defaultPos = { lat: 9.9281, lng: -84.0907 }
    const map = new window.google.maps.Map(mapRef.current, {
      center: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : defaultPos,
      zoom: 13,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    mapInstanceRef.current = map

    const marker = new window.google.maps.Marker({
      map,
      position: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : null,
      draggable: true,
    })
    markerRef.current = marker

    map.addListener('click', e => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      marker.setPosition(pos)
      setForm(p => ({ ...p, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }))
      reverseGeocode(pos.lat, pos.lng)
    })

    marker.addListener('dragend', e => {
      const pos = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setForm(p => ({ ...p, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }))
      reverseGeocode(pos.lat, pos.lng)
    })

    if (addressInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
        componentRestrictions: { country: 'cr' },
      })
      autocompleteRef.current = autocomplete
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (!place.geometry) return
        const pos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
        marker.setPosition(pos)
        map.setCenter(pos)
        map.setZoom(17)
        setForm(p => ({ ...p, address: place.formatted_address, lat: pos.lat.toFixed(6), lng: pos.lng.toFixed(6) }))
      })
    }
  }

  async function reverseGeocode(lat, lng) {
    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setForm(p => ({ ...p, address: results[0].formatted_address }))
          if (addressInputRef.current) addressInputRef.current.value = results[0].formatted_address
        }
      })
    } catch {}
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    const payload = {
      clinic_id: profile.active_clinic_id || profile.clinic_id,
      name: form.name,
      description: form.description || null,
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
    }
    if (editingId) {
      await supabase.from('warehouses').update(payload).eq('id', editingId)
    } else {
      await supabase.from('warehouses').insert(payload)
    }
    await load()
    setShowForm(false)
    setEditingId(null)
    setForm({ name:'', description:'', address:'', lat:'', lng:'' })
    setSaving(false)
  }

  async function remove(id) {
    if (!window.confirm('¿Eliminar esta bodega?')) return
    await supabase.from('warehouses').delete().eq('id', id)
    setBodegas(p => p.filter(b => b.id !== id))
  }

  function startEdit(b) {
    setForm({ name:b.name, description:b.description||'', address:b.address||'', lat:b.lat||'', lng:b.lng||'' })
    setEditingId(b.id)
    setShowForm(true)
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:14, padding:24, width:'100%', maxWidth: showForm ? 700 : 500, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, color:BLUE }}>{showForm ? (editingId ? 'Editar bodega' : 'Nueva bodega') : 'Bodegas'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#aaa' }}>×</button>
        </div>

        {!showForm ? (
          <>
            {loading ? (
              <div style={{ textAlign:'center', padding:20, color:'#bbb', fontSize:13 }}>Cargando...</div>
            ) : bodegas.length === 0 ? (
              <div style={{ textAlign:'center', padding:24, color:'#bbb', fontSize:13 }}>No hay bodegas registradas</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                {bodegas.map(b => (
                  <div key={b.id} style={{ background:'#f8fbf9', border:'0.5px solid #e2ede9', borderRadius:10, padding:'12px 14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:BLUE }}>{b.name}</div>
                      {b.description && <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{b.description}</div>}
                      {b.address && <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}><i className="ti ti-map-pin" style={{ fontSize:11 }} aria-hidden="true"></i> {b.address}</div>}
                    </div>
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => startEdit(b)} style={{ border:'0.5px solid #e2ede9', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#555' }}>Editar</button>
                      <button onClick={() => remove(b.id)} style={{ border:'0.5px solid #fde0e0', background:'#fff', borderRadius:6, padding:'3px 8px', cursor:'pointer', fontSize:11, color:'#D85A30' }}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <button onClick={onClose} style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>Cerrar</button>
              <button onClick={() => setShowForm(true)} style={{ background:'var(--clinic-primary, #0F6E56)', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, fontWeight:500 }}>+ Nueva bodega</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Nombre <span style={{ color:'#D85A30' }}>*</span></label>
                <input style={inp} value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Descripción</label>
                <input style={inp} value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={lbl}>Dirección (buscar o seleccionar en el mapa)</label>
                <input ref={addressInputRef} style={inp} defaultValue={form.address} onChange={e => setForm(p=>({...p,address:e.target.value}))} />
              </div>
            </div>
            <div ref={mapRef} style={{ width:'100%', height:280, borderRadius:10, border:'0.5px solid #e2ede9', marginBottom:16 }} />
            {form.lat && form.lng && (
              <div style={{ fontSize:11, color:'#aaa', marginBottom:12 }}>Coordenadas: {form.lat}, {form.lng}</div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm({ name:'', description:'', address:'', lat:'', lng:'' }) }}
                style={{ border:'0.5px solid #e0e0e0', background:'#fff', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, color:'#555' }}>
                Cancelar
              </button>
              <button onClick={save} disabled={saving || !form.name}
                style={{ background:'var(--clinic-primary, #0F6E56)', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', cursor:'pointer', fontSize:13, fontWeight:500, opacity: saving||!form.name?0.6:1 }}>
                {saving ? 'Guardando...' : 'Guardar bodega'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
