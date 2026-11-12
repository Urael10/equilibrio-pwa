<script lang="ts">
  import Personaje from '../components/Personaje.svelte';
  import { app } from '../state/store.svelte';

  const c = $derived(app.cierre!);
  const ev = $derived(app.ev);
  const mejor = $derived(app.progreso.mejor[app.nivelId] ?? 0);
  const estrellaPath = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';
</script>

<div
  class="anim-aparece fixed inset-0 z-30 overflow-y-auto bg-ink/[0.97] backdrop-blur-sm"
  role="dialog"
  aria-modal="true"
  aria-labelledby="titulo-cierre"
>
  <div class="mx-auto flex min-h-full max-w-[480px] flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
    <div class="flex flex-col items-center text-center">
      <Personaje estado={ev.mascota.estado} etapa={app.etapa.id} tamano={132} nombre={app.progreso.nombre} celebra={c.estrellas >= 2 || !!app.subida} />

      <div class="mt-2 flex gap-2" role="img" aria-label={`${c.estrellas} de 3 estrellas`}>
        {#each [1, 2, 3] as n (n)}
          <svg
            viewBox="0 0 24 24"
            class="h-11 w-11"
            style={n <= c.estrellas ? `animation: estrella .55s ${0.15 + n * 0.18}s cubic-bezier(.3,1.5,.5,1) both` : ''}
          >
            <path
              d={estrellaPath}
              fill={n <= c.estrellas ? 'var(--color-amber)' : 'none'}
              stroke={n <= c.estrellas ? 'var(--color-amber)' : 'var(--color-line)'}
              stroke-width="1.5"
              stroke-linejoin="round"
            />
          </svg>
        {/each}
      </div>

      <h2 id="titulo-cierre" class="display mt-3 text-[26px] font-bold leading-tight">{c.titulo}</h2>
      <p class="mt-1.5 max-w-[36ch] text-[14.5px] leading-snug text-mute">{c.resumen}</p>
      <p class="num mt-3 rounded-full border border-line bg-panel px-3 py-1 text-[12px] text-mute">
        Este intento vale <span class="text-amber">{c.xpGanada} XP</span> · tu mejor: {mejor}★
      </p>
      <p class="num mt-2 text-[12px] text-mute" aria-live="polite">
        {#if app.xpCierre > 0}<span class="text-mint">+{app.xpCierre} XP</span> sumados hoy{:else}Hoy no sumó XP nueva{/if} · Nv <span class="text-text">{app.nivelXp.nivel}</span> · {app.xp} XP
      </p>
    </div>

    {#if app.subida}
      <section class="anim-subir mt-5 rounded-[22px] border border-amber/50 bg-amber/[0.1] p-3.5 text-center" role="status" aria-label="Subida de nivel">
        <p class="num text-[11px] uppercase tracking-wider text-amber">¡Subió de nivel!</p>
        <p class="display mt-0.5 text-[22px] font-bold leading-tight">Nivel {app.subida.nivelAntes} → {app.subida.nivelAhora}</p>
        {#if app.subida.etapaNueva}
          <p class="mt-1 text-[13.5px] text-text">{app.progreso.nombre} evolucionó: ahora es <span class="font-semibold text-mint">{app.subida.etapaNueva}</span>.</p>
        {/if}
      </section>
    {/if}

    {#if app.desafiosNuevos.length}
      <section class="anim-subir mt-5 rounded-[22px] border border-mint/40 bg-mint/[0.08] p-3.5" aria-label="Desafíos del día cumplidos">
        <p class="num text-[11px] uppercase tracking-wider text-mint">Desafíos cumplidos · +{app.desafiosNuevos.reduce((a, d) => a + d.xpRecompensa, 0)} XP</p>
        <ul class="mt-1.5 flex flex-col gap-1">
          {#each app.desafiosNuevos as d (d.id)}
            <li class="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span>{d.titulo}</span><span class="num text-[12px] text-amber">+{d.xpRecompensa} XP</span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#each app.nuevos as n (n.id)}
      <section class="anim-subir mt-5 flex items-center gap-3 rounded-[22px] border border-amber/40 bg-amber/[0.08] p-3" aria-label={`${n.nombre} se unió`}>
        <div class="shrink-0">
          <Personaje id={n.id} estado="radiante" etapa={app.etapa.id} tamano={84} celebra />
        </div>
        <div class="min-w-0">
          <p class="num text-[11px] uppercase tracking-wider text-amber">Nuevo compañero</p>
          <h3 class="display text-[18px] font-bold leading-tight">¡{n.nombre} se unió!</h3>
          <p class="mt-0.5 text-[13px] leading-snug text-mute">{n.dominio} · {n.descripcion}</p>
        </div>
      </section>
    {/each}

    <section class="mt-6" aria-label="Reglas del día">
      <h3 class="display mb-2 px-1 text-[16px] font-semibold">Cómo salió cada regla</h3>
      <ul class="flex flex-col gap-2">
        {#each c.items as i (i.regla)}
          <li class="panel p-3.5">
            <details>
              <summary class="flex cursor-pointer list-none items-start gap-3">
                <span
                  class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[13px] font-bold {!i.aplica
                    ? 'bg-raised-2 text-mute'
                    : i.ok
                      ? 'bg-mint text-ink'
                      : 'bg-coral/20 text-coral'}"
                  aria-hidden="true"
                >
                  {!i.aplica ? '–' : i.ok ? '✓' : '!'}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-[14px] font-semibold leading-tight">{i.titulo}</span>
                  <span class="mt-1 block text-[13px] leading-snug text-mute">{i.detalle}</span>
                </span>
              </summary>
              <p class="mt-2.5 rounded-xl bg-raised p-3 text-[12.5px] leading-relaxed text-text">
                <span class="font-semibold text-peri">Por qué importa.</span> {i.leccion}
              </p>
            </details>
          </li>
        {/each}
      </ul>
      <p class="mt-2 px-1 text-[11.5px] text-mute">Tocá una regla para leer por qué importa.</p>
    </section>

    <section class="panel mt-5 p-4">
      <h3 class="display text-[16px] font-semibold">Lo que aprendió {app.progreso.nombre} hoy</h3>
      <p class="mt-1.5 text-[13.5px] leading-relaxed text-text">{c.leccionDelDia}</p>
    </section>

    <section class="mt-3 rounded-[22px] border border-peri/35 bg-peri/[0.08] p-4">
      <h3 class="display text-[15px] font-semibold">{c.estrellas === 3 ? 'Y ahora' : 'Para el próximo intento'}</h3>
      <p class="mt-1 text-[13.5px] leading-relaxed">{c.siguiente}</p>
    </section>

    <div class="mt-auto flex flex-col gap-2.5 pt-6">
      <button class="h-13 rounded-2xl bg-mint py-3.5 text-[15px] font-bold text-ink" onclick={() => app.seguirIntentando()}>
        {c.estrellas === 3 ? 'Ver mi plan' : 'Ajustar mi plan'}
      </button>
      <button class="rounded-2xl border border-line bg-panel py-3.5 text-[15px] font-semibold" onclick={() => app.volverAlInicio()}>
        Volver al inicio
      </button>
    </div>
  </div>
</div>

<style>
  summary::-webkit-details-marker {
    display: none;
  }
</style>
