<script lang="ts">
  import { untrack } from 'svelte';
  import { etiquetaProgreso, fraccionProgreso } from '../engine/desafios';
  import { app } from '../state/store.svelte';
  import type { TipoDesafio } from '../types';

  interface Props {
    compacta?: boolean; // sin descripciones: para el inicio
  }
  let { compacta = false }: Props = $props();

  const ICONO: Record<TipoDesafio, string> = { macro: '🍽️', entrenamiento: '🏃', habito: '🌿' };

  const lista = $derived(app.desafios);
  const total = $derived(lista.reduce((a, d) => a + d.xpRecompensa, 0));
  const cobrados = $derived(lista.filter((d) => d.acreditado).reduce((a, d) => a + d.xpRecompensa, 0));
  const porCobrar = $derived(lista.filter((d) => d.completado && !d.acreditado).reduce((a, d) => a + d.xpRecompensa, 0));

  // Celebra en el momento en que un desafío pasa a cumplido (no al abrir la pantalla con el plan ya armado).
  let celebrando = $state<string[]>([]);
  let vistos = new Set<string>();
  let inicializado = false;
  $effect(() => {
    const ahora = new Set(app.desafios.filter((d) => d.completado).map((d) => d.id));
    if (inicializado) {
      const nuevos = app.desafios.filter((d) => d.completado && !d.acreditado && !vistos.has(d.id)).map((d) => d.id);
      if (nuevos.length) {
        celebrando = [...untrack(() => celebrando), ...nuevos];
        setTimeout(() => (celebrando = celebrando.filter((id) => !nuevos.includes(id))), 1800);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      }
    }
    vistos = ahora;
    inicializado = true;
  });
</script>

{#if lista.length}
  <section class="panel p-4" aria-labelledby="t-desafios">
    <div class="flex items-baseline justify-between gap-3">
      <h2 id="t-desafios" class="display text-[16px] font-semibold">Desafíos de hoy</h2>
      <span class="num text-[12px] text-mute">
        {#if cobrados > 0}<span class="text-mint">+{cobrados}</span> cobrados · {/if}<span class="text-amber">{total}</span> XP
      </span>
    </div>
    {#if !compacta}
      <p class="mt-0.5 text-[12px] leading-snug text-mute">
        {#if porCobrar > 0}
          <span class="text-mint">+{porCobrar} XP listos:</span> se cobran al cerrar el día.
        {:else}
          El XP se cobra al cerrar el día, una sola vez por desafío.
        {/if}
      </p>
    {/if}

    <ul class="mt-3 flex flex-col gap-2.5">
      {#each lista as d (d.id)}
        {@const f = fraccionProgreso(d.progresoActual, d.objetivoCantidad)}
        <li
          class="relative rounded-2xl border p-3 {d.completado ? 'border-mint/50 bg-mint/[0.07]' : 'border-line bg-raised/60'} {celebrando.includes(d.id) ? 'anim-pop' : ''}"
        >
          {#if celebrando.includes(d.id)}
            <span class="anim-xp num pointer-events-none absolute right-3 top-1 text-[13px] font-bold text-amber" aria-hidden="true">+{d.xpRecompensa} XP</span>
          {/if}
          <div class="flex items-start gap-2.5">
            <span class="text-[18px] leading-none" aria-hidden="true">{ICONO[d.tipo]}</span>
            <div class="min-w-0 flex-1">
              <p class="text-[13.5px] font-semibold leading-tight">{d.titulo}</p>
              {#if !compacta}<p class="mt-0.5 text-[12px] leading-snug text-mute">{d.descripcion}</p>{/if}
            </div>
            <span class="num shrink-0 text-[12px] font-semibold {d.acreditado ? 'text-mute' : d.completado ? 'text-mint' : 'text-amber'}">
              {#if d.acreditado}✓ cobrado{:else if d.completado}✓ +{d.xpRecompensa}{:else}+{d.xpRecompensa} XP{/if}
            </span>
          </div>
          <div class="mt-2 flex items-center gap-2.5">
            <div
              class="h-1.5 flex-1 overflow-hidden rounded-full bg-raised-2"
              role="progressbar"
              aria-label={`Progreso de ${d.titulo}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(f * 100)}
              aria-valuetext={etiquetaProgreso(d.metrica, d.progresoActual, d.objetivoCantidad)}
            >
              <div class="h-full rounded-full transition-[width] duration-500 {d.completado ? 'bg-mint' : 'bg-amber'}" style="width:{f * 100}%"></div>
            </div>
            <span class="num shrink-0 text-[11.5px] text-mute">{etiquetaProgreso(d.metrica, d.progresoActual, d.objetivoCantidad)}</span>
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}
