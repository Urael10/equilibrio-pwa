import type {
  Catalogo,
  DetalleMacro,
  Energia,
  EstadoMacro,
  Evaluacion,
  HabitosDia,
  MacroId,
  Macros,
  Nivel,
  Plan,
  ReglaId,
  ReglaResultado,
  Reglas,
} from '../types';
import { calcularMascota } from './mascota';
import { clamp, fmt, NOMBRE_MACRO, redondear } from './util';

const MACROS: MacroId[] = ['p', 'c', 'f'];

/** Atwater: 1 g de proteína o carbohidrato = 4 kcal; 1 g de grasa = 9 kcal. */
export const kcalDe = (m: Macros): number => 4 * m.p + 4 * m.c + 9 * m.f;

export function puntajeSueno(horas: number, r: Reglas): number {
  return clamp((horas - r.suenoMinimoHoras) / (r.suenoPlenoHoras - r.suenoMinimoHoras));
}
export const puntajeAgua = (litros: number, r: Reglas): number => clamp(litros / r.aguaMetaLitros);
export const puntajeCalma = (calma: number): number => clamp((calma - 1) / 4);

export function energiaBase(h: HabitosDia, r: Reglas) {
  const sueno = puntajeSueno(h.suenoHoras, r);
  const agua = puntajeAgua(h.aguaLitros, r);
  const calma = puntajeCalma(h.calma);
  const base = Math.round(
    100 * (r.pesosEnergia.sueno * sueno + r.pesosEnergia.agua * agua + r.pesosEnergia.calma * calma),
  );
  return { sueno, agua, calma, base };
}

export function sumaAlimentos(ids: string[], cat: Catalogo) {
  const t = { p: 0, c: 0, f: 0, fibra: 0 };
  for (const id of ids) {
    const a = cat.alimentos[id];
    if (!a) continue;
    t.p += a.p;
    t.c += a.c;
    t.f += a.f;
    t.fibra += a.fibra;
  }
  return t;
}

/** Metas del día = metas base del nivel + extra del entrenamiento elegido. */
export function metasDelDia(nivel: Nivel, entrenoId: string, cat: Catalogo): Macros & { kcal: number } {
  const e = cat.entrenamientos[entrenoId];
  const m: Macros = {
    p: nivel.metas.p + (e?.extra.p ?? 0),
    c: nivel.metas.c + (e?.extra.c ?? 0),
    f: nivel.metas.f + (e?.extra.f ?? 0),
  };
  return { ...m, kcal: kcalDe(m) };
}

export const estadoDeRatio = (ratio: number, r: Reglas): EstadoMacro =>
  ratio < r.banda.min ? 'bajo' : ratio > r.banda.max ? 'alto' : 'cerrado';

/** 1 en la meta exacta, 0 a ±50% o más de distancia. */
export const puntajeDeRatio = (ratio: number): number => clamp(1 - Math.abs(ratio - 1) / 0.5);

export function evaluar(nivel: Nivel, plan: Plan, cat: Catalogo): Evaluacion {
  const r = cat.reglas;
  const entreno = cat.entrenamientos[plan.entreno];
  const todos = Object.values(plan.comidas).flat();
  const suma = sumaAlimentos(todos, cat);
  const totales = { p: suma.p, c: suma.c, f: suma.f, fibra: suma.fibra, kcal: kcalDe(suma) };
  const metas = metasDelDia(nivel, plan.entreno, cat);

  // --- Macros ---
  const macros = {} as Record<MacroId, DetalleMacro>;
  for (const k of MACROS) {
    const meta = metas[k];
    const ratio = meta > 0 ? totales[k] / meta : 1;
    macros[k] = { meta, total: totales[k], ratio, estado: estadoDeRatio(ratio, r), puntaje: puntajeDeRatio(ratio) };
  }
  const macrosCerrados = MACROS.every((k) => macros[k].estado === 'cerrado');

  // --- Energía ---
  const eb = energiaBase(nivel.habitos, r);
  const costo = entreno?.costo ?? 0;
  const reserva = eb.base - costo;
  const sostenible = reserva >= r.reservaMinima;

  // --- Reglas ---
  const reglas = {} as Record<ReglaId, ReglaResultado>;

  const pct = (k: MacroId) => Math.round(macros[k].ratio * 100);
  const fuera = MACROS.filter((k) => macros[k].estado !== 'cerrado').map((k) => {
    const d = macros[k];
    const diff = Math.round(Math.abs(d.total - d.meta));
    return d.estado === 'bajo'
      ? `${NOMBRE_MACRO[k]} ${Math.round(d.total)} g (${pct(k)}%, faltan ${diff} g)`
      : `${NOMBRE_MACRO[k]} ${Math.round(d.total)} g (${pct(k)}%, sobran ${diff} g)`;
  });
  reglas.macros = {
    id: 'macros',
    ok: macrosCerrados,
    aplica: true,
    datos: {
      p: Math.round(totales.p), c: Math.round(totales.c), f: Math.round(totales.f),
      pPct: pct('p'), cPct: pct('c'), fPct: pct('f'),
      detalle: fuera.length ? fuera.join('; ') + '.' : '',
    },
  };

  reglas.energia = {
    id: 'energia',
    ok: sostenible,
    aplica: true,
    datos: { base: eb.base, costo, reserva, minima: r.reservaMinima },
  };

  const porComida = nivel.comidas.map((c) => sumaAlimentos(plan.comidas[c.id] ?? [], cat));
  const conProteina = porComida.filter((t) => t.p >= r.proteinaPorComida).length;
  reglas.proteina_repartida = {
    id: 'proteina_repartida',
    ok: conProteina >= r.comidasConProteina,
    aplica: true,
    datos: { n: conProteina, umbral: r.proteinaPorComida, meta: r.comidasConProteina },
  };

  reglas.fibra = {
    id: 'fibra',
    ok: totales.fibra >= r.fibraMinima,
    aplica: true,
    datos: {
      total: fmt(totales.fibra), minima: r.fibraMinima,
      faltan: Math.max(0, r.fibraMinima - totales.fibra),
    },
  };

  const exigeTiming = !!entreno && entreno.movimiento && (entreno.combustiblePre > 0 || entreno.reparacionPost > 0);
  const pre = sumaAlimentos(plan.comidas[nivel.entrenoPor.pre] ?? [], cat).c;
  const post = sumaAlimentos(plan.comidas[nivel.entrenoPor.post] ?? [], cat).p;
  reglas.timing = {
    id: 'timing',
    ok: !exigeTiming || (pre >= (entreno?.combustiblePre ?? 0) && post >= (entreno?.reparacionPost ?? 0)),
    aplica: exigeTiming,
    datos: {
      pre, post,
      preMeta: entreno?.combustiblePre ?? 0,
      postMeta: entreno?.reparacionPost ?? 0,
      entreno: (entreno?.nombre ?? '').toLowerCase(),
    },
  };

  reglas.movimiento = {
    id: 'movimiento',
    ok: !!entreno?.movimiento,
    aplica: true,
    datos: { entreno: (entreno?.nombre ?? '').toLowerCase() },
  };

  const bienestarOk = (['proteina_repartida', 'fibra', 'timing', 'movimiento'] as ReglaId[]).every(
    (id) => reglas[id].ok,
  );

  // --- Estrellas ---
  let estrellas: 0 | 1 | 2 | 3 = 0;
  if (macrosCerrados) {
    estrellas = 1;
    if (sostenible) {
      estrellas = 2;
      if (bienestarOk) estrellas = 3;
    }
  }

  const energia: Energia = {
    ...eb,
    costo,
    reserva,
    sostenible,
    final: Math.round(
      clamp(reserva + (reglas.timing.ok && reglas.timing.aplica ? r.bonoRecuperacion : 0), 0, 100),
    ),
  };

  const completitud = metas.kcal > 0 ? totales.kcal / metas.kcal : 0;
  const mascota = calcularMascota({ macros, energia, reglas, completitud });

  return {
    metas,
    totales: { ...totales, p: redondear(totales.p, 1), c: redondear(totales.c, 1), f: redondear(totales.f, 1) },
    macros,
    macrosCerrados,
    completitud,
    porcionesColocadas: todos.length,
    energia,
    reglas,
    estrellas,
    mascota,
  };
}
