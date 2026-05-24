# Lab roadmap — atlas-voz-lab

Hoja de ruta general del laboratorio. Estado al 2026-05-24.

Sub-roadmaps tecnicos:

- [judge-v2-roadmap.md](./judge-v2-roadmap.md) — split de cubanidad y calibracion del juez.

## Principio

El lab tiene un objetivo final: producir una Yanis creible y radiante.
**No esta decidido todavia si esa Yanis vive principalmente en pesos
(fine-tuning) o en retrieval (QMD bien curado sobre modelo base fuerte).**
Esa decision se toma con datos en la fase 4.5, no en abstracto.

Lo que si esta decidido: llegar ahi sin atajos pasa por construir antes la
**infraestructura de evaluacion**. Sin juez fiable y sin gold, ni fine-tuning
ni retrieval funcionan; ambos terminan optimizando contra ruido.

El orden de las fases 1-4 no es opinable: cada una desbloquea la siguiente.
Saltarse pasos da pipelines que parecen funcionar y fallan en produccion. A
partir de la fase 4.5, el roadmap se bifurca segun lo que mida el experimento.

## Fases

### Fase 1 — Gold tanda 1 (30 entradas)

**Estado**: en curso (tarea #11).
**Entrega**: `characters/yanislaidis/evaluations/gold.jsonl` con 30 turnos
juzgados: 15 positive sobre celdas criticas, 5 negative con failure_mode
distinto, 3 ambiguous, 7 turnos en 2 arcos.
**Tiempo**: 3 sesiones de 45 min.
**Criterio de salida**: 30 entradas con `por_que` lleno en todas.

Sin esto, la fase 2 mide contra 3 ejemplos y no significa nada.

### Fase 2 — Validar juez v1.1

**Entrega**: numero de drift por dimension contra el gold.
**Tareas**:

1. Extender `audit-judge.js` con `--mode live` para que lea reports de
   `out/yanislaidis/live-runs/` y el nuevo `gold.jsonl`.
2. Correr las 3 corridas vivas de las instrucciones de prueba.
3. Generar audit y leer drift de cubanidad en intimacy / cold_limit / flirt_play.

**Tiempo**: una tarde.
**Criterio de salida**: drift absoluto de cubanidad <= 0.6 en intimacy y
cold_limit.

**Bifurcacion**:

- Si pasa → fase 3 directo.
- Si no pasa → abrir [judge-v2](./judge-v2-roadmap.md), volver a fase 2 cuando
  v2 este listo.

### Fase 3 — Calibracion inter-juez

**Entrega**: correlacion Spearman entre dos modelos-juez sobre 20 turnos del gold.
**Tareas**:

1. Implementar `factory/tools/blind-judges.js`: corre el mismo turno por dos
   modelos distintos (ej. Claude Sonnet 4 vs GPT-4o).
2. Reporta correlacion por dimension.

**Tiempo**: una tarde.
**Criterio de salida**: Spearman >= 0.7 en cubanidad, yanisidad, limite, safety.

**Bifurcacion**:

- Si pasa → fase 4.
- Si no pasa → mas anclajes en el system prompt del juez, o aceptar que la
  dimension afectada requiere humano en el loop (no se automatiza).

### Fase 4 — Gold tanda 2 (+50, total ~80)

**Entrega**: `gold.jsonl` con 80 entradas cubriendo celdas secundarias del
espectro (estados raros, registros mixtos).
**Tiempo**: 2-3 sesiones de 45 min.
**Criterio de salida**: cada uno de los 10 dataset_states con al menos 5
entradas; cada perfil de actor con al menos 8.

### Fase 4.5 — Experimento QMD-first (bifurcacion principal)

**Tesis a probar**: para un personaje como Yanis, donde lo que importa es voz,
registro y geometria dramatica (no conocimiento factual), un retrieval bien
curado sobre un modelo base fuerte puede entregar el 70-80% de lo que daria
fine-tuning, con iteracion instantanea y coste marginal cercano a cero.

Si la tesis se sostiene, **fine-tuning baja de prioridad** y se convierte en
capa cosmetica (registro distribucional a nivel de token) sobre una base ya
buena via retrieval. Si no se sostiene, fine-tuning sigue siendo el bet
principal y las fases 6-8 se ejecutan tal cual.

**Entrega**: medicion comparada de Yanis viva en dos condiciones:

- A: Yanis del front tal cual hoy (prompt + memoria de sesion).
- B: Yanis del front conectada a QMD filtrado por estado, indexando los 80
  turnos aprobados del gold.

**Tareas**:

1. Disenar formato de los registros en QMD: contenido (yanis_response),
   metadata (estado, temperatura, actor_profile, weighted_score, judge_version,
   gold_hash). Namespace separado del de memoria de sesion.
2. Script `factory/tools/gold-to-qmd.js`: exporta gold positive aprobado a QMD
   con metadata. Re-ejecutable sin duplicar.
3. En planeta-barrio, anadir un retrieval-pass opcional en el flujo de Yanis:
   buscar 3-5 ejemplares relevantes filtrados por estado actual del reloj, y
   pasarlos al system prompt como few-shot dinamico. Feature flag para A/B.
4. Set de evaluacion: 30 inputs de usuario fijos cubriendo los estados criticos.
5. Correr A y B con el mismo set; juzgar ambos con el juez calibrado (fase 3).

**Tiempo**: 3-4 dias.

**Criterio de salida** (decision binaria):

- **QMD basta**: la condicion B mejora la condicion A por >= 1.0 punto en
  weighted score promedio sobre el set congelado, sin degradar safety ni limite.
  En ese caso, fases 6-8 se reducen a una sola LoRA chica orientada solo a
  registro cubano distribucional, no a "ser Yanis".
- **Fine-tuning sigue siendo necesario**: mejora < 0.5 punto, o degrada
  alguna dimension critica. Fases 6-8 se ejecutan como estan.
- **Zona gris** (0.5 a 1.0): hibrido. QMD entra a produccion, y fine-tuning
  se mantiene pero con dataset mas modesto (300-500 en lugar de 500-1000+).

**Por que aqui y no antes**: con menos de 80 entradas de gold, QMD es vertedero
y la prueba no significa nada. Con 80 calibradas, ya hay senal.

**Por que aqui y no despues**: gastar 1-2 meses en preparar dataset y entrenar
LoRA cuando QMD solo basta seria desperdiciar el bet. Hay que medir antes.

### Fase 5 — Mejorar user actor models

**Entrega**: actor profiles enriquecidos en `factory/batch-runs/run-user-actor-loop.py`.
**Tareas**:

1. Anadir 2-3 perfiles "trampa": el poeta que esconde insistencia, el
   sentimental que termina vulgar, el presume_astilla que se vuelve sentimental
   tras rechazo.
2. Modelar transiciones de perfil dentro de la misma sesion (estado
   emocional del actor cambia con las respuestas de Yanis).
3. Anadir variabilidad de registro: faltas de ortografia, abreviaturas,
   voz nota transcrita. Yanis debe aguantar ruido de canal.
4. Sustituir los `dry_messages` hardcodeados por generacion LLM con seed
   controlada.

**Tiempo**: 1-2 dias.
**Criterio de salida**: corridas vivas producen turnos que el juez encuentra
mas dificiles en promedio (drift y rechazos suben temporalmente; eso es buena
senal: el lab esta probando casos mas duros).

### Fase 6 — Prep de dataset entrenable

**Entrega**: `datasets/yanislaidis_sft_v1.jsonl` y `datasets/yanislaidis_dpo_v1.jsonl`.
**Tareas**:

1. Definir formato. SFT: pares `(user_msg, yanis_response)` con metadata
   (estado, temperatura, actor_profile). DPO: `(user_msg, preferred, rejected)`
   donde preferred viene del gold positive y rejected del gold negative.
2. Exportador desde gold + live-runs aprobados:
   `factory/tools/export-dataset.js`.
3. Filtros: quitar duplicados, balancear por estado, capar largo de tokens.
4. Diferentes splits por temperatura (base/media/alta) para entrenar adapters
   especializados si conviene.

**Tiempo**: 2-3 dias.
**Criterio de salida**: SFT con >= 500 ejemplos balanceados; DPO con >= 100
pares.

### Fase 7 — Primera LoRA

**Entrega**: adapter QLoRA entrenado sobre Qwen2.5-7B o Llama-3.1-8B.
**Stack recomendado**: Unsloth + Colab gratis (T4) para iterar; RunPod A6000
spot ($0.40-0.70/h) para corridas en serio.
**Tareas**:

1. Notebook de entrenamiento con QLoRA 4-bit, LoRA rank 16-32, 2-3 epochs.
2. Eval en el set congelado de 30-50 inputs.
3. Comparar contra baseline (mismo modelo solo con prompt) usando el juez.

**Tiempo**: 1 semana incluyendo iteraciones.
**Criterio de salida**: el modelo fine-tuneado supera al baseline en weighted
score promedio por al menos 0.5 puntos sobre el set congelado.

**Bifurcacion**:

- Si pasa → fase 8.
- Si la mejora es marginal (<0.3) → revisar dataset antes de cambiar receta.
  Casi siempre es problema de datos, no de hiperparametros.

### Fase 8 — DPO sobre la LoRA

**Entrega**: adapter DPO encima del SFT.
**Tareas**: DPO con el dataset de pares preferred/rejected del gold negative.
**Tiempo**: 2-3 dias.
**Criterio de salida**: tasa de rechazos del juez baja >= 30% vs solo-SFT.

## Cronograma realista

Suponiendo 5-8 horas de trabajo a la semana:

- Fase 1: 1 semana.
- Fase 2-3: 1 semana.
- Fase 4: 1 semana.
- **Fase 4.5: 1 semana** (decide el resto del cronograma).
- Fase 5: 2 semanas.
- Fase 6: 1 semana (o 3 dias si QMD basto).
- Fase 7: 1-2 semanas (o 4-5 dias si la LoRA es solo de registro).
- Fase 8: 1 semana (o se salta si solo-SFT pequeno ya basto).

**Total estimado**:

- Si fase 4.5 confirma QMD-first: 7-8 semanas hasta una Yanis viva ya buena.
- Si fase 4.5 dice que fine-tuning es necesario: 9-11 semanas hasta LoRA medible.

Sin saltos, sin atajos. Quien promete fine-tuning rapido sin gold ni juez
calibrado, miente o no ha visto el resultado. Y quien promete que solo con
retrieval se llega a todo, tampoco: la prueba esta en la fase 4.5.

## Lo que **no** esta en este roadmap (y por que)

- **Voces / TTS**: fase posterior, depende de tener Yanis textual estable
  primero.
- ~~**Tuberia gold → QMD** (planeta-barrio)~~: ahora es la fase 4.5, ya no
  esta fuera del roadmap. Se abre con gold de 80 entradas calibradas.
- **Otros personajes (Domingo, Paco, Manisera, Marta-Nora)**: el lab esta
  enfocado en Yanis como caso piloto. Cuando el pipeline funcione con ella,
  se replica para los otros. Replicar antes seria fabricar deuda x5.

## Triggers para revisar este roadmap

- Si pasas la fase 2 al primer intento → posible recortar fase 3 (juez ya
  fiable).
- Si fase 3 da Spearman <0.5 → reordenar: priorizar judge-v2 antes que crecer
  gold.
- Si en fase 7 la primera LoRA es mucho mejor de lo esperado → adelantar fase
  8 y considerar saltar a un modelo mas grande.
- Si en cualquier fase el bottleneck es tiempo humano de anotacion → meter el
  flujo de tres jueces ciegos del judge-v2-roadmap para crecer gold sin pedir
  tiempo humano upfront.

## Resumen ejecutivo

Estas en fase 1. Hay dos decisiones grandes por delante, ambas con numeros:

1. **Fin de fase 2**: juez v1.1 sigue, o arranca Judge v2 segun el sub-roadmap.
2. **Fin de fase 4.5**: Yanis vive principalmente en QMD (retrieval) o en pesos
   (fine-tuning), o hibrido. Esta decide el peso del trabajo restante.

Todo lo demas es ejecucion ordenada.
