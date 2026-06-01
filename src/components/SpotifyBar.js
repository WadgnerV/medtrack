import { useState, useEffect, useCallback, useRef } from 'react'

const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID
const REDIRECT_URI = 'https://medtrack-gilt.vercel.app/spotify-callback'
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative streaming user-read-email user-read-private'

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

const ShuffleIcon = ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? '#1DB954' : '#b3b3b3'}>
    <path d="M18 4l3 3-3 3V8h-2c-1.2 0-2.3.5-3.1 1.4L9 13.6C8.2 14.5 7.1 15 5.9 15H2v-2h3.9c.6 0 1.2-.3 1.6-.7l3.9-4.2C12.4 7 13.9 6.3 15.5 6.3h2.4V4H18zm0 14h-2.5c-.6 0-1.2-.3-1.6-.7l-1.4-1.5-1.4 1.5C10.3 18.2 9.4 18.6 8.4 18.6H2v-2h6.4c.6 0 1.2-.3 1.6-.7l1.4-1.5 1.4 1.5c.8.9 2 1.4 3.2 1.4H18v-1.7l3 3-3 3V18z"/>
  </svg>
)

const RepeatIcon = ({ mode }) => {
  if (mode === 'track') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
    </svg>
  )
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={mode === 'context' ? '#1DB954' : '#b3b3b3'}>
      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
    </svg>
  )
}

const PrevIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
const NextIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#b3b3b3"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
const PlayIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
const PauseIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="#000"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
const SpotifyLogo = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
)

export default function SpotifyBar({ returnTo = '/admin' }) {
  const [token, setToken] = useState(() => localStorage.getItem('spotify_token'))
  const [track, setTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [playlists, setPlaylists] = useState([])
  const [deviceId, setDeviceId] = useState(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off')
  const [selPlaylist, setSelPlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const playerRef = useRef(null)
  const searchTimeout = useRef(null)

  useEffect(() => {
    if (!token) return
    if (window.Spotify) { initPlayer(); return }
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    document.body.appendChild(script)
    window.onSpotifyWebPlaybackSDKReady = () => initPlayer()
    return () => { try { document.body.removeChild(script) } catch(e) {} }
  }, [token])

  function initPlayer() {
    if (playerRef.current) return
    const player = new window.Spotify.Player({
      name: 'MedTrack',
      getOAuthToken: cb => cb(localStorage.getItem('spotify_token')),
      volume: 0.5,
    })
    player.addListener('ready', ({ device_id }) => {
      setDeviceId(device_id)
      setPlayerReady(true)
      fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('spotify_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [device_id], play: false })
      })
    })
    player.addListener('player_state_changed', state => {
      if (!state) return
      const item = state.track_window?.current_track
      if (item) {
        setTrack({ name: item.name, artist: item.artists?.map(a => a.name).join(', '), image: item.album?.images?.[0]?.url, duration: state.duration, progress: state.position, uri: item.uri })
      }
      setIsPlaying(!state.paused)
      setShuffle(state.shuffle)
      setRepeat(state.repeat_mode === 0 ? 'off' : state.repeat_mode === 1 ? 'track' : 'context')
    })
    player.connect()
    playerRef.current = player
  }

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
      body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, code_verifier: verifier })
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

  async function getValidToken() {
    const expires = localStorage.getItem('spotify_token_expires')
    if (expires && Date.now() > parseInt(expires) - 60000) {
      const refreshTk = localStorage.getItem('spotify_refresh_token')
      if (!refreshTk) return null
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: CLIENT_ID, grant_type: 'refresh_token', refresh_token: refreshTk })
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
    return localStorage.getItem('spotify_token')
  }

  useEffect(() => {
    if (!playerRef.current || !isPlaying) return
    const interval = setInterval(() => {
      setTrack(p => p ? { ...p, progress: Math.min(p.progress + 1000, p.duration) } : p)
    }, 1000)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (expanded && token) fetchPlaylists()
  }, [expanded, token])

  async function fetchPlaylists() {
    const tk = await getValidToken()
    if (!tk) return
    const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=30', { headers: { Authorization: `Bearer ${tk}` } })
    const data = await res.json()
    setPlaylists(data.items || [])
  }

  async function fetchPlaylistTracks(playlist) {
    setSelPlaylist(playlist)
    setLoadingTracks(true)
    const tk = await getValidToken()
    if (!tk) return
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`, { headers: { Authorization: `Bearer ${tk}` } })
    const data = await res.json()
    setPlaylistTracks(data.items?.filter(i => i.track) || [])
    setLoadingTracks(false)
  }

  async function handleSearch(q) {
    setSearchQuery(q)
    clearTimeout(searchTimeout.current)
    if (!q.trim()) { setSearchResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const trimmed = q.trim()
      if (!trimmed) return
      const tk = await getValidToken()
      if (!tk) return
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=track&limit=20`, { headers: { Authorization: `Bearer ${tk}` } })
      const data = await res.json()
      setSearchResults(data.tracks?.items || [])
    }, 600)
  }

  async function playTrack(uri, contextUri) {
    const tk = await getValidToken()
    if (!tk || !deviceId) return
    const body = contextUri ? { context_uri: contextUri, offset: { uri } } : { uris: [uri] }
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  }

  async function playPlaylist(uri) {
    const tk = await getValidToken()
    if (!tk || !deviceId) return
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ context_uri: uri })
    })
  }

  async function control(action) {
    if (!playerRef.current) return
    setLoading(true)
    if (action === 'play') await playerRef.current.resume()
    if (action === 'pause') await playerRef.current.pause()
    if (action === 'next') await playerRef.current.nextTrack()
    if (action === 'prev') await playerRef.current.previousTrack()
    setTimeout(() => setLoading(false), 400)
  }

  async function toggleShuffle() {
    const tk = await getValidToken()
    if (!tk) return
    const newVal = !shuffle
    await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${newVal}`, { method: 'PUT', headers: { Authorization: `Bearer ${tk}` } })
    setShuffle(newVal)
  }

  async function cycleRepeat() {
    const tk = await getValidToken()
    if (!tk) return
    const modes = ['off', 'context', 'track']
    const next = modes[(modes.indexOf(repeat) + 1) % 3]
    await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${next === 'off' ? 'off' : next}`, { method: 'PUT', headers: { Authorization: `Bearer ${tk}` } })
    setRepeat(next)
  }

  async function connectSpotify() {
    const verifier = generateCodeVerifier()
    const challenge = await generateCodeChallenge(verifier)
    localStorage.setItem('spotify_code_verifier', verifier)
    localStorage.setItem('spotify_return_to', returnTo)
    const params = new URLSearchParams({ client_id: CLIENT_ID, response_type: 'code', redirect_uri: REDIRECT_URI, scope: SCOPES, code_challenge_method: 'S256', code_challenge: challenge, state: Math.random().toString(36).substring(2), show_dialog: 'true' })
    window.location.href = `https://accounts.spotify.com/authorize?${params}`
  }

  function disconnect() {
    if (playerRef.current) { playerRef.current.disconnect(); playerRef.current = null }
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('spotify_refresh_token')
    localStorage.removeItem('spotify_token_expires')
    setToken(null); setTrack(null); setExpanded(false); setPlayerReady(false)
  }

  const progress = track ? Math.min(Math.round((track.progress / track.duration) * 100), 100) : 0
  const fmtTime = ms => { const s = Math.floor((ms || 0) / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  const TrackRow = ({ t, onClick, contextUri }) => {
    const isCurrent = track?.uri === t.uri
    return (
      <div onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', cursor: 'pointer', borderRadius: 6, background: isCurrent ? 'rgba(29,185,84,0.1)' : 'transparent' }}
        onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = '#282828' }}
        onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent' }}>
        {t.album?.images?.[0]?.url
          ? <img src={t.album.images[0].url} alt="" style={{ width: 34, height: 34, borderRadius: 4, flexShrink: 0 }} />
          : <div style={{ width: 34, height: 34, background: '#333', borderRadius: 4, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: isCurrent ? '#1DB954' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isCurrent ? 600 : 400 }}>{t.name}</div>
          <div style={{ fontSize: 10, color: '#b3b3b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.artists?.map(a => a.name).join(', ')}</div>
        </div>
        <div style={{ fontSize: 10, color: '#b3b3b3', flexShrink: 0 }}>{fmtTime(t.duration_ms)}</div>
      </div>
    )
  }

  if (!token) return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      <button onClick={connectSpotify} style={{ background: '#1DB954', color: '#fff', border: 'none', borderRadius: 24, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        <SpotifyLogo size={18} /> Conectar Spotify
      </button>
    </div>
  )

  return (
    <>
      {expanded && <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setExpanded(false)} />}

      {expanded && (
        <div style={{ position: 'fixed', bottom: 80, right: 20, width: 700, height: 520, background: '#121212', borderRadius: 16, boxShadow: '0 8px 48px rgba(0,0,0,0.7)', zIndex: 1000, overflow: 'hidden', fontFamily: 'Inter, sans-serif', display: 'flex' }}
          onClick={e => e.stopPropagation()}>

          {/* Panel izquierdo — reproductor */}
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #282828', background: 'linear-gradient(180deg, #1a1a2e 0%, #121212 60%)' }}>
            {/* Album art */}
            <div style={{ padding: '20px 20px 12px' }}>
              {track?.image
                ? <img src={track.image} alt="" style={{ width: '100%', aspectRatio: '1', borderRadius: 10, objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }} />
                : <div style={{ width: '100%', aspectRatio: '1', background: '#282828', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SpotifyLogo size={48} /></div>}
            </div>

            {/* Info */}
            <div style={{ padding: '0 20px 12px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{track?.name || 'Sin reproducción'}</div>
              <div style={{ fontSize: 12, color: '#b3b3b3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track?.artist || (playerReady ? 'Listo para reproducir' : 'Iniciando...')}</div>
            </div>

            {/* Barra de progreso */}
            <div style={{ padding: '0 20px 8px' }}>
              <div style={{ height: 4, background: '#535353', borderRadius: 2, marginBottom: 4, cursor: 'pointer' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#1DB954', borderRadius: 2, transition: 'width 1s linear' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#b3b3b3' }}>
                <span>{fmtTime(track?.progress)}</span>
                <span>{fmtTime(track?.duration)}</span>
              </div>
            </div>

            {/* Controles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, padding: '8px 20px' }}>
              <button onClick={toggleShuffle} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <ShuffleIcon active={shuffle} />
              </button>
              <button onClick={() => control('prev')} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <PrevIcon />
              </button>
              <button onClick={() => control(isPlaying ? 'pause' : 'play')} disabled={loading}
                style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', opacity: loading ? 0.7 : 1 }}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </button>
              <button onClick={() => control('next')} disabled={loading} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <NextIcon />
              </button>
              <button onClick={cycleRepeat} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                <RepeatIcon mode={repeat} />
              </button>
            </div>

            {/* Desconectar */}
            <div style={{ marginTop: 'auto', padding: '12px 20px 16px' }}>
              <button onClick={disconnect} style={{ width: '100%', padding: '7px', background: 'transparent', border: '1px solid #535353', borderRadius: 20, color: '#b3b3b3', fontSize: 11, cursor: 'pointer' }}>
                Desconectar Spotify
              </button>
            </div>
          </div>

          {/* Panel derecho — biblioteca */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
            {/* Búsqueda */}
            <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #282828' }}>
              <input value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Buscar canciones..."
                style={{ width: '100%', padding: '8px 14px', background: '#282828', border: 'none', borderRadius: 20, color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Resultados de búsqueda */}
              {searchQuery && searchResults.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 6px' }}>Resultados</div>
                  {searchResults.map(t => (
                    <TrackRow key={t.id} t={t} onClick={() => playTrack(t.uri)} />
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: 30, color: '#b3b3b3', fontSize: 12 }}>Sin resultados</div>
              )}

              {/* Canciones de playlist seleccionada */}
              {!searchQuery && selPlaylist && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px 6px' }}>
                    <button onClick={() => setSelPlaylist(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b3b3b3', fontSize: 14, padding: 0, display: 'flex' }}>←</button>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{selPlaylist.name}</div>
                    <button onClick={() => playPlaylist(selPlaylist.uri)}
                      style={{ background: '#1DB954', border: 'none', borderRadius: 12, padding: '3px 10px', color: '#000', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>▶ Play</button>
                  </div>
                  {loadingTracks && <div style={{ textAlign: 'center', padding: 20, color: '#b3b3b3', fontSize: 12 }}>Cargando...</div>}
                  {playlistTracks.map((item, idx) => item.track && (
                    <TrackRow key={item.track.id + idx} t={item.track} onClick={() => playTrack(item.track.uri, selPlaylist.uri)} />
                  ))}
                </div>
              )}

              {/* Lista de playlists */}
              {!searchQuery && !selPlaylist && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#b3b3b3', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '10px 12px 6px' }}>Mis playlists</div>
                  {playlists.map(pl => (
                    <div key={pl.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', cursor: 'pointer', borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#282828'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div onClick={() => fetchPlaylistTracks(pl)} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        {pl.images?.[0]?.url
                          ? <img src={pl.images[0].url} alt="" style={{ width: 40, height: 40, borderRadius: 4, flexShrink: 0 }} />
                          : <div style={{ width: 40, height: 40, background: '#333', borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><SpotifyLogo size={16} /></div>}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pl.name}</div>
                          <div style={{ fontSize: 10, color: '#b3b3b3' }}>{pl.tracks?.total} canciones</div>
                        </div>
                      </div>
                      <button onClick={() => playPlaylist(pl.uri)}
                        style={{ background: '#1DB954', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.9 }}>
                        <PlayIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <div onClick={() => setExpanded(p => !p)}
        style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, background: '#1DB954', borderRadius: 50, padding: track ? '8px 16px 8px 8px' : '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 24px rgba(29,185,84,0.5)', transition: 'transform 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
        {track?.image
          ? <img src={track.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, flexShrink: 0 }} />
          : <SpotifyLogo size={22} />}
        {track && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{track.name}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{track.artist}</div>
          </div>
        )}
      </div>
    </>
  )
}
