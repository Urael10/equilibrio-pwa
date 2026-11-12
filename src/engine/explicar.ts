import type { Catalogo, Cierre, Evaluacion, ItemCierre, MacroId, Nivel, Plan, ReglaId } from '../types';
import { idsUsados } from './plan';
import { interpolar, NOMBRE_MACRO } from './util';

const ORDEN: ReglaId[] = ['macros', 'energia', 'proteina_repartida', 'fibra', 'timing', 'movimiento'];

const TITULO_ESTRELLAS: Record<number, { titulo: string; resumen: string }> = {
  0: {
    titulo: 'Todavía no cierra el día',
    resumen: 'Los macros aún no entran en la banda de 85–115%. Mirá el detalle y probá otro armado: así se aprende.',
  },
  1: {
    titulo: 'Día cerrado',
    resumen: 'Cerraste los macros. Falta cuidar la energía para que el día sea sostenible.',
  },
  2: {
    titulo: 'Día sostenible',
    resumen: 'Macros cerrados y energía a salvo. Te faltan algunas reglas de bienestar para el equilibrio completo.',
  },
  3: {
    titulo: 'Día en equilibrio',
    resumen: '¡Todo en su lugar! Macros, energía y hábitos trabajando juntos.',
  },
};

/** Explicación de cierre: traduce el resultado del motor a lenguaje claro, regla por regla. */
export function explicarCierre(nivel: Nivel, ev: Evaluacion, cat: Catalogo): Cierre {
  const textos = cat.reglas.textos;

  const items: ItemCierre[] = ORDEN.map((id) => {
    const res = ev.reglas[id];
    const t = textos[id];
    const plantilla = !res.aplica && t.noAplica ? t.noAplica : res.ok ? t.ok : t.falla;
    return {
      regla: id,
      ok: res.ok,
      aplica: res.aplica,
      titulo: t.titulo,
      detalle: interpolar(plantilla, res.datos),
      leccion: t.leccion,
    };
  });

  const base = TITULO_ESTRELLAS[ev.estrellas];
  const primeraFalla = items.find((i) => i.aplica && !i.ok);

  let siguiente: string;
  if (ev.estrellas === 3) {
    siguiente = 'Repetí cuando quieras con otro entrenamiento para ver cómo cambian las metas, o seguí con el próximo nivel.';
  } else if (primeraFalla) {
    siguiente = `Foco para el próximo intento → ${primeraFalla.titulo}: ${primeraFalla.detalle}`;
  } else {
    siguiente = 'Probá otro armado.';
  }

  return {
    estrellas: ev.estrellas,
    titulo: base.titulo,
    resumen: base.resumen,
    items,
    leccionDelDia: ev.estrellas >= 1 ? nivel.leccion : textos.macros.leccion,
    siguiente,
    xpGanada: cat.reglas.xpPorEstrellas[ev.estrellas],
  };
}

// ---------- Pistas ----------

const GRUPOS_POR_MACRO: Record<MacroId, string> = {
  p: 'huevos, carnes, pescados, lácteos o legumbres',
  c: 'cereales, legumbres, frutas o tubérculos como la batata',
  f: 'aceites, palta, frutos secos o pescados grasos',
};

export interface Pista {
  nivel: 1 | 2;
  texto: string;
}

/**
 * Pista en dos niveles: el 1 explica qué está pasando; el 2 nombra un alimento concreto.
 * No resuelve el puzle: orienta hacia el macro más desviado o la primera regla pendiente.
 */
export function pistaPara(nivel: Nivel, plan: Plan, ev: Evaluacion, cat: Catalogo, profundidad: 1 | 2): Pista {
  if (ev.porcionesColocadas === 0) {
    return {
      nivel: profundidad,
      texto:
        'Tocá un alimento de la despensa para colocarlo en la comida seleccionada. Antes, elegí el entrenamiento: cambia tus metas del día.',
    };
  }

  if (!ev.macrosCerrados) {
    const k = (['p', 'c', 'f'] as MacroId[])
      .filter((m) => ev.macros[m].estado !== 'cerrado')
      .sort((a, b) => Math.abs(ev.macros[b].ratio - 1) - Math.abs(ev.macros[a].ratio - 1))[0];
    const d = ev.macros[k];
    const diff = Math.round(Math.abs(d.total - d.meta));

    if (d.estado === 'bajo') {
      if (profundidad === 1) {
        return { nivel: 1, texto: `Te faltan unos ${diff} g de ${NOMBRE_MACRO[k]}. Buenas fuentes: ${GRUPOS_POR_MACRO[k]}.` };
      }
      const usados = new Set(idsUsados(plan));
      const candidato = nivel.mano
        .filter((id) => !usados.has(id))
        .map((id) => cat.alimentos[id])
        .filter(Boolean)
        .sort((a, b) => b[k] - a[k])[0];
      return {
        nivel: 2,
        texto: candidato
          ? `Para sumar ${NOMBRE_MACRO[k]}, mirá ${candidato.nombre.toLowerCase()} (${candidato.porcion}): aporta ${candidato[k]} g.`
          : `No quedan alimentos en la despensa para sumar ${NOMBRE_MACRO[k]}: probá cambiar de lugar o reemplazar alguno.`,
      };
    }

    if (profundidad === 1) {
      return { nivel: 1, texto: `Te pasaste unos ${diff} g de ${NOMBRE_MACRO[k]}. Probá quitar o reemplazar algo que aporte mucho de eso.` };
    }
    const colocado = idsUsados(plan)
      .map((id) => cat.alimentos[id])
      .filter(Boolean)
      .sort((a, b) => b[k] - a[k])[0];
    return {
      nivel: 2,
      texto: colocado
        ? `${colocado.nombre} es lo que más ${NOMBRE_MACRO[k]} aporta (${colocado[k]} g). ¿Lo reemplazás por algo más liviano en eso?`
        : 'Probá vaciar el plato y armarlo de nuevo.',
    };
  }

  if (!ev.energia.sostenible) {
    return {
      nivel: profundidad,
      texto: `Con ${ev.energia.base} de energía base, este entrenamiento deja una reserva de ${ev.energia.reserva}. Probá uno más suave.`,
    };
  }

  const pendiente = ORDEN.find((id) => id !== 'macros' && id !== 'energia' && ev.reglas[id].aplica && !ev.reglas[id].ok);
  if (pendiente) {
    const t = cat.reglas.textos[pendiente];
    return { nivel: profundidad, texto: interpolar(t.falla, ev.reglas[pendiente].datos) };
  }

  return { nivel: profundidad, texto: '¡Está todo en orden! Cerrá el día para ver tu resultado.' };
}
