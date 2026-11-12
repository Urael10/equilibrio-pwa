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
  const joven = $derived(etapa === 'joven');
  const atleta = $derived(etapa === 'atleta');
  const hoja = 'M0 0C-4-12 4-22 18-24C20-12 12-2 0 0Z';
  const gajos = [0, 45, 90, 135, 180, 225, 270, 315];
</script>

<defs>
  <linearGradient id="po-{uid}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#ffc15e" />
    <stop offset="1" stop-color="#ff7a6b" />
  </linearGradient>
</defs>

{#if atleta}
  <!-- mancuernas -->
  <path d="M38 132L16 108" stroke="#ff9a4d" stroke-width="13" stroke-linecap="round" />
  <path d="M162 132L184 108" stroke="#ff9a4d" stroke-width="13" stroke-linecap="round" />
  {#each [14, 186] as x (x)}
    <g transform="translate({x} 98)">
      <rect x="-15" y="-3" width="30" height="6" rx="3" fill="#cfd6e6" />
      <rect x="-19" y="-11" width="9" height="22" rx="3" fill="#5ef2c0" />
      <rect x="10" y="-11" width="9" height="22" rx="3" fill="#5ef2c0" />
    </g>
  {/each}
{:else}
  <ellipse cx="30" cy="136" rx="11" ry="15" fill="#ff9a4d" transform="rotate(24 30 136)" />
  <ellipse cx="170" cy="136" rx="11" ry="15" fill="#ff9a4d" transform="rotate(-24 170 136)" />
{/if}
<ellipse cx="80" cy="190" rx="15" ry="7" fill="#ff9a4d" />
<ellipse cx="120" cy="190" rx="15" ry="7" fill="#ff9a4d" />
<circle cx="100" cy="120" r="70" fill="url(#po-{uid})" />
<circle cx="100" cy="120" r="62" fill="#fff1d6" />
<circle cx="100" cy="120" r="56" fill="#ffb066" />
<g stroke="#fff1d6" stroke-width="4" stroke-linecap="round">
  {#each gajos as a (a)}
    <line x1="100" y1="120" x2="100" y2="66" transform="rotate({a} 100 120)" />
  {/each}
</g>
<circle cx="100" cy="124" r="42" fill="#fff1d6" />
<path d="M42 84C52 62 74 52 92 52" fill="none" stroke="#fff1d6" stroke-width="6" stroke-linecap="round" opacity=".9" />

{#if cria}
  <path d={hoja} transform="translate(100 54) rotate(-20)" fill="#5ef2c0" />
{:else if joven}
  <path d="M40 96C72 84 128 84 160 96L159 107C128 96 72 96 41 107Z" fill="#7dffd2" />
  <path d={hoja} transform="translate(100 54) rotate(-35) scale(1.1)" fill="#5ef2c0" />
  <path d={hoja} transform="translate(100 54) scale(-1.1 1) rotate(-35)" fill="#2fd6a2" />
{:else}
  <path d={hoja} transform="translate(100 54) rotate(-50) scale(1.2)" fill="#2fd6a2" />
  <path d={hoja} transform="translate(100 54) scale(-1.2 1) rotate(-50)" fill="#2fd6a2" />
  <path d={hoja} transform="translate(100 54) rotate(-8) scale(1.3)" fill="#5ef2c0" />
{/if}

<g transform="translate(100 128) scale({cria ? 0.95 : 0.9})"><Cara {estado} /></g>
