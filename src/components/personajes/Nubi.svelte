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
</script>

<defs>
  <radialGradient id="nu-{uid}" cx="38%" cy="22%" r="90%">
    <stop offset="0" stop-color="#eef0ff" />
    <stop offset="1" stop-color="#9aa8ff" />
  </radialGradient>
</defs>

{#if atleta}
  <!-- arcoíris -->
  <g fill="none" stroke-width="9" stroke-linecap="round" opacity=".95">
    <path d="M2 160A98 98 0 0 1 198 160" stroke="#ff7a6b" />
    <path d="M12 160A88 88 0 0 1 188 160" stroke="#ffc15e" />
    <path d="M22 160A78 78 0 0 1 178 160" stroke="#5ef2c0" />
    <path d="M32 160A68 68 0 0 1 168 160" stroke="#8a9bff" />
  </g>
{/if}
<circle cx="58" cy="136" r="38" fill="url(#nu-{uid})" />
<circle cx="142" cy="136" r="38" fill="url(#nu-{uid})" />
<circle cx="100" cy="112" r="48" fill="url(#nu-{uid})" />
<ellipse cx="100" cy="160" rx="74" ry="30" fill="url(#nu-{uid})" />
<ellipse cx="74" cy="92" rx="16" ry="8" fill="#fff" opacity=".8" transform="rotate(-24 74 92)" />

{#if cria}
  <path d="M0-8L2.4-2.4L8 0L2.4 2.4L0 8L-2.4 2.4L-8 0L-2.4-2.4Z" transform="translate(100 50) scale(1.5)" fill="#ffc15e" />
{:else if joven}
  <!-- gorro de dormir -->
  <path d="M64 84C72 46 108 26 152 52C150 60 138 66 128 68C108 74 88 78 64 84Z" fill="#ff9d8c" />
  <ellipse cx="98" cy="80" rx="38" ry="8" fill="#fff" transform="rotate(-14 98 80)" />
  <circle cx="153" cy="52" r="10" fill="#fff" />
{:else}
  <path d="M64 84C100 72 100 72 136 84L134 96C100 86 100 86 66 96Z" fill="#5ef2c0" />
{/if}

<g transform="translate(100 142) scale({cria ? 1.08 : 1})"><Cara {estado} /></g>
