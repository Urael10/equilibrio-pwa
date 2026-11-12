<script lang="ts">
  import type { DetalleMacro, MacroId } from '../types';

  interface Props {
    macro: MacroId;
    d: DetalleMacro;
  }
  let { macro, d }: Props = $props();

  const INFO: Record<MacroId, { nombre: string; color: string }> = {
    p: { nombre: 'Proteína', color: 'var(--color-coral)' },
    c: { nombre: 'Carbohidratos', color: 'var(--color-amber)' },
    f: { nombre: 'Grasas', color: 'var(--color-peri)' },
  };
  const info = $derived(INFO[macro]);

  // La escala va de 0% a 150% de la meta; la franja marcada es la banda ganadora (85–115%).
  const MAX = 1.5;
  const relleno = $derived(Math.min(d.ratio, MAX) / MAX);
  const dif = $derived(Math.round(Math.abs(d.total - d.meta)));
  const estado = $derived(
    d.estado === 'cerrado'
      ? 'En la banda'
      : d.estado === 'bajo'
        ? `Faltan ${dif} g`
        : `Sobran ${dif} g`,
  );
</script>

<div class="flex flex-col gap-1.5">
  <div class="flex items-baseline justify-between gap-2">
    <span class="flex items-center gap-2 text-[13px] font-semibold">
      <span class="h-2 w-2 rounded-full" style="background:{info.color}"></span>
      {info.nombre}
    </span>
    <span class="num text-[12px] text-mute">
      <span class="text-text">{Math.round(d.total)}</span> / {Math.round(d.meta)} g
    </span>
  </div>

  <div
    class="relative h-3 rounded-full bg-raised"
    role="meter"
    aria-label={`${info.nombre}: ${Math.round(d.ratio * 100)}% de la meta`}
    aria-valuemin={0}
    aria-valuemax={150}
    aria-valuenow={Math.round(d.ratio * 100)}
  >
    <!-- banda 85–115% -->
    <div
      class="absolute inset-y-[-3px] rounded-md border border-mint/40 bg-mint/10"
      style="left:{(0.85 / MAX) * 100}%; width:{((1.15 - 0.85) / MAX) * 100}%"
    ></div>
    <!-- relleno -->
    <div
      class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
      style="width:{relleno * 100}%; background:{info.color}; opacity:{d.estado === 'cerrado' ? 1 : 0.62}"
    ></div>
    <!-- meta exacta -->
    <div class="absolute inset-y-[-5px] w-px bg-text/60" style="left:{(1 / MAX) * 100}%"></div>
  </div>

  <div class="flex items-center justify-between text-[11.5px]">
    <span class={d.estado === 'cerrado' ? 'font-semibold text-mint' : 'text-mute'}>
      {d.estado === 'cerrado' ? '✓ ' : ''}{estado}
    </span>
    <span class="num text-mute">{Math.round(d.ratio * 100)}%</span>
  </div>
</div>
