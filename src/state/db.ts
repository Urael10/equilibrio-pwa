import Dexie, { type Table } from 'dexie';
import type { DesafioDia, RegistroDiario } from '../types';

// IndexedDB vía Dexie. Si el navegador lo bloquea (modo privado, vista previa embebida),
// el juego sigue funcionando en memoria: nunca debe romper por no poder guardar.
//
// Esquema:
//   v1  kv         progreso y borradores de plan (clave → valor)
//   v2  historial  un registro por día (clave: fecha YYYY-MM-DD)
//       desafios   los desafíos de cada día y cuáles ya pagaron su XP (clave: fecha)
// La v2 solo agrega almacenes: los datos de la v1 no se tocan.

interface Fila {
  k: string;
  v: unknown;
}

class EquilibrioDB extends Dexie {
  kv!: Table<Fila, string>;
  historial!: Table<RegistroDiario, string>;
  desafios!: Table<DesafioDia, string>;
  constructor() {
    super('equilibrio');
    this.version(1).stores({ kv: 'k' });
    this.version(2).stores({ kv: 'k', historial: 'fecha', desafios: 'fecha' });
  }
}

let db: EquilibrioDB | null = null;
try {
  db = new EquilibrioDB();
} catch {
  db = null;
}

export async function leer<T>(clave: string): Promise<T | undefined> {
  try {
    const fila = await db?.kv.get(clave);
    return fila?.v as T | undefined;
  } catch {
    return undefined;
  }
}

export async function escribir(clave: string, valor: unknown): Promise<void> {
  try {
    await db?.kv.put({ k: clave, v: valor });
  } catch {
    /* sin almacenamiento: se sigue en memoria */
  }
}

// ---------- Histórico diario ----------

export async function guardarRegistro(registro: RegistroDiario): Promise<void> {
  try {
    await db?.historial.put(registro);
  } catch {
    /* sin almacenamiento */
  }
}

/** Registros entre dos fechas (inclusive), de la más vieja a la más nueva. */
export async function leerRegistros(desde: string, hasta: string): Promise<RegistroDiario[]> {
  try {
    return (await db?.historial.where('fecha').between(desde, hasta, true, true).toArray()) ?? [];
  } catch {
    return [];
  }
}

// ---------- Desafíos del día ----------

export async function guardarDesafiosDia(dia: DesafioDia): Promise<void> {
  try {
    await db?.desafios.put(dia);
  } catch {
    /* sin almacenamiento */
  }
}

export async function leerDesafiosDia(fecha: string): Promise<DesafioDia | undefined> {
  try {
    return await db?.desafios.get(fecha);
  } catch {
    return undefined;
  }
}

/** «Empezar de cero»: vacía el histórico y los desafíos (el progreso lo reinicia el store). */
export async function borrarHistorial(): Promise<void> {
  try {
    await db?.historial.clear();
    await db?.desafios.clear();
  } catch {
    /* sin almacenamiento */
  }
}
