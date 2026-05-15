# Evolucion del juez

El juez no puede quedarse como un prompt generico. Debe evolucionar hasta ser un
catador entrenado con el ADN de cada personaje.

## Cambio de modelo mental

```txt
juez generico actual          juez real necesario
---------------------        ------------------------------
texto plano en prompt    ->   variables.json como fuente de verdad
pesos fijos              ->   judge_weights dinamicos por escenario
evalua respuesta sola    ->   respuesta + arco + reloj juntos
score unico              ->   score compuesto + diagnostico accionable
sin memoria de sesion    ->   detecta patrones across turnos
sin gold humano          ->   calibrado contra semillas gold
sin auditoria            ->   juez-del-juez permanente
```

## Fuente de verdad

El juez debe leer:

```txt
characters/yanislaidis/variables.json
```

Ese archivo contiene:

- temperaturas;
- estados;
- ejes sociales;
- limites;
- contrapesos;
- pesos del juez.

La rubrica explica el criterio, pero `variables.json` define el ADN operativo.

## Judge Context

Todo juez debe recibir un paquete estandar:

```txt
variables.json
rubrica_yanis.md
scenario / arc
candidate_response
clock_snapshot
history
scores preliminares
        |
        v
judge_context
```

El archivo que lo construye:

```txt
core/judges/build_judge_context.js
```

El contrato:

```txt
core/schemas/judge-context.schema.json
```

## Diagnostico accionable

El juez no debe decir solo:

```txt
score 7.4
```

Debe decir:

```json
{
  "main_failure": "distancia plana",
  "recipe_note": "forzar step_back en turno 4",
  "risk": "Yanis responde bonito pero no baila"
}
```

## Estado actual

### Hecho

- `dry-loop` construye `judge_context` por respuesta.
- `arc-loop` construye `judge_context` por arco.
- Los pesos salen de `variables.json`.
- El runner Python usa `judge_weights` reales para el dry score.
- El contexto incluye distancia, placer y economia de repertorio.

### Pendiente

- Que el modelo-juez live consuma exactamente el `judge_context` completo.
- Que el Tasting Room muestre diagnostico accionable.
- Que las semillas gold calibren pesos y decisiones.
- Que el juez detecte patrones across turnos con mas detalle.

## Regla de seguridad

El juez no decide solo. El supervisor audita.

```txt
juez propone
supervisor calibra
gold corrige la receta
```
