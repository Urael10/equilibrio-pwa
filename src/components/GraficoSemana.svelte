<script lang="ts">
  import { banda, DIM_SEMANA as D, MARCAS_Y, trazo, xDe, yDe, type ClaveSerie } from '../engine/grafico';
  import { letraDia } from '../engine/util';
  import { catalogo } from '../content';
  import type { PuntoSerie } from '../types';

  interface Props {
    serie: PuntoSerie[];
    seleccionada?: string | null;
    onelegir?: (fecha: string) => void;
  }
  let { serie, seleccionada = null, onelegir }: Props = $props();

  const SERIES: { clave: ClaveSerie; nombre: string; color: string; grosor: number }[] = [
    { clave: 'p', nombre: 'Proteína', color: 'var(--color-coral)', grosor: 2 },
    { clave: 'c', nombre: 'Carbohidratos', color: 'var(--color-amber)', grosor: 2 },
    { clave: 'f', nombre: 'Grasas', color: 'var(--color-peri)', grosor: 2 },
    { clave: 'kcal', nombre: 'Calorías', color: 'var(--color-mint)', grosor: 3 },
  ];

  const trazos = $derived(SERIES.map((s) => ({ ...s, ...trazo(serie, s.clave) })));
  const franja = banda(catalogo.reglas.banda.min, catalogo.reglas.banda.max);
  const resumen = $derived(
    `Cumplimiento de macros y calorías en los últimos ${serie.length} días: ` +
      (serie.filter((s) => s.registro).length
        ? `${serie.filter((s) => s.registro).length} días jugados.`
        : 'todavía sin días jugados.'),
  );
</script>

<figure class="m-0">
  <svg viewBox="0 0 {D.ancho} {D.alto}" class="h-auto w-full" role="img" aria-label={resumen}>
    <!-- Banda «cerrado» (85–115 %) -->
    <rect x={D.izq} y={franja.y} width={D.ancho - D.izq - D.der} height={franja.alto} fill="var(--color-mint)" opacity="0.1" />

    <!-- Rejilla y eje Y -->
    {#each MARCAS_Y as m (m)}
      <line x1={D.izq} x2={D.ancho - D.der} y1={yDe(m, D)} y2={yDe(m, D)} stroke="var(--color-line)" stroke-width={m === 100 ? 1.2 : 0.7} stroke-dasharray={m === 100 ? '0' : '3 3'} />
      <text x={D.izq - 6} y={yDe(m, D) + 3.5} text-anchor="end" font-size="10" fill="var(--color-mute)" class="num">{m}%</text>
    {/each}

    <!-- Días sin jugar: una marca tenue -->
    {#each serie as s, i (s.fecha)}
      {#if !s.registro}
        <line x1={xDe(i, serie.length, D)} x2={xDe(i, serie.length, D)} y1={D.arr} y2={D.alto - D.abajo} stroke="var(--color-line)" stroke-width="0.6" opacity="0.5" />
      {/if}
    {/each}

    <!-- Día seleccionado -->
    {#each serie as s, i (s.fecha)}
      {#if s.fecha === seleccionada && s.registro}
        <line x1={xDe(i, serie.length, D)} x2={xDe(i, serie.length, D)} y1={D.arr} y2={D.alto - D.abajo} stroke="var(--color-text)" stroke-width="1" opacity="0.35" />
      {/if}
    {/each}

    <!-- Líneas y puntos -->
    {#each trazos as t (t.clave)}
      {#each t.caminos as camino}
        <path d={camino} fill="none" stroke={t.color} stroke-width={t.grosor} stroke-linecap="round" stroke-linejoin="round" />
      {/each}
      {#each t.puntos as p (p.fecha)}
        <circle cx={p.x} cy={p.y} r={t.grosor + 0.8} fill="var(--color-panel)" stroke={t.color} stroke-width="1.6" />
      {/each}
    {/each}
  </svg>

  <!-- Eje X: un botón por día; elegir uno muestra su detalle -->
  <div class="-mt-1 grid" style="grid-template-columns: repeat({serie.length}, minmax(0, 1fr)); padding-left:{(D.izq / D.ancho) * 100}%; padding-right:{(D.der / D.ancho) * 100}%">
    {#each serie as s (s.fecha)}
      {@const jugado = !!s.registro}
      <button
        class="mx-auto grid h-9 w-9 place-items-center rounded-full text-[12px] transition-colors {s.fecha === seleccionada ? 'bg-text text-ink' : jugado ? 'text-text' : 'text-mute/60'}"
        disabled={!jugado}
        aria-pressed={s.fecha === seleccionada}
        aria-label={jugado ? `Ver el detalle del ${s.fecha}` : `${s.fecha}: sin jugar`}
        onclick={() => onelegir?.(s.fecha)}
      >
        <span class="font-semibold">{letraDia(s.fecha)}</span>
      </button>
    {/each}
  </div>

  <figcaption class="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[11.5px] text-mute">
    {#each SERIES as s (s.clave)}
      <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-2 rounded-full" style="background:{s.color}"></span>{s.nombre}</span>
    {/each}
    <span class="flex items-center gap-1.5"><span class="inline-block h-2 w-3 rounded-sm bg-mint/25"></span>banda 85–115 %</span>
  </figcaption>
</figure>
