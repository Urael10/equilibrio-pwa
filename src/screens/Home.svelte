<script lang="ts">
  import DesafiosCard from '../components/DesafiosCard.svelte';
  import Personaje from '../components/Personaje.svelte';
  import { contenidoMascota, niveles, proximamente } from '../content';
  import type { EstadoMascota } from '../types';
  import { app } from '../state/store.svelte';

  const companerosFijos = contenidoMascota.personajes.filter((p) => p.desbloqueo);
  let abierto = $state<string | null>(null);
  const detalle = $derived(companerosFijos.find((p) => p.id === abierto) ?? null);
  const tengo = (id: string) => app.companeros.some((c) => c.id === id);

  let editando = $state(false);
  let nombreTmp = $state('');

  const nivel1 = niveles[0];
  const mejor = $derived(app.progreso.mejor[nivel1.id] ?? 0);
  const jugado = $derived(mejor > 0);

  // Estado en el inicio: refleja el último armado, o la bienvenida si todavía no hay nada.
  const estado = $derived<EstadoMascota>(
    app.tieneBorrador ? app.ev.mascota.estado : jugado ? 'contenta' : 'tranquila',
  );
  const habla = $derived(app.tieneBorrador ? app.frase : jugado ? '¡Qué buen día jugamos! ¿Probamos otro armado?' : app.bienvenida);

  const sig = $derived(app.avance.siguiente);

  function empezarEdicion() {
    nombreTmp = app.progreso.nombre;
    editando = true;
  }
  function guardarNombre() {
    app.renombrar(nombreTmp);
    editando = false;
  }
</script>

<div class="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
  <header class="flex items-center justify-between">
    <p class="display text-[22px] font-bold tracking-tight">equilibrio</p>
    <span class="num rounded-full border border-line bg-panel px-3 py-1 text-[12px] text-mute" aria-label={`Nivel ${app.nivelXp.nivel}, ${app.xp} XP`}>
      Nv <span class="text-text">{app.nivelXp.nivel}</span> · <span class="text-amber">{app.xp}</span> XP
    </span>
  </header>

  <!-- La mascota: el centro de la pantalla -->
  <section class="relative mt-4 overflow-hidden rounded-[28px] border border-line bg-panel px-5 pb-5 pt-6 text-center" aria-label="Tu mascota">
    <div class="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(94,242,192,0.10),transparent)]"></div>

    <div class="relative flex justify-center">
      <Personaje {estado} etapa={app.etapa.id} tamano={190} comiendo={app.comiendo} nombre={app.progreso.nombre} />
    </div>

    <div class="relative mt-2">
      {#if editando}
        <form class="flex items-center justify-center gap-2" onsubmit={(e) => { e.preventDefault(); guardarNombre(); }}>
          <label class="sr-only" for="nombre-mascota">Nombre de tu mascota</label>
          <input
            id="nombre-mascota"
            class="display w-40 rounded-xl border border-line bg-raised px-3 py-1.5 text-center text-[20px] font-bold"
            maxlength="14"
            bind:value={nombreTmp}
          />
          <button class="rounded-xl bg-mint px-3 py-2 text-[13px] font-bold text-ink" type="submit">Guardar</button>
        </form>
      {:else}
        <button class="display text-[26px] font-bold leading-none" onclick={empezarEdicion} aria-label={`Cambiar el nombre de ${app.progreso.nombre}`}>
          {app.progreso.nombre}
        </button>
      {/if}
      <p class="mt-1 text-[13px] text-mute">{app.etapa.nombre} · {app.etapa.descripcion}</p>
    </div>

    <p class="relative mx-auto mt-3 max-w-[32ch] rounded-2xl border border-line bg-raised px-4 py-2.5 text-[14px] leading-snug">{habla}</p>

    <div class="relative mt-4 text-left">
      <div class="flex items-baseline justify-between text-[12px] text-mute">
        <span>Evolución</span>
        <span class="num">
          {#if sig}<span class="text-text">{app.xp}</span> / {sig.xpMin} XP → {sig.nombre}{:else}etapa máxima{/if}
        </span>
      </div>
      <div class="mt-1.5 h-2 overflow-hidden rounded-full bg-raised">
        <div class="h-full rounded-full bg-gradient-to-r from-peri to-mint transition-[width] duration-700" style="width:{app.avance.pct * 100}%"></div>
      </div>
    </div>
  </section>

  <!-- Desafíos de hoy -->
  <section class="mt-5" aria-label="Desafíos de hoy">
    <DesafiosCard compacta />
  </section>

  <!-- Compañeros -->
  <section class="mt-5" aria-labelledby="t-comp">
    <div class="mb-2 flex items-baseline justify-between px-1">
      <h2 id="t-comp" class="display text-[17px] font-semibold">Compañeros</h2>
      <span class="num text-[12px] text-mute">{app.companeros.length - 1} / {companerosFijos.length}</span>
    </div>
    <ul class="grid grid-cols-3 gap-2">
      {#each companerosFijos as c (c.id)}
        {@const libre = tengo(c.id)}
        <li>
          <button
            class="panel flex w-full flex-col items-center px-1 pb-3 pt-3 text-center {abierto === c.id ? 'border-mint/60' : ''}"
            aria-expanded={abierto === c.id}
            aria-controls="detalle-companero"
            onclick={() => (abierto = abierto === c.id ? null : c.id)}
          >
            <Personaje id={c.id} estado="contenta" etapa={app.etapa.id} tamano={76} bloqueado={!libre} />
            <span class="display mt-1 text-[14px] font-semibold leading-tight">{libre ? c.nombre : '???'}</span>
            <span class="mt-0.5 text-[11.5px] leading-tight text-mute">{libre ? c.dominio : '🔒 bloqueado'}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if detalle}
      <div id="detalle-companero" class="anim-aparece mt-2 rounded-2xl border border-line bg-panel/60 p-4 text-[13.5px] leading-relaxed">
        {#if tengo(detalle.id)}
          <p class="display text-[16px] font-semibold">{detalle.nombre} · {detalle.dominio}</p>
          <p class="mt-1 text-mute">{detalle.descripcion}</p>
          <p class="mt-2"><span class="font-semibold text-peri">Lo que enseña.</span> {detalle.leccion}</p>
        {:else}
          <p class="display text-[16px] font-semibold">Un compañero te espera</p>
          <p class="mt-1 text-mute">Cómo se desbloquea: {detalle.desbloqueo?.texto}</p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Juego -->
  <section class="mt-5" aria-labelledby="t-juego">
    <h2 id="t-juego" class="display mb-2 px-1 text-[17px] font-semibold">Jugar</h2>
    <div class="panel overflow-hidden p-4">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[12.5px] text-mute">{nivel1.subtitulo}</p>
          <h3 class="display text-[20px] font-bold leading-tight">{nivel1.titulo}</h3>
        </div>
        <div class="flex shrink-0 gap-0.5" role="img" aria-label={`${mejor} de 3 estrellas`}>
          {#each [1, 2, 3] as n (n)}
            <span class="text-[18px] {n <= mejor ? 'text-amber' : 'text-line'}" aria-hidden="true">★</span>
          {/each}
        </div>
      </div>
      <p class="mt-2 text-[13.5px] leading-relaxed text-mute">{nivel1.escenario}</p>
      <button class="mt-4 h-12 w-full rounded-2xl bg-mint text-[15px] font-bold text-ink" onclick={() => app.abrirNivel(nivel1.id)}>
        {app.tieneBorrador ? 'Seguir con mi plan' : jugado ? 'Jugar otra vez' : 'Empezar el día'}
      </button>
    </div>

    <ol class="mt-3 grid gap-2 text-[13px] text-mute">
      <li class="flex gap-3 rounded-2xl border border-line bg-panel/60 px-4 py-3">
        <span class="num text-text">1</span><span>Mirá cómo llegó {app.progreso.nombre} al día y elegí un entrenamiento que su energía aguante.</span>
      </li>
      <li class="flex gap-3 rounded-2xl border border-line bg-panel/60 px-4 py-3">
        <span class="num text-text">2</span><span>Armá cuatro comidas con la despensa hasta cerrar proteína, carbohidratos y grasas.</span>
      </li>
      <li class="flex gap-3 rounded-2xl border border-line bg-panel/60 px-4 py-3">
        <span class="num text-text">3</span><span>Cerrá el día: {app.progreso.nombre} te cuenta qué salió bien y por qué.</span>
      </li>
    </ol>
  </section>

  <section class="mt-6" aria-labelledby="t-prox">
    <h2 id="t-prox" class="display mb-2 px-1 text-[17px] font-semibold">Más adelante</h2>
    <ul class="grid gap-2">
      {#each proximamente as p (p.orden)}
        <li class="flex items-center justify-between rounded-2xl border border-dashed border-line px-4 py-3 text-mute">
          <span>
            <span class="block text-[14px] font-semibold text-text/80">{p.titulo}</span>
            <span class="block text-[12px]">{p.subtitulo}</span>
          </span>
          <span class="text-[12px]" aria-label="Bloqueado">🔒 pronto</span>
        </li>
      {/each}
    </ul>
  </section>

  <footer class="mt-8 flex items-center justify-between px-1 text-[11.5px] text-mute">
    <span class="num">v0.6.1</span>
    <span class="flex gap-4">
      <button class="underline underline-offset-4" onclick={() => app.abrirGaleria()}>Galería</button>
      <button class="underline underline-offset-4" onclick={() => { if (confirm('¿Borrar el progreso y empezar de cero?')) app.nuevaPartida(); }}>Empezar de cero</button>
    </span>
  </footer>
</div>
