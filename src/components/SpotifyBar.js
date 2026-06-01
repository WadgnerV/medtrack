import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID
const REDIRECT_URI = 'https://medtrack-gilt.vercel.app/spotify-callback'
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing'

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 43)
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export default function SpotifyBar({ returnTo = '/admin' }) {
  const [token, setToken] = useState(() => localStorage.getItem('spotify_token'))
  const [track, setTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  // Intercambiar código por token
  useEffect(() => {
    const code = localStorage.getItem('spotify_auth_code')
    const verifier = localStorage.getItem('spotify_code_verifier')
    if (code && verifier) {
      localStorage.removeItem('spotify_auth_code')
      exchangeCode(code, verifier)
    }
  }, [])

  async function exchangeCode(code, verifier) {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: verifier,
      })
    })
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem('spotify_token', data.access_token)
      localStorage.setItem('spotify_refresh_token', data.refresh_token)
      localStorage.setItem('spotify_token_expires', Date.now() + data.expires_in * 1000)
      setToken(data.access_token)
      localStorage.removeItem('spotify_code_verifier')
    }
  }

  async function refreshToken() {
    const refreshTk = localStorage.getItem('spotify_refresh_token')
    if (!refreshTk) return null
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshTk,
      })
    })
    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem('spotify_token', data.access_token)
      localStorage.setItem('spotify_token_expires', Date.now() + data.expires_in * 1000)
      setToken(data.access_token)
      return data.access_token
    }
    return null
  }

  async function getValidToken() {
    const expires = localStorage.getItem('spotify_token_expires')
    if (expires && Date.now() > parseInt(expires) - 60000) {
      return await refreshToken()
    }
    return token
  }

  const fetchCurrentTrack = useCallback(async () => {
    const tk = await getValidToken()
    if (!tk) return
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${tk}` }
    })
    if (res.status === 204) { setTrack(null); setIsPlaying(false); return }
    if (!res.ok) return
    const data = await res.json()
    if (data?.item) {
      setTrack({
        name: data.item.name,
        artist: data.item.artists?.map(a => a.name).join(', '),
        image: data.item.album?.images?.[0]?.url,
        duration: data.item.duration_ms,
        progress: data.progress_ms,
      })
      setIsPlaying(data.is_playing)
    }
  }, [token])

  useEffect(() => {
    if (!token) return
    fetchCurrentTrack()
    const interval = setInterval(fetchCurrentTrack, 5000)
    return () => clearInterval(interval)
  }, [token, fetchCurrentTrack])

  async function control(action) {
    const tk = await getValidToken()
    if (!tk) return
    setLoading(true)
    const endpoints = {
      play: { url: 'https://api.spotify.com/v1/me/player/play', method: 'PUT' },
      pause: { url: 'https://api.spotify.com/v1/me/player/pause', method: 'PUT' },
      next: { url: 'https://api.spotify.com/v1/me/player/next', method: 'POST' },
      prev: { url: 'https://api.spotify.com/v1/me/player/previous', method: 'POST' },
    }
    const { url, method } = endpoints[action]
    await fetch(url, { method, headers: { Authorization: `Bearer ${tk}` } })
    setTimeout(() => { fetchCurrentTrack(); setLoading(false) }, 500)
    if (action === 'play') setIsPlaying(true)
    if (action === 'pause') setIsPlaying(false)
  }

  async function connectSpotify() {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    localStorage.setItem('spotify_code_verifier', verifier)
    localStorage.setItem('spotify_return_to', returnTo)
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state: Math.random().toString(36).substring(2),
    })
    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  function disconnect() {
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('spotify_refresh_token')
    localStorage.removeItem('spotify_token_expires')
    setToken(null)
    setTrack(null)
  }

  const btnStyle = { background:'none', border:'none', cursor:'pointer', color:'#fff', fontSize:18, padding:'0 6px', opacity: loading ? 0.5 : 1 }

  // Sin token — mostrar botón de conectar
  if (!token) {
    return (
      <div style={{ position:'fixed', bottom:16, right:16, zIndex:1000 }}>
        <button onClick={connectSpotify}
          style={{ background:'#1DB954', color:'#fff', border:'none', borderRadius:20, padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6, boxShadow:'0 2px 8px rgba(0,0,0,0.2)' }}>
          <span>🎵</span> Conectar Spotify
        </button>
      </div>
    )
  }

  // Con token — mostrar barra
  return (
    <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'#181818', color:'#fff', zIndex:1000, fontFamily:'Inter, sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'8px 16px', maxWidth:'100%' }}>
        {/* Imagen */}
        {track?.image && <img src={track.image} alt="" style={{ width:36, height:36, borderRadius:4, flexShrink:0 }} />}
        {!track?.image && <div style={{ width:36, height:36, borderRadius:4, background:'#333', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🎵</div>}

        {/* Info canción */}
        <div style={{ flex:1, minWidth:0 }}>
          {track ? (
            <>
              <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.name}</div>
              <div style={{ fontSize:11, color:'#b3b3b3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track.artist}</div>
            </>
          ) : (
            <div style={{ fontSize:12, color:'#b3b3b3' }}>Sin reproducción activa</div>
          )}
        </div>

        {/* Controles */}
        <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
          <button style={btnStyle} onClick={() => control('prev')} disabled={loading}>⏮</button>
          <button style={{ ...btnStyle, fontSize:22 }} onClick={() => control(isPlaying ? 'pause' : 'play')} disabled={loading}>
            {isPlaying ? '⏸' : '▶️'}
          </button>
          <button style={btnStyle} onClick={() => control('next')} disabled={loading}>⏭</button>
        </div>

        {/* Desconectar */}
        <button onClick={disconnect} style={{ background:'none', border:'1px solid #444', borderRadius:12, color:'#888', fontSize:10, padding:'2px 8px', cursor:'pointer', flexShrink:0 }}>
          Desconectar
        </button>
      </div>
    </div>
  )
}
