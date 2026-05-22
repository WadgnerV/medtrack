
export const EJERCICIOS_PREDEFINIDOS = [
  {
    name: 'Plancha abdominal',
    description: 'Fortalecimiento isométrico del core. Mantené el cuerpo recto de cabeza a pies.',
    video_url: 'https://www.youtube.com/watch?v=ogfuXWgXVsg',
    group: 'Columna y postura',
  },
  {
    name: 'Sentadilla',
    description: 'Fortalecimiento de cuádriceps, glúteos e isquiotibiales. Bajá hasta que los muslos estén paralelos al piso.',
    video_url: 'https://www.youtube.com/watch?v=aclHkVaku9U',
    group: 'Miembro inferior',
  },
  {
    name: 'Puente de glúteos',
    description: 'Fortalecimiento de glúteos y zona lumbar en decúbito supino. Apretá los glúteos al subir.',
    video_url: 'https://www.youtube.com/watch?v=wPM8icPu6H8',
    group: 'Miembro inferior',
  },
  {
    name: 'Elevación de talones',
    description: 'Fortalecimiento de pantorrillas. Subí lentamente sobre las puntas de los pies.',
    video_url: 'https://www.youtube.com/watch?v=gwLzBJYoWlI',
    group: 'Miembro inferior',
  },
  {
    name: 'Extensión de rodilla en silla',
    description: 'Fortalecimiento de cuádriceps en sedestación. Extendé la rodilla lentamente.',
    video_url: 'https://www.youtube.com/watch?v=YyvSfVjQeL0',
    group: 'Miembro inferior',
  },
  {
    name: 'Abducción de cadera en decúbito lateral',
    description: 'Fortalecimiento de glúteo medio. Mantené la pierna recta al elevarla.',
    video_url: 'https://www.youtube.com/watch?v=kDiAQ_e-mkg',
    group: 'Miembro inferior',
  },
  {
    name: 'Flexión plantar con banda elástica',
    description: 'Fortalecimiento de musculatura del tobillo con resistencia elástica.',
    video_url: 'https://www.youtube.com/watch?v=7VY9FMkI9eI',
    group: 'Miembro inferior',
  },
  {
    name: 'Estiramiento de isquiotibiales',
    description: 'Elongación de la musculatura posterior del muslo. Mantené la rodilla extendida.',
    video_url: 'https://www.youtube.com/watch?v=UgHEMnFBHbk',
    group: 'Flexibilidad',
  },
  {
    name: 'Estiramiento de cuádriceps',
    description: 'Elongación de la musculatura anterior del muslo de pie.',
    video_url: 'https://www.youtube.com/watch?v=tB-RBhNovkE',
    group: 'Flexibilidad',
  },
  {
    name: 'Estiramiento de pantorrilla',
    description: 'Elongación del gastrocnemio y sóleo apoyado en la pared.',
    video_url: 'https://www.youtube.com/watch?v=OkO4IXKZ8-o',
    group: 'Flexibilidad',
  },
  {
    name: 'Rotación de hombro con banda',
    description: 'Fortalecimiento del manguito rotador con banda elástica.',
    video_url: 'https://www.youtube.com/watch?v=yAIbVhXz0ok',
    group: 'Miembro superior',
  },
  {
    name: 'Flexión de codo con banda',
    description: 'Fortalecimiento de bíceps con resistencia elástica.',
    video_url: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo',
    group: 'Miembro superior',
  },
  {
    name: 'Extensión de tríceps',
    description: 'Fortalecimiento de tríceps braquial.',
    video_url: 'https://www.youtube.com/watch?v=-pHMIQC9xDI',
    group: 'Miembro superior',
  },
  {
    name: 'Retracción escapular',
    description: 'Activación de romboides y trapecio medio. Juntá los omóplatos al centro.',
    video_url: 'https://www.youtube.com/watch?v=S9HkJH_Zgkw',
    group: 'Columna y postura',
  },
  {
    name: 'Ejercicio de McKenzie en extensión',
    description: 'Extensión lumbar en decúbito prono. Recomendado para dolor de espalda baja.',
    video_url: 'https://www.youtube.com/watch?v=8mZQISXRNMo',
    group: 'Columna y postura',
  },
  {
    name: 'Estabilización lumbopélvica (dead bug)',
    description: 'Activación de core y estabilizadores lumbopélvicos en decúbito supino.',
    video_url: 'https://www.youtube.com/watch?v=4XLEnwUr1d8',
    group: 'Columna y postura',
  },
  {
    name: 'Plancha lateral',
    description: 'Fortalecimiento de oblicuos y estabilizadores laterales del tronco.',
    video_url: 'https://www.youtube.com/watch?v=ogfuXWgXVsg',
    group: 'Columna y postura',
  },
  {
    name: 'Ejercicios de Kegel',
    description: 'Fortalecimiento del suelo pélvico. Contraé y relajá la musculatura pélvica.',
    video_url: 'https://www.youtube.com/watch?v=kFr9c7c6lXY',
    group: 'Suelo pélvico',
  },
  {
    name: 'Equilibrio monopodal',
    description: 'Entrenamiento del equilibrio sobre un pie. Mantené la mirada fija al frente.',
    video_url: 'https://www.youtube.com/watch?v=MBELdnSRqOQ',
    group: 'Coordinación',
  },
  {
    name: 'Marcha estacionaria',
    description: 'Ejercicio de coordinación y activación general. Levantá las rodillas al nivel de la cadera.',
    video_url: 'https://www.youtube.com/watch?v=Zy1hLUBR4-8',
    group: 'Coordinación',
  },
  {
    name: 'Movilización cervical activa',
    description: 'Movimientos suaves del cuello en todas las direcciones para mejorar rango de movimiento.',
    video_url: 'https://www.youtube.com/watch?v=vkJJLU6UXxs',
    group: 'Columna y postura',
  },
]

export const GRUPOS_EJERCICIOS = [...new Set(EJERCICIOS_PREDEFINIDOS.map(e => e.group))]
