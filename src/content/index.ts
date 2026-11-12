import type { Alimento, Catalogo, ContenidoMascota, Entrenamiento, Nivel, PlantillaDesafio, Reglas } from '../types';
import alimentosJson from './alimentos.json';
import desafiosJson from './desafios.json';
import entrenamientosJson from './entrenamientos.json';
import reglasJson from './reglas.json';
import mascotaJson from './mascota.json';
import n01 from './niveles/n01.json';

const indexar = <T extends { id: string }>(lista: T[]): Record<string, T> =>
  Object.fromEntries(lista.map((x) => [x.id, x]));

export const catalogo: Catalogo = {
  alimentos: indexar(alimentosJson as unknown as Alimento[]),
  entrenamientos: indexar(entrenamientosJson as unknown as Entrenamiento[]),
  reglas: reglasJson as unknown as Reglas,
};

/** Niveles disponibles, en orden. Para sumar uno nuevo: crear niveles/nXX.json y agregarlo acá. */
export const niveles: Nivel[] = [n01 as unknown as Nivel].sort((a, b) => a.orden - b.orden);

/** Plantillas de desafíos diarios: cada fecha elige una por tipo (ver engine/desafios.ts). */
export const plantillasDesafios = desafiosJson as unknown as PlantillaDesafio[];

export const contenidoMascota = mascotaJson as unknown as ContenidoMascota;

export const nivelPorId = (id: string): Nivel | undefined => niveles.find((n) => n.id === id);

/** Niveles que se mostrarán como "próximamente" en el home (sin contenido todavía). */
export const proximamente = [
  { orden: 2, titulo: 'Semana de entreno', subtitulo: 'Equilibrio · Ritmo semanal' },
  { orden: 3, titulo: 'Día de estrés', subtitulo: 'Equilibrio · Calma y sueño' },
  { orden: 4, titulo: 'Plan vegetal', subtitulo: 'Equilibrio · Proteína sin carne' },
];
