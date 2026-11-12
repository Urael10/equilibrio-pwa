<script lang="ts">
  import { onMount } from 'svelte';
  import Home from './screens/Home.svelte';
  import Galeria from './screens/Galeria.svelte';
  import Juego from './screens/Juego.svelte';
  import { app } from './state/store.svelte';

  let listo = $state(false);
  onMount(async () => {
    await app.iniciar();
    listo = true;
  });
</script>

<!-- Resplandor de fondo: dos luces muy tenues, fijas -->
<div class="pointer-events-none fixed inset-0 -z-10 bg-ink" aria-hidden="true">
  <div class="absolute -left-24 top-24 h-72 w-72 rounded-full bg-peri/[0.07] blur-3xl"></div>
  <div class="absolute -right-24 top-[55%] h-72 w-72 rounded-full bg-mint/[0.05] blur-3xl"></div>
</div>

<div class="mx-auto min-h-dvh w-full max-w-[480px]">
  {#if !listo}
    <div class="grid min-h-dvh place-items-center text-mute" role="status">Cargando…</div>
  {:else if app.pantalla === 'home'}
    <Home />
  {:else if app.pantalla === 'galeria'}
    <Galeria />
  {:else}
    <Juego />
  {/if}
</div>
