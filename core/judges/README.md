# Judges

Los jueces son catadores entrenables. No deben vivir como prompts sueltos dentro
de runners.

La regla actual:

```txt
variables.json
  -> build_judge_context
  -> juez heuristico o modelo-juez
  -> score + diagnostico + nota de receta
```

Cada resultado debe guardar:

```txt
metadata.judge_version
metadata.judge_context_version
metadata.variables_sha256
metadata.rubric_sha256
```

Esto permite saber, meses despues, que version del catador aprobo o rechazo una
entrada del dataset.

## Archivos

- `build_judge_context.js`: construye paquetes de juicio desde el ADN del personaje.
- `judge_context_cli.js`: puente JSON por stdin/stdout para que runners Python usen
  el mismo contexto, pesos, normalizacion de estados, decision y metadata.
- `../schemas/judge-context.schema.json`: contrato del contexto que recibe un juez.

## Regla de integracion

Los runners pueden obtener scores de una heuristica o de un modelo-juez, pero no
deben calcular por su cuenta:

- `weighted_score`;
- `decision`;
- `judge_version`;
- `judge_context_version`;
- hashes de variables/rubrica.

Eso lo produce siempre `build_judge_context.js` a traves del CLI o de import
directo en JS. Asi el loop vivo, el dry-run y los arcos usan una sola fuente de
verdad.

## Versiones

### Judge v0

Heuristico. Sirve para probar la tuberia.

### Judge v1

Schema-driven. Lee:

- `variables.json`;
- rubrica;
- escenario;
- respuesta;
- reloj;
- arco.

### Judge v2

Context-aware. Compara turnos, memoria, patrones y trayectoria.

### Judge v3

Calibrado contra gold humano y auditorias del supervisor.
