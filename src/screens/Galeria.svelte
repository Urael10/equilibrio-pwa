<script lang="ts">
  import HistorialSemana from '../components/HistorialSemana.svelte';
  import PersonajesRevision from '../components/PersonajesRevision.svelte';
  import { app } from '../state/store.svelte';

  type Pestana = 'historial' | 'personajes';
  const PESTANAS: { id: Pestana; nombre: string }[] = [
    { id: 'historial', nombre: 'Historial' },
    { id: 'personajes', nombre: 'Personajes' },
  ];
  let pestana = $state<Pestana>('historial');
</script>

<div class="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
  <header class="flex items-center gap-3">
    <button class="grid h-10 w-10 place-items-center rounded-xl border border-line bg-panel" onclick={() => app.volverAlInicio()} aria-label="Volver al inicio">←</button>
    <div>
      <h1 class="display text-[20px] font-bold leading-tight">Galería</h1>
      <p class="text-[12.5px] text-mute">{pestana === 'historial' ? 'Tu semana y tus insignias' : 'Todos los personajes y sus estados'}</p>
    </div>
  </header>

  <div class="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-panel p-1" role="tablist" aria-label="Secciones de la galería">
    {#each PESTANAS as p (p.id)}
      <button
        id="tab-{p.id}"
        class="rounded-xl py-2 text-[14px] font-semibold transition-colors {pestana === p.id ? 'bg-mint text-ink' : 'text-mute'}"
        role="tab"
        aria-selected={pestana === p.id}
        aria-controls="panel-{p.id}"
        onclick={() => (pestana = p.id)}
      >
        {p.nombre}
      </button>
    {/each}
  </div>

  <div id="panel-{pestana}" class="mt-4" role="tabpanel" aria-labelledby="tab-{pestana}">
    {#if pestana === 'historial'}
      <HistorialSemana />
    {:else}
      <PersonajesRevision />
    {/if}
  </div>
</div>
