// Tipos compartidos del motor y del contenido. Todo el contenido vive en JSON (src/content)
// y se valida contra estos tipos en tests/content.test.ts.

export type MacroId = 'p' | 'c' | 'f';

export interface Macros {
  p: number; // proteína (g)
  c: number; // carbohidratos (g)
  f: number; // grasas (g)
}

export type Grupo =
  | 'proteina'
  | 'cereal'
  | 'legumbre'
  | 'lacteo'
  | 'fruta'
  | 'verdura'
  | 'grasa'
  | 'gusto';

/** La energía (kcal) NO se guarda: se calcula 4·p + 4·c + 9·f (factores de Atwater). */
export interface Alimento extends Macros {
  id: string;
  nombre: string;
  icono: string;
  porcion: string;
  grupo: Grupo;
  fibra: number; // g
  momentos: string[]; // ids de comidas donde tiene sentido colocarlo
  nota: string; // micro-lección que muestra la mascota
}

export interface Entrenamiento {
  id: string;
  nombre: string;
  icono: string;
  descripcion: string;
  costo: number; // puntos de energía que gasta
  extra: Macros; // cuánto suben las metas del día
  combustiblePre: number; // g de carbohidratos pedidos en la comida previa
  reparacionPost: number; // g de proteína pedidos en la comida posterior
  movimiento: boolean; // cuenta como "día con movimiento"
}

export interface Comida {
  id: string;
  nombre: string;
  hora: string;
  capacidad: number; // porciones máximas
}

export interface HabitosDia {
  suenoHoras: number;
  aguaLitros: number;
  calma: number; // 1 (muy estresada) … 5 (muy tranquila)
}

export interface Nivel {
  id: string;
  orden: number;
  titulo: string;
  subtitulo: string;
  escenario: string;
  objetivo: string;
  leccion: string; // lo que se aprende al cerrar el día
  habitos: HabitosDia;
  metas: Macros; // metas base (antes del entrenamiento)
  entrenamientos: string[]; // ids disponibles
  entrenoPor: { pre: string; post: string }; // ids de la comida previa y la posterior al entreno
  comidas: Comida[];
  mano: string[]; // ids de alimentos en la despensa (1 porción c/u)
}

export interface Plan {
  entreno: string;
  comidas: Record<string, string[]>; // comidaId → ids de alimentos
}

// ---------- Reglas ----------

export interface ReglaTexto {
  titulo: string;
  ok: string; // plantilla con {placeholders}
  falla: string;
  noAplica?: string;
  leccion: string;
}

export interface Reglas {
  banda: { min: number; max: number };
  pesosEnergia: { sueno: number; agua: number; calma: number };
  suenoPlenoHoras: number; // desde acá el puntaje de sueño es 1
  suenoMinimoHoras: number; // en este valor el puntaje es 0
  aguaMetaLitros: number;
  reservaMinima: number;
  bonoRecuperacion: number;
  fibraMinima: number;
  precisionMacros: number; // desviación máxima (0,05 = ±5 %) para contar un macro como «preciso»
  proteinaPorComida: number;
  comidasConProteina: number;
  xpPorEstrellas: [number, number, number, number];
  textos: Record<ReglaId, ReglaTexto>;
}

export type ReglaId =
  | 'macros'
  | 'energia'
  | 'proteina_repartida'
  | 'fibra'
  | 'timing'
  | 'movimiento';

// ---------- Evaluación ----------

export type EstadoMacro = 'bajo' | 'cerrado' | 'alto';

export interface DetalleMacro {
  meta: number;
  total: number;
  ratio: number;
  estado: EstadoMacro;
  puntaje: number; // 0..1
}

export interface ReglaResultado {
  id: ReglaId;
  ok: boolean;
  aplica: boolean;
  datos: Record<string, string | number>; // valores para las plantillas
}

export interface Energia {
  sueno: number; // 0..1
  agua: number;
  calma: number;
  base: number; // 0..100
  costo: number;
  reserva: number; // base - costo
  sostenible: boolean;
  final: number; // 0..100 (energía de la mascota al cierre)
}

export type EstadoMascota =
  | 'radiante'
  | 'contenta'
  | 'tranquila'
  | 'bajon'
  | 'hambrienta'
  | 'cansada';

export interface StatsMascota {
  energia: number;
  nutricion: number;
  animo: number;
  estado: EstadoMascota;
}

export interface Evaluacion {
  metas: Macros & { kcal: number };
  totales: Macros & { kcal: number; fibra: number };
  macros: Record<MacroId, DetalleMacro>;
  macrosCerrados: boolean;
  completitud: number; // kcal / meta
  porcionesColocadas: number;
  energia: Energia;
  reglas: Record<ReglaId, ReglaResultado>;
  estrellas: 0 | 1 | 2 | 3;
  mascota: StatsMascota;
}

export interface Catalogo {
  alimentos: Record<string, Alimento>;
  entrenamientos: Record<string, Entrenamiento>;
  reglas: Reglas;
}

// ---------- Cierre / explicación ----------

export interface ItemCierre {
  regla: ReglaId;
  ok: boolean;
  aplica: boolean;
  titulo: string;
  detalle: string;
  leccion: string;
}

export interface Cierre {
  estrellas: 0 | 1 | 2 | 3;
  titulo: string;
  resumen: string;
  items: ItemCierre[];
  leccionDelDia: string;
  siguiente: string;
  xpGanada: number;
}

// ---------- Mascota ----------

export interface EtapaMascota {
  id: string;
  nombre: string;
  nivelMin: number; // la etapa empieza en este nivel
  xpMin: number; // XP acumulada de ese nivel (se valida contra xpParaNivel en los tests)
  descripcion: string;
}

export type PersonajeId = 'cuernito' | 'mochi' | 'nubi' | 'pomelo';

/** Un compañero se desbloquea la primera vez que se cumple una regla al cerrar el día. */
export interface Desbloqueo {
  regla: ReglaId;
  texto: string; // cómo se consigue, en lenguaje de jugador
}

export interface Personaje {
  id: PersonajeId;
  nombre: string;
  genero: 'm' | 'f'; // solo para concordar las etiquetas de estado («contento» / «contenta»)
  rol: string;
  dominio: string; // el hábito que representa
  descripcion: string;
  leccion: string; // micro-lección que enseña
  desbloqueo: Desbloqueo | null; // null = viene desde el inicio
}

export interface ContenidoMascota {
  nombreSugerido: string;
  principal: PersonajeId;
  personajes: Personaje[];
  bienvenida: string[];
  etapas: EtapaMascota[];
  frases: Record<EstadoMascota, string[]>;
  estadosTexto: Record<'m' | 'f', Record<EstadoMascota, string>>;
}

// ---------- Progreso por niveles (EGM) ----------

export interface ProgresoNivel {
  nivel: number;
  xpDesde: number; // XP acumulada con la que empezó este nivel
  xpHasta: number | null; // XP acumulada del nivel siguiente (null en el nivel máximo)
  pct: number; // 0..1 dentro del nivel
}

// ---------- Desafíos diarios (EGM) ----------

export type TipoDesafio = 'macro' | 'entrenamiento' | 'habito';

/** Qué se mide del plan del día. Siempre sale de la Evaluacion: no hay un segundo cálculo. */
export type MetricaDesafio =
  | 'proteina_g'
  | 'carbs_g'
  | 'grasas_g'
  | 'fibra_g'
  | 'macros_cerrados' // 0..3 macros dentro de la banda
  | 'macros_precisos' // 0..3 macros dentro de ±precisionMacros
  | 'kcal_pct' // % de las kcal de la meta
  | 'energia_activa' // energía final, pero solo si hubo movimiento
  | 'comidas_con_proteina'
  | 'movimiento' // 1 si el entreno elegido cuenta como movimiento
  | 'timing' // 1 si el entreno exige timing y se cumplió
  | 'estrellas';

/** Plantilla de contenido (src/content/desafios.json). */
export interface PlantillaDesafio {
  id: string;
  tipo: TipoDesafio;
  titulo: string;
  descripcion: string;
  metrica: MetricaDesafio;
  objetivo: number;
  xp: number;
}

/** Lo único que se persiste de los desafíos de un día: cuáles tocaron y cuáles ya pagaron su XP. */
export interface DesafioDia {
  fecha: string; // YYYY-MM-DD, hora local
  ids: string[];
  acreditados: string[];
}

/** Vista calculada (no se guarda): el progreso sale de la evaluación del plan actual. */
export interface DesafioDiario {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoDesafio;
  metrica: MetricaDesafio;
  objetivoCantidad: number;
  progresoActual: number;
  xpRecompensa: number;
  completado: boolean;
  acreditado: boolean;
}

// ---------- Histórico diario (EGM) ----------

export interface RegistroDiario {
  fecha: string; // YYYY-MM-DD, hora local
  nivelId: string;
  estrellas: 0 | 1 | 2 | 3;
  totales: Macros & { kcal: number; fibra: number };
  metas: Macros & { kcal: number };
  cumplimiento: { p: number; c: number; f: number; kcal: number }; // % de la meta (enteros)
  energiaFinal: number;
  xpGanada: number; // estrellas nuevas + desafíos acreditados ese día
  desafiosCompletados: string[];
}

/** Un día del gráfico: registro null = ese día no se jugó. */
export interface PuntoSerie {
  fecha: string;
  registro: RegistroDiario | null;
}
