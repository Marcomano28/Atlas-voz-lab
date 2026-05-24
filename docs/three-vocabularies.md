# Tres vocabularios — propuesta de unificacion

Estado: borrador para estudiar. 2026-05-25.

Afecta a tres componentes:

- `atlas-voz-lab/` (juez, gold, datasets).
- `planeta-barrio/memory-qmd/` (tarjetas).
- `planeta-barrio/server/qmdMemory.js` (reranker en vivo).

## El problema

Hoy hay tres "idiomas" describiendo el estado emocional/social de cada turno,
y ninguno cuadra con los otros:

| Fuente | Vocabulario | Quien lo define |
| --- | --- | --- |
| Lab | `dataset_states` + `state_groups` en `characters/<char>/variables.json` | Por personaje, cerrado |
| Tarjetas QMD | campo `situacion` libre en el front matter | Cada autor de tarjeta improvisa |
| planeta-barrio | trigger families hardcodeadas en `qmdMemory.js` | Lista cerrada, ~8 familias |

El sintoma: cuando el reloj del personaje dice `confidencia_filosofica`, no
hay forma directa de pedirle a QMD "dame tarjetas para este estado". El
reranker tiene que adivinar a partir de tags libres. Y el juez no puede
juzgar alineacion entrada-salida porque no conoce el tipo de input del
usuario.

## Diagnostico

El problema NO es que tres idiomas describan lo mismo. Es que tres ejes
distintos llevan nombres parecidos y se han ido mezclando.

Los tres ejes son:

1. **Estado del personaje**: como esta respondiendo el personaje en este turno.
   Es lado-salida. Cada personaje tiene su propio set (Yanis 10, Paco distinto).
2. **Trigger del usuario**: que acaba de hacer el usuario para provocar este
   turno. Es lado-entrada. Character-agnostic.
3. **Acercamiento social**: que grado de cercania/respeto ha ganado el usuario
   acumulativamente. Character-agnostic. Modula que tipo de respuesta es
   apropiada.

Una tarjeta de Yanis cortando una vulgaridad tiene:

- estado = `machete_agresivo` (Yanis esta cortando).
- trigger = `limite_agresivo` (el usuario dijo algo vulgar).
- acercamiento_min = `invasivo_vulgar` (solo aplica cuando el usuario ya cruzo
  el limite).

Una tarjeta de confidencia tiene:

- estado = `confidencia_filosofica`.
- trigger = `confidencia` (el usuario abrio tema intimo).
- acercamiento_min = `confianza_ganada` (no usar antes de tener confianza).

Estos tres campos son ortogonales. Colapsarlos pierde informacion.

## Propuesta

Tres vocabularios canonicos, cada uno en su sitio, todos hablando entre si.

### 1. `estado` (por personaje)

- Fuente unica: `characters/<char>/variables.json` campo `state_taxonomy.dataset_states`.
- Vive donde ya vive. Sin cambios estructurales.
- Cada personaje tiene su propio set; no se comparten entre personajes.
- Yanis tiene 10 estados hoy. Paco tendra los suyos (probablemente menos),
  igual los demas. Eso esta bien.

### 2. `trigger` (compartido)

- Fuente unica nueva: `atlas-voz-lab/core/triggers.json`.
- Contenido: las 8 familias actuales de `qmdMemory.js`, formalizadas como
  schema cerrado con descripcion, senales lexicas y temperatura esperada.
- Consumido por:
  - `qmdMemory.js` (sustituye el hardcode actual).
  - El juez del lab (lo lee del turno como feature de input).
  - Los exportadores de dataset (lo guardan como metadata).

Lista inicial (la que ya existe en `qmdMemory.js`):

```
realidad_calle
insistencia
limite_agresivo
muela_superficial
seduccion_con_clase
dinero_resolver
confidencia
calor_cuerpo_ambiente
```

### 3. `acercamiento` (compartido)

- Fuente unica nueva: `atlas-voz-lab/core/acercamiento.json`.
- Contenido: los 7 grados ya descritos en
  `planeta-barrio/server/lore/memoria-eficiente-qmd.md`.
- Consumido por:
  - `qmdMemory.js` (filtro de elegibilidad en el reranker).
  - El juez del lab (lee `acercamiento` del turno; penaliza intimidad
    prematura, etc.).

Lista inicial:

```
desconocido
timido_tierno
muela_superficial
swing_respeto
confianza_ganada
invasivo_vulgar
insistente
```

## Cambios concretos por componente

### Tarjetas QMD

Front matter pierde `situacion` libre, gana tres campos enumerados:

```yaml
estado: machete_agresivo          # de dataset_states del personaje
trigger: limite_agresivo          # de core/triggers.json
acercamiento_min: invasivo_vulgar # nivel minimo elegible
```

`situacion` se puede mantener temporalmente para no romper retrieval por
texto, pero queda deprecado y desaparece en una segunda pasada.

### Lab

- `core/triggers.json` y `core/acercamiento.json` creados con los listados
  formalizados.
- `build_judge_context.js` lee el `trigger` y `acercamiento` del turno
  (vienen del reloj del personaje, no del juez) y los anade al contexto.
- El system prompt del juez gana una linea: "ALINEACION INPUT-OUTPUT: trigger
  fue X, estado de respuesta fue Y. Evalua si encajan."
- El gold extiende el front matter para incluir trigger y acercamiento
  por turno.

### planeta-barrio

- `qmdMemory.js`: las 8 trigger families dejan de estar hardcodeadas. Se
  cargan desde `core/triggers.json` (o desde una copia espejo si no se quiere
  dependencia cruzada de repos; en ese caso se versiona como tarjeta lore
  compartida).
- Reranker filtra QMD por: `estado` compatible con el del reloj + `trigger`
  compatible con el detectado + `acercamiento_min <= acercamiento_detectado`.
- El reloj del personaje activo expone el `acercamiento` actual del usuario
  como output, no solo el estado del personaje.

## Migracion

Orden propuesto:

1. **Crear los dos JSON compartidos** en `atlas-voz-lab/core/`. Formalizar
   contenido a partir de lo que ya esta en `qmdMemory.js` y
   `memoria-eficiente-qmd.md`. Tiempo: una tarde.

2. **Bajar las 81 tarjetas de Yanis del VPS al repo** con
   `pull-qmd-cards.mjs yanislaidis --force`. Ya esta listo el script.

3. **Etiquetar a mano** los tres campos nuevos en las tarjetas existentes
   (81 yanis + 38 paco/domingo/marta-nora = 119). Tiempo: una a dos tardes.
   Se puede asistir con script semi-automatico que adivine basandose en
   tags y situacion libre, y deje un campo a confirmar.

4. **Actualizar el reranker** de `qmdMemory.js` para filtrar por los tres
   campos. Mantener fallback a tags cuando alguno este vacio. Tiempo: medio
   dia.

5. **Actualizar el juez** del lab para inyectar trigger y acercamiento en
   el prompt. Tiempo: medio dia.

6. **Cerrar `situacion`**: una vez todas las tarjetas tengan estado/trigger,
   eliminar `situacion` del front matter o dejarlo como tag descriptivo no
   funcional.

## Decisiones abiertas

Cosas que valen la pena discutir antes de empezar:

**a) Donde viven los JSON compartidos.**

Opcion A: `atlas-voz-lab/core/triggers.json` (propuesta default). El lab es
fuente, planeta-barrio lo lee.

Opcion B: repo propio compartido (submodulo o paquete). Mas limpio pero anade
infraestructura.

Opcion C: duplicado consciente: una copia en cada repo, con test que verifica
que son identicos. Mas friccion pero no requiere cruzar repos.

Mi voto: A para empezar. Si la friccion aparece, migrar a C.

**b) Quien detecta `trigger` y `acercamiento` por turno.**

En vivo, lo detecta `qmdMemory.js` o el reloj de cada personaje. En el lab,
necesita un detector equivalente para que el juez vea lo mismo que veria en
produccion. Hay dos caminos:

Opcion 1: extraer la logica de deteccion a `core/detect-trigger.js` y
`core/detect-acercamiento.js`, ambos consumidos por lab y por planeta-barrio.

Opcion 2: que el lab corra el detector real del front via subprocess.

Mi voto: opcion 1. La logica es lo bastante simple como para vivir en JS puro
sin estado y se versiona en el lab como cualquier otro contrato.

**c) Granularidad del `estado` por personaje.**

Yanis tiene 10. Paco, Domingo y Marta-Nora aun no tienen `dataset_states`
explicitos en variables.json (de hecho, esos personajes ni tienen
variables.json en el lab todavia). Hay que decidirlos antes de poder
etiquetar sus tarjetas. Esto es trabajo nuevo para Paco/Domingo/Marta-Nora,
no solo migracion.

**d) Que pasa con los cantes de Paco.**

Las tarjetas `tipo: cante` con `modo_uso: literal_preferente` no encajan
limpio en `estado` (un cante es un cante, no un estado emocional). Propuesta:
las tarjetas de cante se mantienen con su propio campo `tipo: cante` y se
saltan el filtro de estado del reranker. Estado se aplica solo a tarjetas
de tipo `frase`, `chisme`, `relacion`, `humor`.

## Lo que se gana

- La fase 4.5 del roadmap (experimento QMD-first) puede medir con filtros
  reales por estado. Hoy mediria con texto libre.
- El juez puede juzgar alineacion entrada-salida, no solo calidad de salida.
- Las tarjetas QMD se vuelven datos estructurados, exportables a dataset
  entrenable con metadata coherente.
- El dataset privado de Yanis (119 ejemplos) gana dos columnas de metadata
  utiles para SFT y DPO futuros.

## Lo que se pierde

- Una tarde-dos de etiquetado manual.
- La flexibilidad de poner cualquier string en `situacion`. A cambio se gana
  consistencia.
- Compatibilidad con la version anterior del exportador. Hay que regenerar
  los datasets privados despues de la migracion.

## Riesgos

| Riesgo | Mitigacion |
| --- | --- |
| Repos cruzados (lab y planeta-barrio dependen mutuamente) | Empezar con opcion A; si la friccion aparece, migrar a duplicado consciente con test de igualdad |
| Etiquetado humano sesgado | Hacer la primera pasada de etiquetado entre dos personas y diff. Si discrepan en mas del 20% de los casos, las definiciones de trigger/acercamiento estan flojas y hay que iterar antes de seguir |
| Cambio rompe el front en produccion | Las nuevas tarjetas son aditivas (campos nuevos en front matter). El reranker sigue funcionando con tags hasta que tenga los campos. Migracion gradual, no flag-day |
| Paco/Domingo/Marta-Nora sin `dataset_states` definidos | Bloquea el etiquetado de sus tarjetas. Hay que definirlos en variables.json del lab antes |

## Resumen ejecutivo

Tres ejes distintos, tres vocabularios canonicos, una sola fuente por eje.
Trabajo de tres-cinco dias entre crear los JSON, etiquetar tarjetas y
adaptar los dos consumidores. A partir de ahi, lab y planeta-barrio hablan
el mismo idioma y la fase 4.5 del roadmap mide algo significativo.
