<script lang="ts">
  import Personaje from './Personaje.svelte';
  import { contenidoMascota } from '../content';
  import { insigniasPorEtapa } from '../engine/progreso';
  import { app } from '../state/store.svelte';

  const insignias = $derived(insigniasPorEtapa(app.xp, contenidoMascota.etapas));
  const alcanzadas = $derived(insignias.filter((i) => i.alcanzada).length);
</script>

<section aria-labelledby="t-insignias">
  <div class="mb-2 flex items-baseline justify-between px-1">
    <h2 id="t-insignias" class="display text-[16px] font-semibold">Insignias de evolución</h2>
    <span class="num text-[12px] text-mute">{alcanzadas} / {insignias.length}</span>
  </div>
  <ul class="grid grid-cols-3 gap-2">
    {#each insignias as i (i.etapa.id)}
      <li class="panel flex flex-col items-center px-1 pb-3 pt-3 text-center {i.actual ? 'border-mint/60' : ''}">
        <Personaje id={contenidoMascota.principal} estado="radiante" etapa={i.etapa.id} tamano={72} bloqueado={!i.alcanzada} />
        <span class="display mt-1 text-[14px] font-semibold leading-tight">{i.alcanzada ? i.etapa.nombre : '???'}</span>
        <span class="num mt-0.5 text-[11px] leading-tight text-mute">
          {#if i.actual}<span class="text-mint">etapa actual</span>{:else if i.alcanzada}✓ lograda{:else}faltan {i.faltan} XP{/if}
        </span>
        <span class="num text-[10.5px] text-mute/80">Nv {i.etapa.nivelMin}+</span>
      </li>
    {/each}
  </ul>
</section>
