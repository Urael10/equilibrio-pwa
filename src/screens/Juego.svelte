<script lang="ts">
  import Personaje from '../components/Personaje.svelte';
  import DesafiosCard from '../components/DesafiosCard.svelte';
  import EnergiaBar from '../components/EnergiaBar.svelte';
  import MacroMeter from '../components/MacroMeter.svelte';
  import { catalogo } from '../content';
  import { kcalDe } from '../engine/evaluar';
  import { fmt } from '../engine/util';
  import { sumaAlimentos } from '../engine/evaluar';
  import { app } from '../state/store.svelte';
  import Cierre from './Cierre.svelte';

  const nivel = $derived(app.nivel);
  const ev = $derived(app.ev);
  const r = catalogo.reglas;
  const entreno = $derived(catalogo.entrenamientos[app.plan.entreno]);
  const timing = $derived(ev.reglas.timing);
  const usados = $derived(new Set(Object.values(app.plan.comidas).flat()));

  const nombreComida = (id: string | null) => nivel.comidas.find((c) => c.id === id)?.nombre.toLowerCase();
  const momentosTxt = (momentos: string[]) =>
    nivel.comidas
      .filter((c) => momentos.includes(c.id))
      .map((c) => c.nombre.toLowerCase())
      .join(' · ');

  const hab = $derived(nivel.habitos);

  const burbuja = $derived(
    app.aviso
      ? { texto: app.aviso.texto, error: app.aviso.tipo === 'error' }
      : { texto: app.frase, error: false },
  );

  const stats = $derived([
    { nombre: 'Energía', valor: ev.mascota.energia, color: 'var(--color-mint)' },
    { nombre: 'Nutrición', valor: ev.mascota.nutricion, color: 'var(--color-amber)' },
    { nombre: 'Ánimo', valor: ev.mascota.animo, color: 'var(--color-peri)' },
  ]);

  const totalComida = (id: string) => sumaAlimentos(app.plan.comidas[id] ?? [], catalogo);

  function marcaComida(id: string): string | null {
    if (!timing.aplica) return null;
    if (id === nivel.entrenoPor.pre) return `Antes de entrenar · ≥${entreno.combustiblePre} g carbohidratos`;
    if (id === nivel.entrenoPor.post) return `Después de entrenar · ≥${entreno.reparacionPost} g proteína`;
    return null;
  }
</script>

<div class="pb-36">
  <header class="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
    <button
      class="grid h-10 w-10 place-items-center rounded-full border border-line bg-panel text-lg"
      onclick={() => app.volverAlInicio()}
      aria-label="Volver al inicio"
    >
      ←
    </button>
    <div class="min-w-0">
      <h1 class="display truncate text-[19px] font-bold leading-tight">{nivel.titulo}</h1>
      <p class="truncate text-[12.5px] text-mute">{nivel.subtitulo}</p>
    </div>
  </header>

  <main class="flex flex-col gap-4 px-4">
    <!-- Mascota + estado -->
    <section class="panel p-4" aria-label="Estado de tu mascota">
      <div class="flex items-center gap-3">
        <div class="shrink-0">
          <Personaje estado={ev.mascota.estado} etapa={app.etapa.id} tamano={124} comiendo={app.comiendo} nombre={app.progreso.nombre} />
        </div>
        <div class="min-w-0 flex-1">
          <p class="display text-[15px] font-semibold">{app.progreso.nombre}</p>
          <div
            class="mt-1.5 rounded-2xl rounded-tl-md border px-3 py-2 text-[13.5px] leading-snug {burbuja.error
              ? 'border-coral/40 bg-coral/10 text-coral'
              : 'border-line bg-raised text-text'}"
            aria-live="polite"
          >
            {#key burbuja.texto}
              <span class="anim-aparece block">{burbuja.texto}</span>
            {/key}
          </div>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-3 gap-3">
        {#each stats as s (s.nombre)}
          <div>
            <div class="flex items-baseline justify-between text-[11.5px] text-mute">
              <span>{s.nombre}</span><span class="num text-text">{s.valor}</span>
            </div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-raised">
              <div class="h-full rounded-full transition-[width] duration-500" style="width:{s.valor}%; background:{s.color}"></div>
            </div>
          </div>
        {/each}
      </div>
    </section>

    <!-- Desafíos del día: el progreso se mueve con cada alimento -->
    <DesafiosCard />

    <!-- Escenario y hábitos -->
    <section class="panel p-4">
      <p class="text-[14px] leading-relaxed text-text">{nivel.escenario}</p>
      <ul class="mt-3 grid grid-cols-3 gap-2 text-center">
        <li class="rounded-xl bg-raised px-2 py-2">
          <p class="text-[18px]" aria-hidden="true">🌙</p>
          <p class="num text-[13px] font-semibold">{fmt(hab.suenoHoras, 1)} h</p>
          <p class="text-[11px] text-mute">sueño</p>
        </li>
        <li class="rounded-xl bg-raised px-2 py-2">
          <p class="text-[18px]" aria-hidden="true">💧</p>
          <p class="num text-[13px] font-semibold">{fmt(hab.aguaLitros, 1)} L</p>
          <p class="text-[11px] text-mute">agua</p>
        </li>
        <li class="rounded-xl bg-raised px-2 py-2">
          <p class="text-[18px]" aria-hidden="true">🍃</p>
          <p class="num text-[13px] font-semibold">{hab.calma}/5</p>
          <p class="text-[11px] text-mute">calma</p>
        </li>
      </ul>
      <p class="mt-3 text-[12.5px] leading-snug text-mute">{nivel.objetivo}</p>
    </section>

    <!-- Entrenamiento -->
    <section aria-labelledby="t-entreno">
      <h2 id="t-entreno" class="display mb-2 px-1 text-[16px] font-semibold">¿Qué entrena hoy?</h2>
      <div class="scroll-x -mx-4 flex gap-2.5 px-4 pb-1">
        {#each nivel.entrenamientos as id (id)}
          {@const e = catalogo.entrenamientos[id]}
          {@const activo = app.plan.entreno === id}
          <button
            class="w-[132px] shrink-0 snap-start rounded-2xl border p-3 text-left transition-colors {activo
              ? 'border-mint bg-mint/10'
              : 'border-line bg-panel'}"
            aria-pressed={activo}
            onclick={() => app.elegirEntrenamiento(id)}
          >
            <span class="text-[22px]" aria-hidden="true">{e.icono}</span>
            <span class="mt-1 block text-[13.5px] font-semibold leading-tight">{e.nombre}</span>
            <span class="num mt-1.5 block text-[11px] text-mute">
              gasta <span class="text-amber">{e.costo}</span>
              {#if e.extra.c + e.extra.p > 0}· +{e.extra.c + e.extra.p} g{/if}
            </span>
          </button>
        {/each}
      </div>
      <p class="mt-2 px-1 text-[12.5px] leading-snug text-mute">
        {entreno.descripcion}
        {#if timing.aplica}
          <span class="text-text">Pide ≥{entreno.combustiblePre} g de carbohidratos antes y ≥{entreno.reparacionPost} g de proteína después.</span>
        {/if}
      </p>
    </section>

    <!-- Energía y macros -->
    <section class="panel flex flex-col gap-4 p-4" aria-label="Energía y macros">
      <EnergiaBar e={ev.energia} minima={r.reservaMinima} />
      <div class="h-px bg-line"></div>
      <div class="flex flex-col gap-3.5">
        <div class="flex items-baseline justify-between">
          <h2 class="display text-[16px] font-semibold">Macros del día</h2>
          <span class="text-[11.5px] text-mute">la franja verde es 85–115%</span>
        </div>
        <MacroMeter macro="p" d={ev.macros.p} />
        <MacroMeter macro="c" d={ev.macros.c} />
        <MacroMeter macro="f" d={ev.macros.f} />
      </div>
    </section>

    <!-- Comidas -->
    <section aria-labelledby="t-comidas">
      <div class="mb-2 flex items-baseline justify-between px-1">
        <h2 id="t-comidas" class="display text-[16px] font-semibold">Armá las comidas</h2>
        {#if ev.porcionesColocadas > 0}
          <button class="text-[12.5px] text-mute underline underline-offset-4" onclick={() => app.vaciar()}>Vaciar platos</button>
        {/if}
      </div>
      <div class="flex flex-col gap-2.5">
        {#each nivel.comidas as c (c.id)}
          {@const lista = app.plan.comidas[c.id] ?? []}
          {@const sel = app.seleccionada === c.id}
          {@const t = totalComida(c.id)}
          {@const marca = marcaComida(c.id)}
          <div
            class="rounded-2xl border p-3 transition-colors {sel ? 'border-mint/70 bg-mint/[0.06]' : 'border-line bg-panel'}"
          >
            <button
              class="flex w-full items-center justify-between text-left"
              aria-pressed={sel}
              onclick={() => app.seleccionar(c.id)}
            >
              <span class="flex items-baseline gap-2">
                <span class="display text-[15px] font-semibold">{c.nombre}</span>
                <span class="num text-[11px] text-mute">{c.hora}</span>
              </span>
              <span class="num text-[11.5px] text-mute">{lista.length}/{c.capacidad}</span>
            </button>
            {#if marca}
              <p class="mt-1 text-[11.5px] text-amber">⚡ {marca}</p>
            {/if}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each lista as id (id)}
                {@const a = catalogo.alimentos[id]}
                <button
                  class="anim-aparece flex items-center gap-1.5 rounded-full border border-line bg-raised py-1 pl-2 pr-2.5 text-[12.5px]"
                  onclick={() => app.quitarAlimento(id)}
                  aria-label={`Quitar ${a.nombre}`}
                >
                  <span aria-hidden="true">{a.icono}</span>{a.nombre}
                  <span class="text-mute" aria-hidden="true">×</span>
                </button>
              {:else}
                <p class="rounded-xl border border-dashed border-line px-3 py-2 text-[12.5px] text-mute">
                  {sel ? 'Tocá un alimento de la despensa para ponerlo acá.' : 'Vacío. Tocá la comida para seleccionarla.'}
                </p>
              {/each}
            </div>
            {#if lista.length > 0}
              <p class="num mt-2 text-[11px] text-mute">
                P <span class="text-coral">{fmt(t.p)}</span> · C <span class="text-amber">{fmt(t.c)}</span> · G
                <span class="text-peri">{fmt(t.f)}</span> · {fmt(kcalDe(t))} kcal
                {#if t.p >= r.proteinaPorComida}<span class="text-mint"> · ✓ proteína</span>{/if}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    <!-- Despensa -->
    <section aria-labelledby="t-despensa">
      <h2 id="t-despensa" class="display mb-2 px-1 text-[16px] font-semibold">Despensa</h2>
      <ul class="grid grid-cols-2 gap-2.5">
        {#each nivel.mano as id (id)}
          {@const a = catalogo.alimentos[id]}
          {@const puesto = usados.has(id)}
          <li>
            <button
              class="h-full w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.98] {puesto
                ? 'border-line/60 bg-panel/50 opacity-45'
                : 'border-line bg-panel hover:border-mint/50'}"
              disabled={puesto}
              onclick={() => app.colocar(id)}
              aria-label={puesto ? `${a.nombre}, ya está en un plato` : `Poner ${a.nombre} en ${nombreComida(app.seleccionada) ?? 'una comida'}`}
            >
              <span class="flex items-start justify-between">
                <span class="text-[26px] leading-none" aria-hidden="true">{a.icono}</span>
                {#if puesto}<span class="text-[11px] text-mint">en el plato</span>{/if}
              </span>
              <span class="mt-1.5 block text-[13.5px] font-semibold leading-tight">{a.nombre}</span>
              <span class="block truncate text-[11px] text-mute">{a.porcion}</span>
              <span class="num mt-1.5 block text-[11.5px]">
                <span class="text-coral">P{a.p}</span>
                <span class="text-amber">C{a.c}</span>
                <span class="text-peri">G{a.f}</span>
                <span class="text-mute">· F{a.fibra}</span>
              </span>
              <span class="mt-1 block truncate text-[10.5px] text-mute">va en: {momentosTxt(a.momentos)}</span>
            </button>
          </li>
        {/each}
      </ul>
      <p class="mt-2 px-1 text-[11.5px] text-mute">P proteína · C carbohidratos · G grasas · F fibra, en gramos por porción.</p>
    </section>
  </main>

  <!-- Barra inferior -->
  <div class="fixed inset-x-0 bottom-0 z-20">
    <div class="mx-auto max-w-[480px] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {#if app.pista}
        <div class="anim-subir mb-2 rounded-2xl border border-peri/40 bg-[#10152a] p-3 text-[13px] leading-snug shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <p><span aria-hidden="true">💡</span> {app.pista.texto}</p>
            <button class="text-mute" aria-label="Cerrar pista" onclick={() => (app.pista = null)}>×</button>
          </div>
          {#if app.pista.nivel === 1}
            <button class="mt-1.5 text-[12px] text-peri underline underline-offset-4" onclick={() => app.pedirPista()}>Dame una pista más concreta</button>
          {/if}
        </div>
      {/if}
      <div class="flex items-center gap-2 rounded-[22px] border border-line bg-panel/95 p-2 shadow-2xl backdrop-blur">
        <button
          class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-line bg-raised text-[20px]"
          onclick={() => app.pedirPista()}
          aria-label="Pedir una pista"
        >
          💡
        </button>
        <div class="min-w-0 flex-1 px-1">
          <p class="num text-[13px] font-semibold">{fmt(ev.totales.kcal)} <span class="font-normal text-mute">/ {fmt(ev.metas.kcal)} kcal</span></p>
          <p class="truncate text-[11.5px] text-mute">{ev.porcionesColocadas} porciones en el plato</p>
        </div>
        <button
          class="h-12 shrink-0 rounded-2xl bg-mint px-5 text-[14.5px] font-bold text-ink transition-opacity disabled:opacity-40"
          disabled={ev.porcionesColocadas === 0}
          onclick={() => app.cerrarDia()}
        >
          Cerrar el día
        </button>
      </div>
    </div>
  </div>

  {#if app.cierre}
    <Cierre />
  {/if}
</div>
