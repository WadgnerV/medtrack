import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SpotifyCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')

    if (code) {
      // Guardar el code en localStorage para que SpotifyBar lo procese
      localStorage.setItem('spotify_auth_code', code)
      localStorage.setItem('spotify_auth_state', state || '')
    }

    // Redirigir a la vista que tenía antes
    const returnTo = localStorage.getItem('spotify_return_to') || '/admin'
    navigate(returnTo, { replace: true })
  }, [])

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Inter, sans-serif', color:'#666' }}>
      Conectando con Spotify...
    </div>
  )
}
