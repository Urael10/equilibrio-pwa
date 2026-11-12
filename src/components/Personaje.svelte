<script lang="ts">
  import { contenidoMascota } from '../content';
  import type { EstadoMascota, PersonajeId } from '../types';
  import Cuernito from './personajes/Cuernito.svelte';
  import Mochi from './personajes/Mochi.svelte';
  import Nubi from './personajes/Nubi.svelte';
  import Pomelo from './personajes/Pomelo.svelte';

  // Un solo componente para los cuatro personajes: mismas tres etapas, mismos seis estados,
  // misma animación. Cada personaje solo aporta su cuerpo; la cara es compartida (Cara.svelte).
  interface Props {
    id?: PersonajeId;
    estado: EstadoMascota;
    etapa?: string; // cria | joven | atleta
    tamano?: number;
    comiendo?: number; // cambia → animación de comer
    celebra?: boolean; // salto con chispas (cierre del día)
    bloqueado?: boolean; // silueta sin animar
    nombre?: string; // nombre elegido por la persona (solo la mascota principal)
  }
  let {
    id = contenidoMascota.principal,
    estado,
    etapa = 'cria',
    tamano = 200,
    comiendo = 0,
    celebra = false,
    bloqueado = false,
    nombre,
  }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);

  const CUERPOS = { cuernito: Cuernito, mochi: Mochi, nubi: Nubi, pomelo: Pomelo };
  const HALO: Record<PersonajeId, [number, number, number]> = {
    cuernito: [255, 122, 107],
    mochi: [94, 242, 192],
    nubi: [138, 155, 255],
    pomelo: [255, 193, 94],
  };
  const INTENSIDAD: Record<EstadoMascota, number> = {
    radiante: 0.55,
    contenta: 0.38,
    tranquila: 0.32,
    bajon: 0.24,
    hambrienta: 0.34,
    cansada: 0.2,
  };
  const ESCALA: Record<string, number> = { cria: 0.8, joven: 0.9, atleta: 1 };

  const Cuerpo = $derived(CUERPOS[id]);
  const info = $derived(contenidoMascota.personajes.find((p) => p.id === id)!);
  const etapaInfo = $derived(contenidoMascota.etapas.find((e) => e.id === etapa));
  const [r, g, b] = $derived(HALO[id]);
  const escala = $derived(ESCALA[etapa] ?? 1);
  const brilla = $derived(estado === 'radiante' || celebra);

  const etiqueta = $derived(
    bloqueado
      ? `${info.nombre}, bloqueado`
      : `${nombre ?? info.nombre}, ${etapaInfo?.nombre ?? etapa}, ${contenidoMascota.estadosTexto[info.genero][estado]}`,
  );

  // El contador cambia → reiniciamos la animación cambiando la clase.
  let ultimoComer = 0;
  let come = $state(false);
  $effect(() => {
    if (comiendo !== ultimoComer) {
      ultimoComer = comiendo;
      come = false;
      requestAnimationFrame(() => (come = true));
    }
  });
</script>

<svg
  viewBox="0 0 200 210"
  width={tamano}
  height={tamano * 1.05}
  role="img"
  aria-label={etiqueta}
  style="overflow:visible"
  class:bloqueado
>
  <defs>
    <radialGradient id="halo-{uid}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="rgba({r},{g},{b},{INTENSIDAD[estado]})" />
      <stop offset="1" stop-color="rgba(0,0,0,0)" />
    </radialGradient>
  </defs>

  {#if !bloqueado}
    <ellipse class="halo" cx="100" cy="124" rx="104" ry="94" fill="url(#halo-{uid})" />
  {/if}
  <ellipse cx="100" cy="197" rx="50" ry="6.5" fill="rgba(0,0,0,.45)" />

  <g class="ani m-{estado}" class:celebra class:quieto={bloqueado}>
    <g class="come-g" class:come>
      <g transform="translate(100 190) scale({escala}) translate(-100 -190)">
        <Cuerpo {etapa} {estado} {uid} />
      </g>
    </g>
  </g>

  {#if brilla && !bloqueado}
    <g class="chispas" fill="#ffd387">
      <path class="ch c1" d="M0-8L2.4-2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4-2.4Z" transform="translate(34 56)" />
      <path class="ch c2" d="M0-8L2.4-2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4-2.4Z" transform="translate(168 48) scale(.8)" fill="#fff" />
      <path class="ch c3" d="M0-8L2.4-2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4-2.4Z" transform="translate(160 98) scale(.6)" fill="#7dffd2" />
    </g>
  {/if}
</svg>

<style>
  svg.bloqueado {
    filter: brightness(0) invert(1) opacity(0.13);
  }
  .halo {
    transform-origin: 100px 124px;
    animation: pulso 4.2s ease-in-out infinite;
  }
  .ani,
  .come-g {
    transform-origin: 100px 190px;
  }
  .m-contenta {
    animation: respira 3.6s ease-in-out infinite;
  }
  .m-tranquila {
    animation: respira 5.2s ease-in-out infinite;
  }
  .m-radiante {
    animation: salto 3.4s ease-in-out infinite;
  }
  .m-bajon {
    animation: desanima 4.8s ease-in-out infinite;
    filter: saturate(0.85);
  }
  .m-hambrienta {
    animation: meneo 1.5s ease-in-out infinite;
  }
  .m-cansada {
    animation: cabecea 5.5s ease-in-out infinite;
    filter: saturate(0.7) brightness(0.9);
  }
  .celebra {
    animation: salto 2.2s ease-in-out infinite;
  }
  .quieto {
    animation: none;
  }
  .come-g.come {
    animation: come 0.55s cubic-bezier(0.3, 1.6, 0.5, 1) 1;
  }
  .ch {
    opacity: 0;
    animation: chispa 3.4s ease-out infinite;
  }
  .c2 {
    animation-delay: 0.35s;
  }
  .c3 {
    animation-delay: 0.7s;
  }
  @keyframes pulso {
    0%,
    100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.05);
    }
  }
  @keyframes respira {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.025, 0.975);
    }
  }
  @keyframes salto {
    0%,
    45%,
    100% {
      transform: scale(1, 1);
    }
    55% {
      transform: scale(1.08, 0.9);
    }
    66% {
      transform: translateY(-20px) scale(0.96, 1.07);
    }
    78% {
      transform: translateY(0) scale(1.07, 0.92);
    }
    88% {
      transform: scale(0.99, 1.02);
    }
  }
  @keyframes desanima {
    0%,
    100% {
      transform: scale(1, 1);
    }
    50% {
      transform: scale(1.02, 0.96) translateY(2px);
    }
  }
  @keyframes meneo {
    0%,
    100% {
      transform: rotate(-2deg);
    }
    50% {
      transform: rotate(2deg);
    }
  }
  @keyframes cabecea {
    0%,
    100% {
      transform: rotate(-1.5deg) scale(1, 0.98);
    }
    50% {
      transform: rotate(2.5deg) scale(1, 0.97) translateY(2px);
    }
  }
  @keyframes come {
    0% {
      transform: scale(1, 1);
    }
    30% {
      transform: scale(1.07, 0.9) translateY(4px);
    }
    60% {
      transform: scale(0.96, 1.08) translateY(-8px);
    }
    100% {
      transform: scale(1, 1);
    }
  }
  @keyframes chispa {
    0%,
    60% {
      opacity: 0;
      transform: translateY(8px) scale(0.5);
    }
    72% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(-20px) scale(1.1);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .halo,
    .ani,
    .come-g.come,
    .ch {
      animation: none;
    }
    .ch {
      opacity: 0;
    }
  }
</style>
