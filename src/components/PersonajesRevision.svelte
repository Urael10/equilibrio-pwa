<script lang="ts">
  import Personaje from './Personaje.svelte';
  import { contenidoMascota } from '../content';
  import type { EstadoMascota } from '../types';

  // Revisión de personajes: los cuatro en sus tres etapas y los seis estados de ánimo.
  const ESTADOS: { id: EstadoMascota; nombre: string }[] = [
    { id: 'radiante', nombre: 'Radiante' },
    { id: 'contenta', nombre: 'Contento' },
    { id: 'tranquila', nombre: 'Tranquilo' },
    { id: 'bajon', nombre: 'Bajón' },
    { id: 'hambrienta', nombre: 'Hambre' },
    { id: 'cansada', nombre: 'Cansado' },
  ];
  let estado = $state<EstadoMascota>('contenta');
</script>

<p class="text-[12.5px] text-mute">4 personajes · 3 etapas · 6 estados</p>

  <div class="scroll-x sticky top-0 z-10 -mx-4 mt-3 flex gap-2 bg-ink/90 px-4 py-2 backdrop-blur" role="radiogroup" aria-label="Estado de ánimo">
    {#each ESTADOS as e (e.id)}
      <button
        class="shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold {estado === e.id ? 'border-mint bg-mint text-ink' : 'border-line bg-panel text-text'}"
        role="radio"
        aria-checked={estado === e.id}
        onclick={() => (estado = e.id)}
      >
        {e.nombre}
      </button>
    {/each}
  </div>

  {#each contenidoMascota.personajes as p (p.id)}
    <section class="mt-5" aria-labelledby="g-{p.id}">
      <div class="px-1">
        <h2 id="g-{p.id}" class="display text-[18px] font-bold">{p.nombre} <span class="text-[12.5px] font-normal text-mute">· {p.rol}</span></h2>
        <p class="text-[12.5px] text-mute">{p.descripcion}</p>
      </div>
      <div class="mt-2 grid grid-cols-3 gap-2">
        {#each contenidoMascota.etapas as et (et.id)}
          <div class="panel flex flex-col items-center px-1 pb-3 pt-3">
            <Personaje id={p.id} {estado} etapa={et.id} tamano={96} />
            <span class="display mt-1 text-[14px] font-semibold">{et.nombre}</span>
            <span class="num text-[11px] text-mute">{et.xpMin} XP</span>
          </div>
        {/each}
      </div>
    </section>
  {/each}

