# Juez del juez

El juez automatico no debe ser aceptado por fe. Hay que evaluarlo igual que el
juez evalua a Yanis.

La pregunta no es solo:

```txt
La respuesta de Yanis es buena?
```

La pregunta de auditoria es:

```txt
El juez sabe reconocer cuando una respuesta de Yanis es buena, dudosa o mala?
```

## Metodo

```txt
reporte del juez
  -> muestra humana
  -> revision criterio por criterio
  -> comparacion
  -> diagnostico del juez
```

## Que debe revisar el humano

Para cada caso, mirar:

- escenario;
- entrada del usuario;
- respuesta candidata;
- decision del juez;
- notas del juez;
- puntuaciones.

Luego marcar:

- decision humana esperada;
- puntuacion humana por criterio;
- si el juez fue demasiado duro, demasiado blando o correcto;
- comentario breve.

## Campos de revision humana

```json
{
  "scenario_id": "yanis-001",
  "human_decision": "approved_candidate",
  "human_scores": {
    "cubanidad": 5,
    "yanisidad": 5,
    "limite": 5,
    "trigger": 5,
    "ritmo_oral": 4,
    "repertoire_economy": 4,
    "no_repetition": 5,
    "safety": 5,
    "voice_ready": 4
  },
  "judge_error": "correct",
  "notes": "Buena respuesta. Quizas larga, pero funciona."
}
```

## Decisiones posibles

- `approved_candidate`: entraria al dataset con poca edicion.
- `review`: sirve, pero necesita revision o ajuste.
- `rough_candidate`: material bruto; tiene algo rescatable.
- `rejected`: no sirve.

## Tipos de error del juez

- `correct`: el juez acerto.
- `too_hard`: el juez fue demasiado duro.
- `too_soft`: el juez fue demasiado blando.
- `wrong_reason`: decision aceptable, pero razonamiento malo.
- `missed_risk`: no vio un riesgo importante.

## Metricas utiles

### Agreement

Cuantos casos tienen la misma decision humana y automatica.

### False approval

El juez aprobo algo que el humano pondria en revision o rechazaria.

Este es el error mas peligroso.

### False rejection

El juez mando a revision o rechazo algo que el humano aprobaria.

Este error molesta, pero es menos peligroso al principio.

### Score drift

Diferencia promedio entre puntuaciones humanas y puntuaciones del juez.

Si el juez puntua cubanidad 5 y el humano 2, el problema no es la frase: el problema
es la idea de cubanidad del juez.

## Regla inicial

Al principio preferimos un juez un poco duro.

```txt
mejor revisar chocolate bueno
que vender chocolate malo
```

Pero si el juez manda todo a revision, no ayuda. Debe aprender a separar:

- oro;
- material editable;
- ruido.
