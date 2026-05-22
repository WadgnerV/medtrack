
export const EJERCICIOS_PREDEFINIDOS = [
  {
    name: 'Sentadilla',
    description: 'Ejercicio de fortalecimiento de cuádriceps, glúteos e isquiotibiales.',
    video_url: 'https://www.youtube.com/watch?v=aclHkVaku9U',
    group: 'Miembro inferior',
  },
  {
    name: 'Puente de glúteos',
    description: 'Fortalecimiento de glúteos y zona lumbar en decúbito supino.',
    video_url: 'https://www.youtube.com/watch?v=wPM8icPu6H8',
    group: 'Miembro inferior',
  },
  {
    name: 'Elevación de talones',
    description: 'Fortalecimiento de pantorrillas y tobillo.',
    video_url: 'https://www.youtube.com/watch?v=gwLzBJYoWlI',
    group: 'Miembro inferior',
  },
  {
    name: 'Extensión de rodilla en silla',
    description: 'Fortalecimiento de cuádriceps en sedestación.',
    video_url: 'https://www.youtube.com/watch?v=YyvSfVjQeL0',
    group: 'Miembro inferior',
  },
  {
    name: 'Abducción de cadera en decúbito lateral',
    description: 'Fortalecimiento de glúteo medio y estabilizadores de cadera.',
    video_url: 'https://www.youtube.com/watch?v=kDiAQ_e-mkg',
    group: 'Miembro inferior',
  },
  {
    name: 'Flexión plantar con banda elástica',
    description: 'Fortalecimiento de musculatura del tobillo con resistencia.',
    video_url: 'https://www.youtube.com/watch?v=7VY9FMkI9eI',
    group: 'Miembro inferior',
  },
  {
    name: 'Estiramiento de isquiotibiales',
    description: 'Elongación de la musculatura posterior del muslo.',
    video_url: 'https://www.youtube.com/watch?v=UgHEMnFBHbk',
    group: 'Flexibilidad',
  },
  {
    name: 'Estiramiento de cuádriceps',
    description: 'Elongación de la musculatura anterior del muslo.',
    video_url: 'https://www.youtube.com/watch?v=tB-RBhNovkE',
    group: 'Flexibilidad',
  },
  {
    name: 'Estiramiento de pantorrilla',
    description: 'Elongación del gastrocnemio y sóleo.',
    video_url: 'https://www.youtube.com/watch?v=OkO4IXKZ8-o',
    group: 'Flexibilidad',
  },
  {
    name: 'Rotación de hombro con banda',
    description: 'Fortalecimiento del manguito rotador.',
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
    description: 'Activación de romboides y trapecio medio para postura.',
    video_url: 'https://www.youtube.com/watch?v=S9HkJH_Zgkw',
    group: 'Columna y postura',
  },
  {
    name: 'Ejercicio de McKenzie en extensión',
    description: 'Extensión lumbar en decúbito prono para dolor de espalda baja.',
    video_url: 'https://www.youtube.com/watch?v=8mZQISXRNMo',
    group: 'Columna y postura',
  },
  {
    name: 'Estabilización lumbopélvica (dead bug)',
    description: 'Activación de core y estabilizadores lumbopélvicos.',
    video_url: 'https://www.youtube.com/watch?v=4XLEnwUr1d8',
    group: 'Columna y postura',
  },
  {
    name: 'Plancha abdominal',
    description: 'Fortalecimiento de core en posición isométrica.',
    video_url: 'https://www.youtube.com/watch?v=pSHjTRCQxIw',
    group: 'Columna y postura',
  },
  {
    name: 'Ejercicios de Kegel',
    description: 'Fortalecimiento del suelo pélvico.',
    video_url: 'https://www.youtube.com/watch?v=kFr9c7c6lXY',
    group: 'Suelo pélvico',
  },
  {
    name: 'Marcha estacionaria',
    description: 'Ejercicio de coordinación y activación general.',
    video_url: 'https://www.youtube.com/watch?v=Zy1hLUBR4-8',
    group: 'Coordinación',
  },
  {
    name: 'Equilibrio monopodal',
    description: 'Entrenamiento del equilibrio sobre un pie.',
    video_url: 'https://www.youtube.com/watch?v=MBELdnSRqOQ',
    group: 'Coordinación',
  },
  {
    name: 'Movilización cervical activa',
    description: 'Movimientos suaves del cuello para mejorar rango de movimiento.',
    video_url: 'https://www.youtube.com/watch?v=vkJJLU6UXxs',
    group: 'Columna y postura',
  },
]

export const GRUPOS_EJERCICIOS = [...new Set(EJERCICIOS_PREDEFINIDOS.map(e => e.group))]
