import { catalogo, contenidoMascota, nivelPorId, plantillasDesafios } from '../content';
import { acreditar, elegirDesafios, evaluarDesafios } from '../engine/desafios';
import { evaluar } from '../engine/evaluar';
import { crearRegistro, fusionarRegistros, serieUltimosDias } from '../engine/historial';
import { explicarCierre, pistaPara, type Pista } from '../engine/explicar';
import {
  desbloqueados,
  etapaPara,
  frasePara,
  nuevosCompaneros,
  progresoEtapa,
  reglasCumplidas,
  sumarLogros,
} from '../engine/mascota';
import { colocarAuto, elegirEntreno, planVacio, quitar, sanearPlan } from '../engine/plan';
import { progresoNivel, xpLibro, xpPorMejora } from '../engine/progreso';
import { fechaLocal, sumarDias } from '../engine/util';
import type { Cierre, DesafioDia, DesafioDiario, Personaje, Plan, ReglaId, RegistroDiario } from '../types';
import { borrarHistorial, escribir, guardarDesafiosDia, guardarRegistro, leer, leerDesafiosDia, leerRegistros } from './db';

/** Días de histórico que se mantienen cargados (la galería muestra 7; el resto queda para estadísticas). */
const DIAS_HISTORIAL = 30;

export type Pantalla = 'home' | 'juego' | 'galeria';

interface Progreso {
  nombre: string;
  mejor: Record<string, number>; // mejor cantidad de estrellas por nivel
  intentos: Record<string, number>;
  logros: ReglaId[]; // reglas cumplidas alguna vez: desbloquean a los compañeros
  xpDesafios: number; // XP acumulada por desafíos diarios (las estrellas se cuentan desde `mejor`)
}

export interface Aviso {
  id: number;
  tipo: 'nota' | 'error';
  texto: string;
}

const PROGRESO_INICIAL = (): Progreso => ({
  nombre: contenidoMascota.nombreSugerido,
  mejor: {},
  intentos: {},
  logros: [],
  xpDesafios: 0,
});

class Store {
  pantalla = $state<Pantalla>('home');
  nivelId = $state('n01');
  plan = $state<Plan>(planVacio(nivelPorId('n01')!));
  progreso = $state<Progreso>(PROGRESO_INICIAL());
  seleccionada = $state<string | null>(null);
  cierre = $state<Cierre | null>(null);
  aviso = $state<Aviso | null>(null);
  pista = $state<Pista | null>(null);
  comiendo = $state(0); // contador: cada cambio dispara la animación de "comer"
  guardado = $state(true); // false si el almacenamiento local no respondió
  semilla = $state(0);
  nuevos = $state<Personaje[]>([]); // compañeros que se unieron al cerrar el día
  fecha = $state(fechaLocal()); // el «día» del jugador (hora local)
  desafiosDia = $state<DesafioDia>({ fecha: fechaLocal(), ids: [], acreditados: [] });
  desafiosNuevos = $state<DesafioDiario[]>([]); // desafíos que pagaron XP al cerrar el día
  xpCierre = $state(0); // XP que sumó el último cierre (estrellas nuevas + desafíos)
  subida = $state<{ nivelAntes: number; nivelAhora: number; etapaNueva: string | null } | null>(null);
  historial = $state<RegistroDiario[]>([]); // últimos DIAS_HISTORIAL días, de la fecha más vieja a la más nueva

  nivel = $derived(nivelPorId(this.nivelId)!);
  ev = $derived(evaluar(this.nivel, this.plan, catalogo));
  xp = $derived(xpLibro(this.progreso, catalogo.reglas));
  nivelXp = $derived(progresoNivel(this.xp));
  desafios = $derived(
    evaluarDesafios(this.desafiosDia.ids, plantillasDesafios, this.ev, catalogo.reglas, this.desafiosDia.acreditados),
  );
  semana = $derived(serieUltimosDias(this.historial, this.fecha, 7));
  etapa = $derived(etapaPara(this.xp, contenidoMascota.etapas));
  avance = $derived(progresoEtapa(this.xp, contenidoMascota.etapas));
  frase = $derived(frasePara(this.ev.mascota.estado, contenidoMascota.frases, this.semilla));
  companeros = $derived(desbloqueados(this.progreso.logros, contenidoMascota.personajes));

  #avisoId = 0;
  #temporizador: ReturnType<typeof setTimeout> | undefined;

  async iniciar() {
    const guardado = await leer<Progreso>('progreso');
    if (guardado && typeof guardado === 'object') {
      // v0.2.0 guardaba «Brío» como nombre por defecto: pasa a la mascota nueva; un nombre elegido se respeta.
      const nombre = typeof guardado.nombre === 'string' ? guardado.nombre.trim() : '';
      this.progreso = {
        nombre: nombre && nombre !== 'Brío' ? nombre : this.progreso.nombre,
        mejor: guardado.mejor ?? {},
        intentos: guardado.intentos ?? {},
        logros: Array.isArray(guardado.logros) ? guardado.logros : [],
        // v0.3.0 no tenía XP de desafíos: parte de 0.
        xpDesafios: typeof guardado.xpDesafios === 'number' && guardado.xpDesafios > 0 ? guardado.xpDesafios : 0,
      };
    }
    const borrador = await leer<Plan>(`plan:${this.nivelId}`);
    this.plan = sanearPlan(this.nivel, borrador, catalogo);
    this.semilla = Math.floor(Math.random() * 1000);
    await this.#cargarDia();
  }

  /** Desafíos de hoy (se eligen una vez por fecha y se guardan) y los últimos días de histórico. */
  async #cargarDia() {
    const hoy = fechaLocal();
    this.fecha = hoy;
    const guardado = await leerDesafiosDia(hoy);
    if (guardado && Array.isArray(guardado.ids) && Array.isArray(guardado.acreditados)) {
      this.desafiosDia = guardado;
    } else {
      this.desafiosDia = { fecha: hoy, ids: elegirDesafios(hoy, plantillasDesafios), acreditados: [] };
      void guardarDesafiosDia($state.snapshot(this.desafiosDia));
    }
    this.historial = await this.obtenerHistorialUltimosDias(DIAS_HISTORIAL);
  }

  /** Si la app quedó abierta pasada la medianoche, pasa al día nuevo (desafíos nuevos, plan limpio). */
  #revisarFecha() {
    if (fechaLocal() === this.fecha) return;
    this.plan = planVacio(this.nivel);
    this.#persistirPlan();
    void this.#cargarDia();
  }

  async obtenerHistorialUltimosDias(dias: number): Promise<RegistroDiario[]> {
    const hasta = fechaLocal();
    return leerRegistros(sumarDias(hasta, -(dias - 1)), hasta);
  }

  get tieneBorrador() {
    return this.ev.porcionesColocadas > 0 || this.plan.entreno !== 'descanso';
  }

  get bienvenida() {
    const l = contenidoMascota.bienvenida;
    return l[this.semilla % l.length];
  }

  #persistirPlan() {
    void escribir(`plan:${this.nivelId}`, $state.snapshot(this.plan));
  }
  #persistirProgreso() {
    void escribir('progreso', $state.snapshot(this.progreso));
  }

  #mostrar(tipo: Aviso['tipo'], texto: string) {
    clearTimeout(this.#temporizador);
    this.aviso = { id: ++this.#avisoId, tipo, texto };
    this.#temporizador = setTimeout(() => (this.aviso = null), 7000);
  }

  abrirNivel(id: string) {
    this.#revisarFecha();
    this.nivelId = id;
    this.plan = this.plan; // el borrador del nivel 1 ya está cargado
    this.seleccionada = this.nivel.comidas[0]?.id ?? null;
    this.cierre = null;
    this.pista = null;
    this.aviso = null;
    this.pantalla = 'juego';
    window.scrollTo({ top: 0 });
  }

  abrirGaleria() {
    this.pantalla = 'galeria';
    window.scrollTo({ top: 0 });
  }

  volverAlInicio() {
    this.#revisarFecha();
    this.cierre = null;
    this.nuevos = [];
    this.desafiosNuevos = [];
    this.subida = null;
    this.xpCierre = 0;
    this.pantalla = 'home';
    this.semilla++;
    window.scrollTo({ top: 0 });
  }

  seleccionar(comidaId: string) {
    this.seleccionada = comidaId;
  }

  elegirEntrenamiento(id: string) {
    this.plan = elegirEntreno(this.nivel, this.plan, id);
    this.pista = null;
    this.#persistirPlan();
    const e = catalogo.entrenamientos[id];
    if (e) this.#mostrar('nota', e.descripcion);
  }

  colocar(alimentoId: string) {
    const r = colocarAuto(this.nivel, this.plan, alimentoId, this.seleccionada, catalogo);
    if (!r.ok) {
      this.#mostrar('error', r.error);
      return false;
    }
    this.plan = r.plan;
    this.pista = null;
    this.comiendo++;
    this.#persistirPlan();
    const a = catalogo.alimentos[alimentoId];
    if (a) this.#mostrar('nota', `${a.nombre}: ${a.nota}`);
    if (navigator.vibrate) navigator.vibrate(8);
    return true;
  }

  quitarAlimento(id: string) {
    this.plan = quitar(this.plan, id);
    this.pista = null;
    this.#persistirPlan();
  }

  vaciar() {
    this.plan = planVacio(this.nivel);
    this.pista = null;
    this.aviso = null;
    this.#persistirPlan();
  }

  pedirPista() {
    const profundidad: 1 | 2 = this.pista && this.pista.nivel === 1 ? 2 : 1;
    this.pista = pistaPara(this.nivel, this.plan, this.ev, catalogo, profundidad);
  }

  cerrarDia() {
    // Sin #revisarFecha(): el plan que se cierra pertenece al día en que se armó, aunque haya pasado la medianoche.
    const r = catalogo.reglas;
    const cierre = explicarCierre(this.nivel, this.ev, catalogo);
    const previo = this.progreso.mejor[this.nivelId] ?? 0;
    const nivelAntes = this.nivelXp.nivel;
    const etapaAntes = this.etapa.id;
    const hoy = reglasCumplidas(cierre.items);
    this.nuevos = nuevosCompaneros(this.progreso.logros, hoy, contenidoMascota.personajes);

    // XP: estrellas nuevas (solo si mejoran el mejor del nivel) + desafíos que pagan por primera vez hoy.
    const xpEstrellas = xpPorMejora(previo, cierre.estrellas, r);
    const pago = acreditar(this.desafios, this.desafiosDia.acreditados);
    this.desafiosNuevos = pago.nuevos;
    this.desafiosDia = { ...this.desafiosDia, acreditados: pago.acreditados };
    void guardarDesafiosDia($state.snapshot(this.desafiosDia));

    this.progreso = {
      ...this.progreso,
      logros: sumarLogros(this.progreso.logros, hoy),
      mejor: { ...this.progreso.mejor, [this.nivelId]: Math.max(previo, cierre.estrellas) },
      intentos: { ...this.progreso.intentos, [this.nivelId]: (this.progreso.intentos[this.nivelId] ?? 0) + 1 },
      xpDesafios: this.progreso.xpDesafios + pago.xp,
    };
    this.#persistirProgreso();

    this.xpCierre = xpEstrellas + pago.xp;
    const nivelAhora = this.nivelXp.nivel;
    this.subida =
      nivelAhora > nivelAntes
        ? { nivelAntes, nivelAhora, etapaNueva: this.etapa.id !== etapaAntes ? this.etapa.nombre : null }
        : null;

    // Histórico: un registro por fecha; si el día se cierra varias veces, queda el mejor intento.
    const registro = crearRegistro({
      fecha: this.fecha,
      nivelId: this.nivelId,
      ev: this.ev,
      xpGanada: xpEstrellas + pago.xp,
      desafiosCompletados: this.desafios.filter((d) => d.completado).map((d) => d.id),
    });
    const fusionado = fusionarRegistros(this.historial.find((h) => h.fecha === this.fecha), registro);
    this.historial = [...this.historial.filter((h) => h.fecha !== this.fecha), fusionado].sort((a, b) =>
      a.fecha.localeCompare(b.fecha),
    );
    void guardarRegistro($state.snapshot(fusionado));

    this.cierre = cierre;
    this.aviso = null;
  }

  seguirIntentando() {
    this.cierre = null;
    window.scrollTo({ top: 0 });
  }

  renombrar(nombre: string) {
    const limpio = nombre.trim().slice(0, 14);
    if (!limpio) return;
    this.progreso = { ...this.progreso, nombre: limpio };
    this.#persistirProgreso();
  }

  nuevaPartida() {
    this.progreso = PROGRESO_INICIAL();
    this.plan = planVacio(this.nivel);
    this.historial = [];
    this.desafiosNuevos = [];
    this.#persistirProgreso();
    this.#persistirPlan();
    void borrarHistorial().then(() => this.#cargarDia());
  }
}

export const app = new Store();
