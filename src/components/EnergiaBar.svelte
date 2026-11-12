<script lang="ts">
  import type { Energia } from '../types';

  interface Props {
    e: Energia;
    minima: number;
  }
  let { e, minima }: Props = $props();

  const reservaVis = $derived(Math.max(0, Math.min(100, e.reserva)));
  const base = $derived(Math.min(100, e.base));
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-baseline justify-between">
    <span class="text-[13px] font-semibold">Energía del día</span>
    <span class="num text-[12px] text-mute">
      base <span class="text-text">{e.base}</span>
      {#if e.costo > 0}· entreno −<span class="text-amber">{e.costo}</span>{/if}
    </span>
  </div>

  <div
    class="relative h-3.5 overflow-hidden rounded-full bg-raised"
    role="meter"
    aria-label={`Reserva de energía ${e.reserva} sobre 100`}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.max(0, e.reserva)}
  >
    <div
      class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
      style="width:{reservaVis}%; background:{e.sostenible ? 'var(--color-mint)' : 'var(--color-coral)'}"
    ></div>
    {#if e.costo > 0}
      <div
        class="absolute inset-y-0 transition-all duration-500 ease-out"
        style="left:{reservaVis}%; width:{Math.max(0, base - reservaVis)}%; background: repeating-linear-gradient(135deg, rgba(255,193,94,.75) 0 4px, rgba(255,193,94,.25) 4px 8px)"
      ></div>
    {/if}
    <!-- reserva mínima -->
    <div class="absolute inset-y-0 w-0.5 bg-text/70" style="left:{minima}%"></div>
  </div>

  <div class="flex items-center justify-between text-[11.5px]">
    <span class={e.sostenible ? 'font-semibold text-mint' : 'font-semibold text-coral'}>
      {e.sostenible ? '✓ Reserva ' : '⚠ Reserva '}<span class="num">{e.reserva}</span>
      <span class="font-normal text-mute">· mínimo {minima}</span>
    </span>
    <span class="text-mute">{e.sostenible ? 'Se puede sostener' : 'Demasiado exigente hoy'}</span>
  </div>
</div>
