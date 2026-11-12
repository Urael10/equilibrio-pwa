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
</script>

<defs>
  <radialGradient id="mo-{uid}" cx="38%" cy="28%" r="85%">
    <stop offset="0" stop-color="#ffffff" />
    <stop offset="1" stop-color="#cdf7e6" />
  </radialGradient>
</defs>

{#if atleta}
  <!-- capa -->
  <path d="M44 118C20 150 22 184 40 192L160 192C178 184 180 150 156 118Z" fill="#ff7a6b" />
  <path d="M44 118C20 150 22 184 40 192L52 192C40 176 40 150 56 122Z" fill="#e0604f" />
{/if}
<ellipse cx="76" cy="188" rx="17" ry="8" fill="#d9f5ea" />
<ellipse cx="124" cy="188" rx="17" ry="8" fill="#d9f5ea" />
<ellipse cx="26" cy="152" rx="12" ry="16" fill="url(#mo-{uid})" transform="rotate(22 26 152)" />
<ellipse cx="174" cy="152" rx="12" ry="16" fill="url(#mo-{uid})" transform="rotate(-22 174 152)" />
<path d="M100 70C150 70 172 108 172 140C172 172 144 190 100 190C56 190 28 172 28 140C28 108 50 70 100 70Z" fill="url(#mo-{uid})" />
<ellipse cx="100" cy="180" rx="54" ry="10" fill="#9fe6cb" opacity=".35" />
<ellipse cx="68" cy="94" rx="18" ry="8" fill="#fff" opacity=".85" transform="rotate(-24 68 94)" />

{#if cria}
  <!-- hojita: recién brota -->
  <path d="M100 72C94 58 102 46 118 44C122 58 114 70 100 72Z" fill="#5ef2c0" />
  <path d="M100 72C104 62 108 54 114 48" fill="none" stroke="#2bb98f" stroke-width="1.8" stroke-linecap="round" />
{:else}
  <!-- cinta -->
  <path d="M33 112C70 98 130 98 167 112L166 124C130 112 70 112 34 124Z" fill={atleta ? '#ff7a6b' : '#5ef2c0'} />
{/if}
{#if atleta}
  <!-- medalla -->
  <path d="M86 164L100 180L114 164Z" fill="#ff7a6b" />
  <circle cx="100" cy="180" r="11" fill="#ffc15e" stroke="#e39a2b" stroke-width="3" />
  <path d="M100 172l2.4 5.6 5.6 2.4-5.6 2.4-2.4 5.6-2.4-5.6-5.6-2.4 5.6-2.4z" fill="#fff" />
{/if}

<g transform="translate(100 144) scale({cria ? 1.08 : 1})"><Cara {estado} /></g>
