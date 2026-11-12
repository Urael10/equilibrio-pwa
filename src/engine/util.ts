export const clamp = (n: number, min = 0, max = 1): number => Math.min(max, Math.max(min, n));

export const redondear = (n: number, dec = 0): number => {
  const f = 10 ** dec;
  return Math.round(n * f) / f;
};

/** Formato numérico en español (coma decimal), sin ceros sobrantes. */
export function fmt(n: number, dec = 0): string {
  return redondear(n, dec).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: dec,
  });
}

/** Reemplaza {clave} por datos[clave]. Si falta la clave deja el marcador visible (útil para detectar errores de contenido). */
export function interpolar(plantilla: string, datos: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in datos ? String(datos[k]) : `{${k}}`,
  );
}

export const NOMBRE_MACRO = { p: 'proteína', c: 'carbohidratos', f: 'grasas' } as const;

// ---------- Fechas (hora local: el «día» del jugador, no el de UTC) ----------

const dos = (n: number): string => String(n).padStart(2, '0');

/** YYYY-MM-DD en hora local. */
export function fechaLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/** Suma (o resta) días a una fecha YYYY-MM-DD sin pasar por UTC. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return fechaLocal(new Date(a, m - 1, d + dias, 12));
}

/** Las n fechas que terminan en `hasta` (inclusive), de la más vieja a la más nueva. */
export function ultimosDias(hasta: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => sumarDias(hasta, i - (n - 1)));
}

const LETRAS_DIA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const NOMBRES_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function diaDeSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d, 12).getDay();
}

/** Inicial del día de la semana («L», «M», «X»…) para el eje del gráfico. */
export const letraDia = (fecha: string): string => LETRAS_DIA[diaDeSemana(fecha)];
export const nombreDia = (fecha: string): string => NOMBRES_DIA[diaDeSemana(fecha)];
export const numeroDia = (fecha: string): number => Number(fecha.split('-')[2]);
