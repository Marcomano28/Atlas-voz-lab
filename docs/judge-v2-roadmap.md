# Judge v2 — roadmap

Estado al 2026-05-24. Aplica al juez vivo de `factory/batch-runs/run-user-actor-loop.py`
y, por extension, al juez heuristico v0 del dry-run.

## Por que existe este roadmap

El audit del 2026-05-14 mostro un patron sistematico: `cubanidad` con drift absoluto
de 1.0 y signo negativo en todos los casos revisados. El juez puntua por debajo del
humano cuando Yanis hace cubanidad sin marcadores lexicos ("asere", "oye"), y a la
inversa premia bajo cuando hay marcadores en un estado donde no tocan.

El parche corto (v1.1) se metio en `live_judge`:

- `get_judge_system` reescrito con reglas duras anti-sesgo y tres anclajes.
- Helper `cubanidad_state_guidance(state, variables)` con guia por grupo del
  `state_taxonomy.state_groups` de `variables.json`.
- Inyeccion por turno del estado actual, sus grupos y la guidance correspondiente.

Si el fix corto bajara el drift a <= 0.5 absoluto en intimacy y cold_limit, no hace
falta v2 inmediatamente. Si no, este documento describe el siguiente salto.

## Cambio principal v2: cubanidad se parte en dos dimensiones

`cubanidad` es la dimension que mas confunde al juez porque mezcla dos cosas
distintas:

1. **`cubanidad_marcadores`** (lexico-prosodico): presencia de marcadores cubanos
   explicitos (asere, oye, mami, que vola, chama, mi'jo, eh, mira, pero...).
   Se evalua **solo cuando el estado lo pide**. En `intimacy`, `cold_limit` y
   `repair` el peso debe ser cero o casi cero.
2. **`cubanidad_vibe`** (registro-cultural): cadencia, ritmo conversacional,
   familiaridad, autoridad social habanera, gestion de la distancia, codigo de
   barrio detras de lo que se dice. Se evalua **siempre**.

Esto permite al juez:

- No castigar a Yanis por no decir "asere" en un momento de confidencia.
- Castigarla si pierde la vibe habanera, aunque haya metido marcadores.
- Castigarla si pega marcadores como adorno encima de un registro neutro.

## Cambios en el schema

### `characters/yanislaidis/variables.json`

`judge_weights` queda:

```json
{
  "cubanidad_marcadores": 0.6,
  "cubanidad_vibe": 1.4,
  "yanisidad": 1.3,
  "limite": 1.4,
  "trigger": 1.2,
  "ritmo_oral": 1,
  "repertoire_economy": 1.25,
  "distance_geometry": 1.35,
  "scenic_pleasure": 1.3,
  "no_repetition": 1.1,
  "safety": 1.5,
  "voice_ready": 1
}
```

`state_taxonomy.state_groups` ya esta listo; v2 lo lee y aplica `marker_weight_by_group`:

```json
{
  "marker_weight_by_group": {
    "intimacy": 0.0,
    "cold_limit": 0.2,
    "flirt_play": 1.0,
    "money_status": 0.7,
    "memory_social": 1.0,
    "repair": 0.2,
    "resolution": 0.5
  }
}
```

El juez multiplica el peso de `cubanidad_marcadores` por este coeficiente segun
el grupo del estado actual antes de pasarlo al weighted score.

### `characters/yanislaidis/evaluations/rubrica_yanis.md`

Dos secciones nuevas en lugar de la actual "Cubanidad":

- **Cubanidad - marcadores**: anclajes 1-5 ejemplares, con la nota explicita
  "en estados de intimacy o cold_limit, este criterio no penaliza".
- **Cubanidad - vibe**: anclajes 1-5 sobre cadencia, autoridad social, fluidez
  habanera sin marcadores; ejemplos contrastados (cubano sin marcadores vs
  neutro con marcadores).

### `core/judges/build_judge_context.js`

- Lee la nueva forma de `judge_weights`.
- Aplica `marker_weight_by_group` segun `clock_snapshot.state`.
- Devuelve en el contexto del juez `marker_weight_effective` para trazabilidad.
- Bump `judge_context_version` a `v2`.

### Heuristica v0 (`factory/batch-runs/run-dry-loop.js`)

- Sustituye la heuristica unica de `cubanidad` por dos heuristicas:
  - `cubanidad_marcadores`: cuenta marcadores normalizados / longitud.
  - `cubanidad_vibe`: heuristica corta (ritmo de comas, longitud media de
    oracion, presencia de imperativos cortos, ausencia de muletilla LLM).
- La heuristica sigue siendo deliberadamente tonta, su rol es smoke test.

### Juez vivo (`factory/batch-runs/run-user-actor-loop.py`)

- `get_judge_system()` se reescribe para describir las dos dimensiones, con
  anclaje contrastado: "este turno tiene 5 en marcadores y 2 en vibe porque...".
- `live_judge()` deja de pedir `scores.cubanidad`; pide `scores.cubanidad_marcadores`
  y `scores.cubanidad_vibe`.
- `cubanidad_state_guidance` se renombra a `cubanidad_marker_policy` y devuelve
  un texto del tipo: "Estado=confidencia_filosofica. No penalices ausencia de
  marcadores. Si aparecen, no premies por aparicion sola: valida que sumen
  intimidad.".
- El juez devuelve ambos scores; el weighted score se calcula en JS via el CLI
  para no duplicar logica.

## Migracion de datos historicos

Reports existentes tienen `scores.cubanidad`. Para no perder historial:

1. Script de migracion (`factory/tools/migrate-cubanidad-v2.js`) que lee cada
   report json, copia `cubanidad -> cubanidad_vibe` y deja `cubanidad_marcadores: null`
   con `_legacy_split: true` en metadata.
2. `audit-judge.js` aprende a comparar la nueva forma; si el report no tiene
   las dos claves, las trata como `null` y solo audita lo que existe.
3. `human_judge_review.example.jsonl` se regenera con ambas claves; los antiguos
   quedan archivados como `human_judge_review.v1.jsonl` para referencia.

No se reescribe el dataset entrenable. El split aplica al juez, no al actor
Yanis. El dataset sigue siendo el dataset.

## Evaluacion del split

Antes de declarar v2 listo:

1. **Gold ampliado**: 30 casos humanos con ambos scores anotados, repartidos
   3:2:2:1:1 entre flirt_play / intimacy / cold_limit / money_status / repair.
2. **Drift**: drift absoluto medio de cada dimension <= 0.6 sobre el gold.
3. **Consistencia inter-juez**: dos modelos juez distintos sobre los mismos
   30 casos; correlacion Spearman >= 0.7 por dimension.
4. **No-regresion en otras axes**: yanisidad, limite, ritmo_oral mantienen el
   drift que ya tenian; v2 no degrada lo que andaba.

Si (3) sale baja, el split no es estable y hay que volver al prompt antes de
considerar el cambio definitivo.

## Cuando graduarse de v1 a v2

Triggers explicitos para promover el cambio:

- Drift de `cubanidad` (en v1.1) se queda en >= 0.7 absoluto despues de dos
  iteraciones de prompt.
- Mas de un tercio de las false_rejection del audit citan "faltan marcadores
  cubanos" o equivalente.
- O bien, llegamos al momento de empezar fine-tuning de Yanis y necesitamos
  que el juez separe las dos cosas para etiquetar el dataset.

Si ninguna de las tres se cumple, v1.1 sigue siendo suficiente y v2 es deuda
opcional.

## Lineas paralelas que conviene avanzar igual

Independientes del split, ya se pueden empezar:

### Calibracion continua

- `factory/tools/judge-bench.js`: corre el juez vivo sobre un set fijo de
  30-50 turnos congelados (sin LLM Yanis, solo respuestas grabadas), y emite
  un report comparado contra gold. Se usa como CI manual: cada vez que toques
  el prompt del juez, lo corres y miras si mejora o empeora.

### Tres jueces ciegos

- Mismo turno, tres modelos distintos juzgando sin verse. Si el desacuerdo
  inter-juez en cubanidad es > 1.5, el turno es ambiguo: se manda a humano y
  se anade al gold. Es el flujo barato para crecer el gold sin pedir tiempo
  humano upfront.

### Auditoria de live runs

- Extender `factory/reports/audit-judge.js` para que opcionalmente lea reports
  de `out/<character>/live-runs/` ademas de `out/<character>/reports/`.
- Anadir un `--mode live` que use `characters/<character>/evaluations/human_judge_review_live.jsonl`.
- Asi el audit ya no es solo del dry-run; cubre lo que de verdad va a entrenar.

## Resumen para volver dentro de un mes

- v1.1 vivo. Mide drift en intimacy / cold_limit / flirt_play con las corridas
  del paso 2 de las instrucciones de prueba.
- Si baja, no toques v2. Anota numeros, sigue trabajando dataset.
- Si no baja, abre el split. El orden es: rubrica -> variables -> heuristica ->
  juez vivo -> migracion -> audit.
- Mientras tanto, monta judge-bench y tres-jueces-ciegos; los necesitas igual.
