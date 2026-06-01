import { useState, useEffect, useCallback } from 'react'

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID
const REDIRECT_URI = 'https://medtrack-gilt.vercel.app/spotify-callback'
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative'

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
  const [playlists, setPlaylists] = useState([])
  const [volume, setVolume] = useState(50)

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
    if (expires && Date.now() > parseInt(expires) - 60000) return await refreshToken()
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
        album: data.item.album?.name,
        image: data.item.album?.images?.[0]?.url,
        duration: data.item.duration_ms,
        progress: data.progress_ms,
      })
      setIsPlaying(data.is_playing)
    }
  }, [token])

  async function fetchPlaylists() {
    const tk = await getValidToken()
    if (!tk) return
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
      headers: { Authorization: `Bearer ${tk}` }
    })
    const data = await res.json()
    setPlaylists(data.items || [])
  }

  useEffect(() => {
    if (!token) return
    fetchCurrentTrack()
    const interval = setInterval(fetchCurrentTrack, 5000)
    return () => clearInterval(interval)
  }, [token, fetchCurrentTrack])

  useEffect(() => {
    if (expanded && token) fetchPlaylists()
  }, [expanded, token])

  async function control(action) {
    const tk = await getValidToken()
    if (!tk) return
    setLoading(true)
    const map = {
      play: { url: 'https://api.spotify.com/v1/me/player/play', method: 'PUT' },
      pause: { url: 'https://api.spotify.com/v1/me/player/pause', method: 'PUT' },
      next: { url: 'https://api.spotify.com/v1/me/player/next', method: 'POST' },
      prev: { url: 'https://api.spotify.com/v1/me/player/previous', method: 'POST' },
    }
    await fetch(map[action].url, { method: map[action].method, headers: { Authorization: `Bearer ${tk}` } })
    setTimeout(() => { fetchCurrentTrack(); setLoading(false) }, 600)
    if (action === 'play') setIsPlaying(true)
    if (action === 'pause') setIsPlaying(false)
  }

  async function playPlaylist(uri) {
    const tk = await getValidToken()
    if (!tk) return
    await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_uri: uri })
    })
    setTimeout(fetchCurrentTrack, 800)
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
    setToken(null); setTrack(null); setExpanded(false)
  }

  const progress = track ? Math.round((track.progress / track.duration) * 100) : 0
  const fmtTime = ms => { const s = Math.floor(ms/1000); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }

  if (!token) return (
    <div style={{ position:'fixed', bottom:20, right:20, zIndex:1000 }}>
      <button onClick={connectSpotify} style={{ background:'#1DB954', color:'#fff', border:'none', borderRadius:24, padding:'10px 18px', fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:8, boxShadow:'0 4px 16px rgba(0,0,0,0.2)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
        Conectar Spotify
      </button>
    </div>
  )

  return (
    <>
      {/* Overlay */}
      {expanded && <div style={{ position:'fixed', inset:0, zIndex:999 }} onClick={() => setExpanded(false)} />}

      {/* Panel expandido */}
      {expanded && (
        <div style={{ position:'fixed', bottom:80, right:20, width:320, background:'#121212', borderRadius:16, boxShadow:'0 8px 40px rgba(0,0,0,0.5)', zIndex:1000, overflow:'hidden', fontFamily:'Inter, sans-serif' }}>
          {/* Album art + info */}
          <div style={{ padding:20, background: track?.image ? 'linear-gradient(180deg, #333 0%, #121212 100%)' : '#1a1a1a' }}>
            {track?.image && <img src={track.image} alt="" style={{ width:'100%', borderRadius:8, marginBottom:14, boxShadow:'0 4px 20px rgba(0,0,0,0.4)' }} />}
            {!track?.image && <div style={{ width:'100%', height:160, background:'#282828', borderRadius:8, marginBottom:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:48 }}>🎵</div>}
            <div style={{ fontSize:15, fontWeight:700, color:'#fff', marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track?.name || 'Sin reproducción'}</div>
            <div style={{ fontSize:13, color:'#b3b3b3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{track?.artist || ''}</div>
          </div>

          {/* Barra de progreso */}
          <div style={{ padding:'0 20px 12px' }}>
            <div style={{ height:3, background:'#535353', borderRadius:2, marginBottom:6, cursor:'pointer' }}>
              <div style={{ height:'100%', width:`${progress}%`, background:'#1DB954', borderRadius:2, transition:'width 1s linear' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'#b3b3b3' }}>
              <span>{track ? fmtTime(track.progress) : '0:00'}</span>
              <span>{track ? fmtTime(track.duration) : '0:00'}</span>
            </div>
          </div>

          {/* Controles */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24, padding:'0 20px 20px' }}>
            <button onClick={() => control('prev')} disabled={loading} style={{ background:'none', border:'none', cursor:'pointer', color:'#b3b3b3', fontSize:20, padding:0 }}>⏮</button>
            <button onClick={() => control(isPlaying ? 'pause' : 'play')} disabled={loading}
              style={{ width:48, height:48, borderRadius:'50%', background:'#fff', border:'none', cursor:'pointer', fontSize:22, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.3)' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => control('next')} disabled={loading} style={{ background:'none', border:'none', cursor:'pointer', color:'#b3b3b3', fontSize:20, padding:0 }}>⏭</button>
          </div>

          {/* Playlists */}
          {playlists.length > 0 && (
            <div style={{ borderTop:'1px solid #282828', padding:'12px 0' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#b3b3b3', textTransform:'uppercase', letterSpacing:'0.08em', padding:'0 16px', marginBottom:8 }}>Mis playlists</div>
              <div style={{ maxHeight:160, overflowY:'auto' }}>
                {playlists.map(pl => (
                  <div key={pl.id} onClick={() => playPlaylist(pl.uri)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 16px', cursor:'pointer', transition:'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#282828'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {pl.images?.[0]?.url ? <img src={pl.images[0].url} alt="" style={{ width:32, height:32, borderRadius:4, flexShrink:0 }} /> : <div style={{ width:32, height:32, background:'#333', borderRadius:4, flexShrink:0 }} />}
                    <div style={{ fontSize:12, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{pl.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Desconectar */}
          <div style={{ padding:'8px 16px 16px', borderTop:'1px solid #282828' }}>
            <button onClick={disconnect} style={{ width:'100%', padding:'8px', background:'transparent', border:'1px solid #535353', borderRadius:20, color:'#b3b3b3', fontSize:12, cursor:'pointer' }}>
              Desconectar Spotify
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <div onClick={() => setExpanded(p => !p)}
        style={{ position:'fixed', bottom:20, right:20, zIndex:1000, background:'#1DB954', borderRadius:50, padding: track ? '8px 16px 8px 8px' : '12px', cursor:'pointer', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 20px rgba(29,185,84,0.4)', transition:'all 0.2s' }}>
        {track?.image ? <img src={track.image} alt="" style={{ width:36, height:36, borderRadius:6, flexShrink:0 }} /> : <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>}
        {track && (
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{track.name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,0.8)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{track.artist}</div>
          </div>
        )}
      </div>
    </>
  )
}
