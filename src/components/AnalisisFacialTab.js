import React from 'react'

const BLUE = '#1a3a5c'
const CLINIC = 'var(--clinic-primary, #1D9E75)'

export default function AnalisisFacialTab({ patient, profile }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: BLUE }}>
        Análisis facial fotográfico
      </h2>
      <p style={{ marginTop: 6, fontSize: 13, color: '#6b8f7e' }}>
        Sección en construcción. Cableado del menú funcionando.
      </p>
      <div style={{
        marginTop: 20, padding: 20, background: '#fff',
        border: '1px solid #e2ede9', borderRadius: 12,
        borderLeft: `3px solid ${CLINIC}`,
        fontSize: 13, color: '#2d4a3e'
      }}>
        Próximamente: subida de imágenes (luz blanca + Wood), Skin Score,
        historial de análisis y reporte validado por el médico.
      </div>
    </div>
  )
}
