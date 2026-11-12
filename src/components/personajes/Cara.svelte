<svelte:options namespace="svg" />

<script lang="ts">
  import type { EstadoMascota } from '../../types';

  // La cara se dibuja centrada en (0, 0); cada personaje la coloca y la escala.
  // `colmillo` agrega el diente travieso de Cuernito (solo en estados alegres).
  interface Props {
    estado: EstadoMascota;
    colmillo?: boolean;
  }
  let { estado, colmillo = false }: Props = $props();

  const INK = '#07090d';
  const MEJILLA: Record<EstadoMascota, number> = {
    radiante: 0.9,
    contenta: 0.7,
    tranquila: 0.45,
    bajon: 0.28,
    hambrienta: 0.5,
    cansada: 0.4,
  };
</script>

<g>
  <!-- mejillas -->
  <ellipse cx="-45" cy="13" rx="9" ry="5.5" fill="#ff8fa3" opacity={MEJILLA[estado]} />
  <ellipse cx="45" cy="13" rx="9" ry="5.5" fill="#ff8fa3" opacity={MEJILLA[estado]} />

  {#if estado === 'radiante'}
    <g fill="none" stroke={INK} stroke-width="4.6" stroke-linecap="round">
      <path d="M-37 4Q-27 -10 -17 4" />
      <path d="M17 4Q27 -10 37 4" />
    </g>
    <path d="M-11 7Q0 25 11 7Z" fill={INK} />
    <ellipse cx="0" cy="16" rx="5" ry="3" fill="#ff8fa3" />
    {#if colmillo}<path d="M3 7L9 7L6 13.5Z" fill="#fff" />{/if}
  {:else if estado === 'contenta'}
    <g class="parp">
      <ellipse cx="-27" cy="0" rx="9.5" ry="12" fill={INK} />
      <ellipse cx="27" cy="0" rx="9.5" ry="12" fill={INK} />
      <circle cx="-24" cy="-4.5" r="4" fill="#fff" />
      <circle cx="30" cy="-4.5" r="4" fill="#fff" />
      <circle cx="-30" cy="4.5" r="2" fill="#fff" />
      <circle cx="24" cy="4.5" r="2" fill="#fff" />
    </g>
    {#if colmillo}
      <path d="M-10 8Q0 19 10 8" fill="none" stroke={INK} stroke-width="3.2" stroke-linecap="round" />
      <path d="M3 12.6L8 11L6.5 18Z" fill="#fff" stroke={INK} stroke-width="1.4" stroke-linejoin="round" />
    {:else}
      <path d="M-7 9q3.5 6 7 0q3.5 6 7 0" fill="none" stroke={INK} stroke-width="3.2" stroke-linecap="round" />
    {/if}
  {:else if estado === 'tranquila'}
    <g class="parp">
      <ellipse cx="-27" cy="2.5" rx="9.5" ry="8" fill={INK} />
      <ellipse cx="27" cy="2.5" rx="9.5" ry="8" fill={INK} />
      <circle cx="-24" cy="0" r="3.3" fill="#fff" />
      <circle cx="30" cy="0" r="3.3" fill="#fff" />
    </g>
    <path d="M-5 11Q0 13.5 5 11" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
  {:else if estado === 'bajon'}
    <g class="parp">
      <ellipse cx="-27" cy="3" rx="9.5" ry="11" fill={INK} />
      <ellipse cx="27" cy="3" rx="9.5" ry="11" fill={INK} />
      <circle cx="-24" cy="-1" r="3.6" fill="#fff" />
      <circle cx="30" cy="-1" r="3.6" fill="#fff" />
    </g>
    <!-- cejas tristes: el extremo interno queda más alto (al revés se leen enojadas) -->
    <g stroke={INK} stroke-width="3.6" stroke-linecap="round">
      <path d="M-38 -12L-19 -20" />
      <path d="M38 -12L19 -20" />
    </g>
    <path d="M-7 16Q0 8.5 7 16" fill="none" stroke={INK} stroke-width="3.2" stroke-linecap="round" />
    <path class="lagrima" d="M-37 14Q-41 20 -37 23Q-33 20 -37 14Z" fill="#9fd7ff" />
  {:else if estado === 'hambrienta'}
    <g class="parp">
      <ellipse cx="-27" cy="0" rx="11" ry="13.5" fill={INK} />
      <ellipse cx="27" cy="0" rx="11" ry="13.5" fill={INK} />
      <circle cx="-23.5" cy="-5.5" r="4.4" fill="#fff" />
      <circle cx="30.5" cy="-5.5" r="4.4" fill="#fff" />
      <circle cx="-31" cy="5" r="2.2" fill="#fff" />
      <circle cx="23" cy="5" r="2.2" fill="#fff" />
    </g>
    <ellipse cx="0" cy="13" rx="6" ry="8" fill={INK} />
    <ellipse cx="0" cy="17" rx="3.4" ry="3" fill="#ff8fa3" />
    <path class="baba" d="M8 19Q11 24 8 27Q5 24 8 19Z" fill="#9fd7ff" />
  {:else}
    <!-- cansada: ojos cerrados, boquita y zzz -->
    <g fill="none" stroke={INK} stroke-width="4.2" stroke-linecap="round">
      <path d="M-37 1Q-27 11 -17 1" />
      <path d="M17 1Q27 11 37 1" />
    </g>
    <path d="M-5 12q2.5 -3 5 0t5 0" fill="none" stroke={INK} stroke-width="3" stroke-linecap="round" />
    <text class="zzz" x="58" y="-34" font-size="20" font-weight="800" fill="#cbd3ff" opacity=".9">z</text>
    <text class="zzz z2" x="72" y="-52" font-size="13" font-weight="800" fill="#cbd3ff" opacity=".7">z</text>
  {/if}
</g>

<style>
  .parp {
    transform-box: fill-box;
    transform-origin: center;
    animation: parpadeo 5s infinite;
  }
  .zzz {
    animation: flota 2.6s ease-in-out infinite;
  }
  .z2 {
    animation-delay: 0.9s;
  }
  .lagrima,
  .baba {
    animation: gota 2.8s ease-in infinite;
  }
  @keyframes parpadeo {
    0%,
    92%,
    100% {
      transform: scaleY(1);
    }
    95% {
      transform: scaleY(0.08);
    }
  }
  @keyframes flota {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    50% {
      transform: translateY(-5px);
      opacity: 0.95;
    }
  }
  @keyframes gota {
    0%,
    55% {
      transform: translateY(-2px);
      opacity: 0.95;
    }
    100% {
      transform: translateY(12px);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .parp,
    .zzz,
    .lagrima,
    .baba {
      animation: none;
    }
  }
</style>
