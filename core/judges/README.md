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
- `../schemas/judge-context.schema.json`: contrato del contexto que recibe un juez.

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
