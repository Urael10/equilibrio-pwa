# Equilibrio · PWA de Fitness & Wellness (v0.6.1)

Mascota virtual (Cuernito) + puzle de planificación diaria. Enseña macronutrientes, estructura de entrenamiento
y hábitos (sueño, agua, calma) jugando. Costo cero: todo corre en el navegador.

## Comandos
| Comando | Qué hace |
|---|---|
| `npm install` | instala dependencias |
| `npm run dev` | servidor de desarrollo |
| `npm test` | tests: contenido, motor, solucionador, XP y niveles, desafíos, histórico, migración de Dexie, cierre del día y humo de renderizado de las pantallas, geometría del gráfico y racha |
| `npm run check` | tipos (svelte-check) |
| `npm run build` | PWA completa en `dist/` (Vercel o GitHub Pages; `base: './'`) |
| `npm run build:prototipo` | un único `index.html` autocontenido para aprobar la maqueta |
| `npm run icons` | regenera los íconos PWA (Pillow) con Cuernito |

## Estructura
- `src/content/` contenido en JSON: `alimentos`, `entrenamientos`, `reglas` (umbrales y textos), `mascota` (personajes, etapas, frases), `desafios` (plantillas de desafíos diarios), `niveles/nXX.json`
- `src/engine/` motor puro (sin UI): `evaluar` (macros, energía, reglas, estrellas), `mascota` (stats, evolución, compañeros),
  `grafico` (geometría del gráfico semanal), `explicar` (explicación de cierre y pistas), `plan` (colocar/quitar con validación), `solver` (solo tests),
  `progreso` (libro de XP y niveles), `desafios` (selección por fecha, métricas y acreditación), `historial` (registro diario y serie de 7 días), `util` (incluye fechas locales)
- `src/state/` store con runes de Svelte 5 y persistencia en IndexedDB (Dexie v2: `kv`, `historial`, `desafios`) con degradación segura
- `src/components/DesafiosCard.svelte` tarjeta de desafíos del día (completa en Juego, compacta en Home; celebra al cumplir uno y avisa que el XP se cobra al cerrar el día)
- `src/components/Personaje.svelte` un solo componente para los cuatro personajes (3 etapas × 6 estados, misma animación);
  `src/components/personajes/` el cuerpo de cada uno (`Cuernito`, `Mochi`, `Nubi`, `Pomelo`) y la cara compartida (`Cara`)
- `src/components/GraficoSemana.svelte` gráfico SVG propio (sin librerías) de los últimos 7 días: % de cumplimiento de proteína, carbohidratos, grasas y calorías, con la banda 85–115 %; `HistorialSemana` (resumen, racha, detalle del día elegido), `InsigniasEtapa` (una insignia por etapa de la mascota) y `PersonajesRevision` (los 4 personajes en sus 3 etapas y 6 estados)
- `src/screens` interfaz: Home, Juego, Cierre y Galería (pestañas **Historial** y **Personajes**)

## Reglas del motor
- kcal = 4·P + 4·C + 9·G (Atwater). Meta del día = meta base + extra del entrenamiento.
- Macros «cerrados»: los tres entre 85% y 115% de la meta (bordes inclusivos).
- Energía base = 100·(0,45·sueño + 0,30·agua + 0,25·calma); reserva = base − costo del entreno; sostenible si reserva ≥ 10.
- Estrellas: 1★ macros cerrados · 2★ + energía sostenible · 3★ + proteína repartida (≥15 g en 3 comidas), fibra ≥ 25 g,
  combustible antes / reparación después del entreno, y día con movimiento.
- XP total (libro único) = estrellas (mejor resultado por nivel; repetir no suma) + XP de desafíos diarios (una vez por día y desafío).
- Nivel: umbral acumulado ⌊100·(n−1)^1,5⌋ XP (nivel 2 a 100, nivel 3 a 282, nivel 6 a 1118). Etapas por nivel:
  Cría desde el nivel 1 · Joven desde el 3 (282 XP) · Atleta desde el 6 (1118 XP). Con un solo nivel jugable las estrellas
  topan en 60 XP: la evolución depende de los desafíos diarios.
- Desafíos diarios: cada fecha (hora local) elige uno de tipo macro, uno de entrenamiento y uno de hábito con una semilla
  derivada de la fecha, sin servidor. El progreso sale de la evaluación del plan; con el plan vacío no se completa nada.
  El XP se acredita al cerrar el día y solo la primera vez que se cumple cada desafío ese día.
- Histórico: al cerrar el día se guarda un registro por fecha (macros, kcal, % de cumplimiento, estrellas, XP). Si el día
  se cierra varias veces queda el mejor intento. «Empezar de cero» también vacía el histórico.
- Estado de la mascota: hambrienta si comió menos del 60 % de las kcal; cansada si la energía final es menor a 25;
  si no, por ánimo (≥85 radiante, ≥65 contenta, ≥40 tranquila, menos bajón).

## Personajes y compañeros
Cuernito es la mascota principal. Los compañeros se desbloquean la primera vez que se cumple una regla al cerrar el día
(los logros se guardan, así que no se pierden si un día después sale peor):

| Compañero | Hábito | Se desbloquea con |
|---|---|---|
| Mochi | Nutrición | regla `macros` |
| Nubi | Sueño y calma | regla `energia` |
| Pomelo | Fruta y fibra | regla `fibra` |

Todos comparten etapa (por XP) y estados. Los personajes son diseños originales; para sumar uno: agregarlo en
`mascota.json`, crear su cuerpo en `src/components/personajes/` y registrarlo en `Personaje.svelte`.

## Agregar un nivel
1. Copiar `src/content/niveles/n01.json` a `n02.json` y cambiar hábitos, metas, comidas y despensa.
2. Importarlo en `src/content/index.ts`.
3. `npm run validar` y `npm test`: el solucionador comprueba que tenga solución de 3★ y más de un camino.

Publicación online (GitHub Pages con publicación automática o Cloudflare Pages): ver `docs/PUBLICAR.md`.
