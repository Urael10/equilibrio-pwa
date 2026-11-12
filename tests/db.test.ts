import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import type { DesafioDia, RegistroDiario } from '../src/types';

const registro = (fecha: string): RegistroDiario => ({
  fecha,
  nivelId: 'n01',
  estrellas: 2,
  totales: { p: 100, c: 230, f: 60, kcal: 1360, fibra: 26 },
  metas: { p: 100, c: 230, f: 60, kcal: 1360 },
  cumplimiento: { p: 100, c: 100, f: 100, kcal: 100 },
  energiaFinal: 50,
  xpGanada: 40,
  desafiosCompletados: ['a_moverse'],
});

describe('Dexie v1 → v2', () => {
  it('conserva el progreso guardado con la v0.3.0 y agrega historial y desafíos', async () => {
    // Base de la v0.3.0: solo el almacén kv.
    const vieja = new Dexie('equilibrio');
    vieja.version(1).stores({ kv: 'k' });
    await vieja.open();
    await vieja.table('kv').put({ k: 'progreso', v: { nombre: 'Cuernito', mejor: { n01: 3 }, intentos: { n01: 2 }, logros: ['macros'] } });
    await vieja.table('kv').put({ k: 'plan:n01', v: { entreno: 'yoga', comidas: {} } });
    vieja.close();

    // El módulo abre la v2 (migración) al primer uso.
    const db = await import('../src/state/db');
    expect(await db.leer('progreso')).toEqual({ nombre: 'Cuernito', mejor: { n01: 3 }, intentos: { n01: 2 }, logros: ['macros'] });
    expect(await db.leer('plan:n01')).toEqual({ entreno: 'yoga', comidas: {} });

    await db.guardarRegistro(registro('2026-11-09'));
    await db.guardarRegistro(registro('2026-11-10'));
    await db.guardarRegistro(registro('2026-10-01'));
    const lista = await db.leerRegistros('2026-11-01', '2026-11-10');
    expect(lista.map((r) => r.fecha)).toEqual(['2026-11-09', '2026-11-10']);

    // Guardar otra vez la misma fecha reemplaza (una fila por día).
    await db.guardarRegistro({ ...registro('2026-11-10'), estrellas: 3 });
    expect((await db.leerRegistros('2026-11-10', '2026-11-10'))[0].estrellas).toBe(3);
    expect(await db.leerRegistros('2026-11-01', '2026-11-10')).toHaveLength(2);

    const dia: DesafioDia = { fecha: '2026-11-10', ids: ['a', 'b', 'c'], acreditados: ['a'] };
    expect(await db.leerDesafiosDia('2026-11-10')).toBeUndefined();
    await db.guardarDesafiosDia(dia);
    expect(await db.leerDesafiosDia('2026-11-10')).toEqual(dia);

    await db.borrarHistorial();
    expect(await db.leerRegistros('2000-01-01', '2100-01-01')).toEqual([]);
    expect(await db.leerDesafiosDia('2026-11-10')).toBeUndefined();
    // «Empezar de cero» no toca kv: el progreso lo reinicia el store.
    expect(await db.leer('progreso')).toBeDefined();
  });
});
