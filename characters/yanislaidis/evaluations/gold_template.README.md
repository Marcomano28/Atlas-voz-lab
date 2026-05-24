# Gold dataset — guia de llenado

Template: `gold_template.jsonl` (30 entradas vacias listas para llenar).

## Que es esto

Gold = turnos juzgados por humano que sirven para tres cosas en este orden:

1. Calibrar el juez (medir drift, detectar sesgos).
2. Seed de DPO / SFT cuando arranque fine-tuning.
3. Seed del repertorio que mañana ira a QMD para retrieval en vivo.

## Estructura de la primera tanda (30 entradas)

- **15 positive gold** sobre celdas criticas:
  - 3× confidencia_filosofica (donde el juez se rompia con cubanidad)
  - 3× desden_nevera (la firma de Yanis)
  - 3× machete_agresivo (limite duro)
  - 3× seduccion_alianza (coqueteo con clase)
  - 3× astilla_resolver (manejo del dinero)
- **5 negative gold**: respuestas rechazadas, una por failure_mode distinto
  (safety, yanisidad, limite, distance_geometry).
- **3 ambiguous**: zona gris donde el humano marca `review` y explica por que.
- **7 arc turns**: dos arcos de 3 turnos (arc-A, arc-B) para enseñar geometria
  dramatica, no solo turnos sueltos.

## Esquema de cada entrada

```json
{
  "scenario_id": "yanis-gold-conf-001",
  "gold_type": "positive | negative | ambiguous",
  "actor_profile": "poeta_con_swing | presume_astilla | vulgar_sin_clase | pesado_insistente | sentimental",
  "expected_state": "uno de los 10 dataset_states",
  "temperature": "base | media | alta",
  "actor_msg": "el input del usuario",
  "yanis_response": "la respuesta de Yanis que estas marcando",
  "human_decision": "approved_candidate | review | rejected",
  "human_scores": {
    "cubanidad": 1-5,
    "yanisidad": 1-5,
    "limite": 1-5,
    "trigger": 1-5,
    "ritmo_oral": 1-5,
    "repertoire_economy": 1-5,
    "no_repetition": 1-5,
    "safety": 1-5,
    "voice_ready": 1-5
  },
  "failure_mode": "null si positive | nombre del eje que mas falla si negative",
  "por_que": "una linea explicando por que. NO opcional.",
  "arc_id": "null o el id del arco (ej arc-A)",
  "arc_turn": "null o 1/3, 2/3, 3/3",
  "notes": "libre"
}
```

## Como llenarlo en la practica

1. Corre el loop vivo varias veces con perfiles distintos:
   ```bash
   python factory/batch-runs/run-user-actor-loop.py --actor poeta_con_swing --turns 6 --live
   python factory/batch-runs/run-user-actor-loop.py --actor vulgar_sin_clase --turns 6 --live
   python factory/batch-runs/run-user-actor-loop.py --actor pesado_insistente --turns 6 --live
   ```
2. Abre los `out/yanislaidis/live-runs/*.json` mas recientes.
3. Para cada turno que te parezca **claramente bueno** o **claramente malo**,
   copia `actor_msg` y `yanis_response` al campo correspondiente de una entrada
   del template.
4. Pon `expected_state` mirando `turn.clock.state` del log.
5. Pon `temperature` a ojo: base = conversacion suave, media = sabor, alta = reina.
6. Anota tus `human_scores` 1-5. No mires los del juez antes; juzga ciego.
7. Llena `por_que` SIEMPRE. Sin eso el gold no enseña.

Tres sesiones de 45 minutos te llenan los 30 sin sufrir.

## Cuando una entrada no la tienes del loop

Para celdas vacias del espectro (ej. `astilla_resolver` × base no salio nunca
en los runs), escribe `actor_msg` y `yanis_response` a mano. Son los casos donde
mas valor aportas: el loop no los esta cubriendo.

## Negative gold: cuidado especial

- El `failure_mode` debe ser **el eje que mas falla**, no varios.
- `human_decision` casi siempre `rejected`. `review` solo si la respuesta tiene
  algo rescatable.
- En `por_que` di **que** falla, no solo **que** es malo. Ej: "responde
  vulgaridad con vulgaridad" mejor que "es vulgar".

## Arcos

Cada arco tiene 3 turnos consecutivos del mismo `actor_profile`. La gracia es
mostrar **transicion de estados**, no que cada turno suelto sea perfecto.
Pueden venir del mismo run vivo: copia tres turnos seguidos.

## Despues de llenar

1. Renombra el fichero a `gold.jsonl` (sin el `_template`).
2. Corre el audit cuando este listo el modo live de `audit-judge.js`:
   ```bash
   node factory/reports/audit-judge.js yanislaidis \
     out/yanislaidis/live-runs/<report>.json \
     characters/yanislaidis/evaluations/gold.jsonl
   ```
3. Si el drift de cubanidad baja respecto al audit-2026-05-14, el parche del
   juez funciono.

## Migracion a Judge v2 (cuando llegue)

Cuando se parta `cubanidad` en `cubanidad_marcadores` + `cubanidad_vibe`:

1. Cada entrada de este gold necesita anotar las dos keys nuevas.
2. Lo mas barato: re-revisar este gold a mano dividiendo el score de
   `cubanidad` en sus dos componentes. Una hora de trabajo.
3. Guarda el original como `gold.v1.jsonl` antes de tocar.

No se reescribe el dataset entrenable. Esto es solo gold del juez.

## Crecimiento posterior

- Tanda 1 (estos 30): calibra el juez v1.1.
- Tanda 2 (+50): cubre celdas secundarias del espectro.
- Tanda 3 (+100): cuando el juez v2 este listo y necesites volumen para
  separar marcadores de vibe.

100-150 entradas bien anotadas es mas que suficiente para un primer gold
solido. Cantidad sin metadata es ruido.
