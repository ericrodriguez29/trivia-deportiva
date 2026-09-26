export interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
  explanation?: string;
  imageEmoji?: string;
}

export interface QuizTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  accentColor: string;
  questions: Question[];
}

export const DEFAULT_QUIZ_TEMPLATES: QuizTemplate[] = [
  {
    id: 'educacion-fisica-master',
    title: 'Educación Física & Deportes',
    category: 'Deportes y Salud',
    description: 'Fútbol, Baloncesto, Voleibol, Atletismo, Calentamiento y Juego Limpio.',
    icon: '⚽',
    accentColor: 'from-emerald-500 to-teal-700',
    questions: [
      {
        question: '¿Cuántos jugadores por equipo entran a la cancha en un partido oficial de Fútbol?',
        options: ['11 jugadores', '9 jugadores', '7 jugadores', '15 jugadores'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'En el fútbol oficial de la FIFA juegan 11 contra 11 (10 jugadores de campo y 1 arquero).',
        imageEmoji: '⚽'
      },
      {
        question: 'En Baloncesto (Básquet), ¿cuántos puntos vale una canasta anotada desde fuera de la línea curva (triple)?',
        options: ['1 punto', '2 puntos', '3 puntos', '4 puntos'],
        correctIndex: 2,
        timeLimit: 20,
        explanation: 'Los tiros desde más allá de la línea de 6.75m valen 3 puntos.',
        imageEmoji: '🏀'
      },
      {
        question: 'En Voleibol, ¿cuántos toques MÁXIMOS puede dar un equipo antes de pasar el balón al campo rival?',
        options: ['2 toques', '3 toques', '4 toques', 'Toques ilimitados'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Un equipo tiene un máximo de 3 toques (recepción, colocación y remate).',
        imageEmoji: '🏐'
      },
      {
        question: '¿Por qué es fundamental realizar un CALENTAMIENTO antes de hacer deporte?',
        options: ['Para prevenir lesiones y activar los músculos', 'Para cansarse antes del juego', 'Para que termine la clase rápido', 'No tiene ninguna utilidad'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'El calentamiento aumenta la temperatura muscular, el flujo sanguíneo y previene contracturas y desgarros.',
        imageEmoji: '🏃'
      },
      {
        question: 'En Atletismo, ¿cómo se llama la carrera por equipos donde los atletas se pasan un tubo llamado "testigo"?',
        options: ['Carrera de vallas', 'Carrera de Relevos (Postas)', 'Maratón individual', 'Salto con garrocha'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'En las carreras de relevos (ej. 4x100m) los corredores entregan el testigo en la zona de cambio.',
        imageEmoji: '🎽'
      },
      {
        question: '¿Qué tarjeta saca el árbitro de Fútbol para EXPULSAR definitivamente a un jugador?',
        options: ['Tarjeta Amarilla', 'Tarjeta Roja', 'Tarjeta Azul', 'Tarjeta Verde'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'La tarjeta roja significa expulsión inmediata del terreno de juego.',
        imageEmoji: '🟥'
      },
      {
        question: '¿Qué significa el "Juego Limpio" (Fair Play) en cualquier competencia deportiva?',
        options: ['Cometer faltas sin que el árbitro te vea', 'Respetar las reglas, a los compañeros, rivales y jueces', 'Ganar a toda costa haciendo trampas', 'Quejarse de todas las jugadas'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'El juego limpio es el valor fundamental del deporte: honestidad, respeto y camaradería.',
        imageEmoji: '🤝'
      },
      {
        question: '¿Cuál es la mejor opción para reponer líquidos e hidratarte adecuadamente durante la actividad física?',
        options: ['Gaseosas o refrescos azucarados', 'Agua potable', 'Bebidas con cafeína excesiva', 'Comida chatarra'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'El agua pura es la forma más natural y efectiva de hidratarse y regular la temperatura corporal.',
        imageEmoji: '💧'
      },
      {
        question: 'En Baloncesto, ¿qué infracción se cobra si un jugador da más de 2 pasos sin picar el balón?',
        options: ['Falta antideportiva', 'Caminata (Pasos)', 'Fuera de lugar', 'Saque de esquina'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Dar más de dos pasos con la pelota en las manos sin botarla se sanciona como "caminar" o "pasos".',
        imageEmoji: '👟'
      },
      {
        question: '¿Cuál de los siguientes es un estilo oficial de Natación en los Juegos Olímpicos?',
        options: ['Estilo Mariposa', 'Estilo Perrito', 'Estilo Flecha marina', 'Estilo Submarino'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'Los 4 estilos oficiales de natación son: Crol (Libre), Espalda, Pecho (Braza) y Mariposa.',
        imageEmoji: '🏊'
      }
    ]
  },
  {
    id: 'espanol-1er-grado',
    title: 'Español, Abecedario & Vocales',
    category: 'Lectoescritura',
    description: 'Letras mayúsculas (Azul), minúsculas (Rojo), sonidos iniciales y sílabas.',
    icon: '🔤',
    accentColor: 'from-blue-600 to-indigo-800',
    questions: [
      {
        question: '¿Con qué vocal empieza el nombre de esta fruta: 🍎 (Manzana empieza con M, pero... y Árbol 🌳)? ¿Con cuál empieza Árbol?',
        options: ['A (Mayúscula Azul)', 'E (Mayúscula)', 'I (Mayúscula)', 'O (Mayúscula)'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'Árbol empieza con la vocal A (en mayúscula azul: A).',
        imageEmoji: '🌳'
      },
      {
        question: '¿Cuál es la letra minúscula en ROJO que corresponde a la "B" mayúscula?',
        options: ['d', 'b', 'p', 'q'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'La letra b minúscula tiene su pancita hacia la derecha.',
        imageEmoji: '🅱️'
      },
      {
        question: '¿Con qué letra empieza la palabra para este animal: 🐶 (Perro)?',
        options: ['M', 'T', 'P (Mayúscula Azul)', 'S'],
        correctIndex: 2,
        timeLimit: 20,
        explanation: 'Perro empieza con la consonante P.',
        imageEmoji: '🐕'
      },
      {
        question: '¿Qué vocal falta para completar la palabra: P _ T O (🦆)?',
        options: ['a (PATO)', 'e (PETO)', 'i (PITO)', 'u (PUTO)'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'P - A - T - O forma la palabra PATO.',
        imageEmoji: '🦆'
      },
      {
        question: '¿Cuántas sílabas tiene la palabra: Pe - lo - ta (⚽)?',
        options: ['1 sílaba', '2 sílabas', '3 sílabas', '4 sílabas'],
        correctIndex: 2,
        timeLimit: 20,
        explanation: 'Tiene 3 golpes de voz: Pe - lo - ta.',
        imageEmoji: '⚽'
      },
      {
        question: '¿Cuál de las siguientes palabras rima con la palabra "GATO"?',
        options: ['Zapato', 'Sol', 'Mesa', 'Camión'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'GATO y ZAPATO terminan con el mismo sonido "-ato".',
        imageEmoji: '🐱'
      }
    ]
  },
  {
    id: 'cultura-general-divertida',
    title: 'Cultura General & Ciencia Asombrosa',
    category: 'Ciencia y Curiosidades',
    description: 'Planetas, animales extraordinarios, inventos y nuestro planeta Tierra.',
    icon: '🌍',
    accentColor: 'from-amber-500 to-orange-700',
    questions: [
      {
        question: '¿Cuál es el planeta más grande de todo nuestro Sistema Solar?',
        options: ['Marte', 'Júpiter', 'Saturno', 'Tierra'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'Júpiter es un gigante gaseoso tan inmenso que cabrían más de 1,300 planetas Tierra en su interior.',
        imageEmoji: '🪐'
      },
      {
        question: '¿Cuál es el animal terrestre más rápido del mundo?',
        options: ['El León', 'El Guepardo (Chita)', 'El Caballo', 'El Avestruz'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'El guepardo puede alcanzar velocidades de más de 110 km/h en carreras cortas.',
        imageEmoji: '🐆'
      },
      {
        question: '¿Cuántos huesos aproximadamente tiene el cuerpo humano de un adulto?',
        options: ['106 huesos', '206 huesos', '306 huesos', '500 huesos'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'El esqueleto humano adulto está formado por 206 huesos.',
        imageEmoji: '🦴'
      },
      {
        question: '¿Qué gas absorben las plantas durante la fotosíntesis para producir oxígeno?',
        options: ['Dióxido de carbono (CO2)', 'Helio', 'Gas metano', 'Nitrógeno líquido'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: 'Las plantas absorben dióxido de carbono y luz solar, liberando oxígeno vital para nosotros.',
        imageEmoji: '🌱'
      },
      {
        question: '¿Cuál es el océano más grande y profundo del planeta Tierra?',
        options: ['Océano Atlántico', 'Océano Pacífico', 'Océano Índico', 'Océano Ártico'],
        correctIndex: 1,
        timeLimit: 20,
        explanation: 'El Océano Pacífico cubre más de un tercio de la superficie de la Tierra.',
        imageEmoji: '🌊'
      }
    ]
  }
];
