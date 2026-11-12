<script lang="ts">
  import GraficoSemana from './GraficoSemana.svelte';
  import InsigniasEtapa from './InsigniasEtapa.svelte';
  import { plantillasDesafios } from '../content';
  import { promedioCumplimiento, rachaActual, xpDeLaSerie } from '../engine/historial';
  import { fmt, nombreDia, numeroDia } from '../engine/util';
  import { app } from '../state/store.svelte';

  const serie = $derived(app.semana);
  const jugados = $derived(serie.filter((s) => s.registro).length);
  const promedio = $derived(promedioCumplimiento(serie));
  const xpSemana = $derived(xpDeLaSerie(serie));
  const racha = $derived(rachaActual(app.historial, app.fecha));

  // Por defecto, el último día jugado de la semana.
  let elegida = $state<string | null>(null);
  const fechaVista = $derived(
    elegida && serie.some((s) => s.fecha === elegida && s.registro)
      ? elegida
      : ([...serie].reverse().find((s) => s.registro)?.fecha ?? null),
  );
  const reg = $derived(serie.find((s) => s.fecha === fechaVista)?.registro ?? null);
  const titulo = (id: string) => plantillasDesafios.find((p) => p.id === id)?.titulo ?? id;
</script>

<div class="flex flex-col gap-4">
  <section class="panel p-4" aria-labelledby="t-semana">
    <div class="flex items-baseline justify-between">
      <h2 id="t-semana" class="display text-[16px] font-semibold">Últimos 7 días</h2>
      <span class="num text-[12px] text-mute">{jugados} / 7 días jugados</span>
    </div>

    {#if jugados === 0}
      <p class="mt-3 rounded-xl border border-dashed border-line px-3 py-4 text-center text-[13px] leading-snug text-mute">
        Todavía no cerraste ningún día. Cuando cierres uno, acá aparece cómo te fue con tus macros y tus calorías.
      </p>
    {:else}
      <div class="mt-3 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-xl bg-raised px-2 py-2">
          <p class="num text-[17px] font-semibold text-mint">{promedio?.kcal ?? 0}%</p>
          <p class="text-[11px] text-mute">calorías (promedio)</p>
        </div>
        <div class="rounded-xl bg-raised px-2 py-2">
          <p class="num text-[17px] font-semibold text-amber">{racha}</p>
          <p class="text-[11px] text-mute">{racha === 1 ? 'día seguido' : 'días seguidos'}</p>
        </div>
        <div class="rounded-xl bg-raised px-2 py-2">
          <p class="num text-[17px] font-semibold">{xpSemana}</p>
          <p class="text-[11px] text-mute">XP de la semana</p>
        </div>
      </div>
      <div class="mt-3">
        <GraficoSemana {serie} seleccionada={fechaVista} onelegir={(f) => (elegida = f)} />
      </div>
    {/if}
  </section>

  {#if reg}
    <section class="panel anim-aparece p-4" aria-live="polite" aria-labelledby="t-dia">
      <div class="flex items-baseline justify-between">
        <h3 id="t-dia" class="display text-[16px] font-semibold capitalize">{nombreDia(reg.fecha)} {numeroDia(reg.fecha)}</h3>
        <span class="flex gap-0.5" role="img" aria-label={`${reg.estrellas} de 3 estrellas`}>
          {#each [1, 2, 3] as n (n)}<span class="text-[16px] {n <= reg.estrellas ? 'text-amber' : 'text-line'}" aria-hidden="true">★</span>{/each}
        </span>
      </div>
      <dl class="num mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
        <div class="flex justify-between"><dt class="text-coral">Proteína</dt><dd>{fmt(reg.totales.p)} / {fmt(reg.metas.p)} g <span class="text-mute">({reg.cumplimiento.p}%)</span></dd></div>
        <div class="flex justify-between"><dt class="text-amber">Carbohidratos</dt><dd>{fmt(reg.totales.c)} / {fmt(reg.metas.c)} g <span class="text-mute">({reg.cumplimiento.c}%)</span></dd></div>
        <div class="flex justify-between"><dt class="text-peri">Grasas</dt><dd>{fmt(reg.totales.f)} / {fmt(reg.metas.f)} g <span class="text-mute">({reg.cumplimiento.f}%)</span></dd></div>
        <div class="flex justify-between"><dt class="text-mint">Calorías</dt><dd>{fmt(reg.totales.kcal)} / {fmt(reg.metas.kcal)} <span class="text-mute">({reg.cumplimiento.kcal}%)</span></dd></div>
        <div class="flex justify-between"><dt class="text-mute">Fibra</dt><dd>{fmt(reg.totales.fibra)} g</dd></div>
        <div class="flex justify-between"><dt class="text-mute">Energía final</dt><dd>{reg.energiaFinal}</dd></div>
      </dl>
      <p class="num mt-3 text-[12.5px] text-mute">
        <span class="text-amber">+{reg.xpGanada} XP</span> ese día
        {#if reg.desafiosCompletados.length}· desafíos: {reg.desafiosCompletados.map(titulo).join(', ')}{:else}· sin desafíos cumplidos{/if}
      </p>
    </section>
  {/if}

  <InsigniasEtapa />
</div>
