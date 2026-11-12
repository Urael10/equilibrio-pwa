<svelte:options namespace="svg" />

<script lang="ts">
  import type { EstadoMascota } from '../../types';
  import Cara from './Cara.svelte';

  interface Props {
    etapa: string;
    estado: EstadoMascota;
    uid: string;
  }
  let { etapa, estado, uid }: Props = $props();

  const cria = $derived(etapa === 'cria');
  const atleta = $derived(etapa === 'atleta');
  // Cría: piel clara. Joven: sudadera menta. Atleta: sudadera coral.
  const ropa = $derived(atleta ? `url(#hc-${uid})` : `url(#hm-${uid})`);
  const ropaSombra = $derived(atleta ? '#e0604f' : '#2bb98f');
</script>

<defs>
  <radialGradient id="sk-{uid}" cx="38%" cy="28%" r="85%">
    <stop offset="0" stop-color="#fff0de" />
    <stop offset="1" stop-color="#f7cba2" />
  </radialGradient>
  <linearGradient id="hm-{uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#7dffd2" />
    <stop offset="1" stop-color="#2bb98f" />
  </linearGradient>
  <linearGradient id="hc-{uid}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ff9d8c" />
    <stop offset="1" stop-color="#e0604f" />
  </linearGradient>
</defs>

{#if cria}
  <ellipse cx="80" cy="194" rx="15" ry="7" fill="#f2bd8f" />
  <ellipse cx="120" cy="194" rx="15" ry="7" fill="#f2bd8f" />
  <ellipse cx="62" cy="170" rx="11" ry="15" fill="url(#sk-{uid})" transform="rotate(24 62 170)" />
  <ellipse cx="138" cy="170" rx="11" ry="15" fill="url(#sk-{uid})" transform="rotate(-24 138 170)" />
  <ellipse cx="100" cy="172" rx="36" ry="26" fill="url(#sk-{uid})" />
  <circle cx="66" cy="54" r="11" fill="#ffc15e" />
  <circle cx="134" cy="54" r="11" fill="#ffc15e" />
  <circle cx="100" cy="108" r="62" fill="url(#sk-{uid})" />
  <ellipse cx="70" cy="70" rx="16" ry="8" fill="#fff" opacity=".7" transform="rotate(-24 70 70)" />
  <g transform="translate(100 114)"><Cara {estado} colmillo /></g>
{:else}
  <circle cx="58" cy="52" r="12" fill="#ffc15e" />
  <circle cx="142" cy="52" r="12" fill="#ffc15e" />
  <circle cx="100" cy="108" r="70" fill={ropa} />
  <ellipse cx="80" cy="194" rx="15" ry="7" fill="#f2bd8f" />
  <ellipse cx="120" cy="194" rx="15" ry="7" fill="#f2bd8f" />
  <ellipse cx="56" cy="168" rx="13" ry="18" fill={ropa} transform="rotate(24 56 168)" />
  <ellipse cx="144" cy="168" rx="13" ry="18" fill={ropa} transform="rotate(-24 144 168)" />
  <ellipse cx="100" cy="170" rx="42" ry="30" fill={ropa} />
  <path d="M80 182Q100 192 120 182L116 196L84 196Z" fill={ropaSombra} opacity=".5" />
  <g stroke="#fff" stroke-width="3" stroke-linecap="round">
    <line x1="92" y1="152" x2="90" y2="172" />
    <line x1="108" y1="152" x2="110" y2="172" />
  </g>
  <circle cx="90" cy="173" r="3" fill="#fff" />
  <circle cx="110" cy="173" r="3" fill="#fff" />
  <circle cx="100" cy="112" r="56" fill="url(#sk-{uid})" />
  <ellipse cx="72" cy="78" rx="14" ry="7" fill="#fff" opacity=".7" transform="rotate(-24 72 78)" />
  {#if atleta}
    <!-- toalla al cuello y muñequeras -->
    <path d="M60 160Q100 182 140 160" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" />
    <path d="M60 160Q100 182 140 160" fill="none" stroke="#5ef2c0" stroke-width="3" stroke-linecap="round" />
    <rect x="44" y="160" width="26" height="6" rx="3" fill="#5ef2c0" transform="rotate(24 56 168)" />
    <rect x="130" y="160" width="26" height="6" rx="3" fill="#5ef2c0" transform="rotate(-24 144 168)" />
  {/if}
  <g transform="translate(100 118)"><Cara {estado} colmillo /></g>
{/if}
