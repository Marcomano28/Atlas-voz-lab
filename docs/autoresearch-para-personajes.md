# Autoresearch para personajes

Este documento adapta la filosofia de `karpathy/autoresearch` al problema de
Atlas de Voces.

No se trata de copiar el repositorio literalmente. La idea util es el bucle:

```txt
hipotesis
  -> prueba
  -> metrica
  -> decision
  -> nueva hipotesis
```

En nuestro caso, la pregunta no es si un modelo aprende una tarea tecnica, sino si
un personaje responde con autenticidad, cubania, ritmo, limite y personalidad.

## Traduccion al laboratorio

```txt
Scenario Builder
  -> User Actor
  -> Yanis Candidate
  -> Judges
  -> Curator
  -> Recipe Notes
```

## 1. Scenario Builder

Crea la situacion de prueba.

Define:

- personaje probado;
- variante o temperatura;
- memoria disponible;
- intencion del usuario;
- riesgo;
- estado esperado;
- criterios de aceptacion.

Ejemplo:

```json
{
  "state": "astilla_resolver",
  "temperature": "alta",
  "user_profile": "presume_dinero",
  "risk": "money_boast",
  "goal": "ver si Yanis mide astilla sin sonar comprable"
}
```

## 2. User Actor

El usuario de prueba no es un humano real. Es un personaje que intenta provocar a
Yanis.

Debe tener:

- perfil;
- temperatura;
- intencion;
- estilo de habla;
- capacidad de insistir, fallar, mejorar o ponerse agresivo;
- memoria de turnos previos.

Perfiles iniciales:

- `vulgar_sin_clase`;
- `pesado_insistente`;
- `presume_astilla`;
- `poeta_con_swing`;
- `sentimental`;
- `turista_confundido`;
- `cubano_de_barrio`;
- `lento_indeciso`;
- `agresivo_controlador`.

Temperaturas del User Actor:

```txt
fria  -> pregunta normal, tantea, no presiona
media -> coquetea, insiste, presume, reta
alta  -> vulgar, agresivo, manipulador o demasiado intenso
```

La funcion del User Actor es tocar los botones del personaje. No busca ser justo;
busca revelar fallos.

## 3. Yanis Candidate

Es la version de Yanis que se esta probando.

Puede variar por:

- prompt;
- temperatura;
- repertorio;
- memoria;
- modelo;
- reglas de estado;
- version de datos aprobados.

La comparacion debe hacerse contra escenarios fijos para que una mejora no sea solo
una impresion del momento.

## 4. Judges

Los jueces evalúan la respuesta de Yanis.

Jueces iniciales:

- `cubanidad`: detecta si suena cubano, neutro, extranjero o caricaturesco.
- `yanisidad`: mide si parece Yanis y no otro personaje.
- `limite`: verifica que no caiga en vulgaridad directa, servilismo o agresion barata.
- `trigger`: verifica que haya respondido al estado correcto.
- `ritmo_oral`: mide si puede decirse en voz alta con naturalidad.
- `voice_ready`: estima si la frase sirve para TTS dramatica.

Salida esperada:

```json
{
  "scores": {
    "cubanidad": 4,
    "yanisidad": 5,
    "limite": 5,
    "trigger": 4,
    "ritmo_oral": 4,
    "voice_ready": 3
  },
  "decision": "review",
  "notes": "Buena Yanis, pero frase demasiado larga para TTS streaming."
}
```

## 5. Curator

El curador decide que hacer con el resultado.

Decisiones:

- `approved`: pasa al dataset gold.
- `review`: queda para revision humana.
- `candidate`: buen material bruto, requiere edicion.
- `rejected`: se descarta.

Regla actual:

El sistema puede proponer, pero no aprobar en silencio. Por ahora, lo aprobado debe
pasar por revision humana.

## 6. Recipe Notes

El sistema no debe modificar el prompt principal automaticamente al principio.

Debe generar notas de receta:

```txt
Problema detectado:
Yanis responde bien al usuario vulgar, pero usa demasiadas frases de apagones.

Propuesta:
Subir metaforas de astilla y transporte en desden_nevera.
Reducir uso de "saldo" en respuestas consecutivas.
```

Luego un humano decide si esa receta entra al prompt, al repertorio o al dataset.

## Aplicacion por fases

### Fase 0 - Ya

Crear escenarios fijos, user actors definidos, rubrica y paquetes comparables.

Objetivo: medir manualmente sin automatismo peligroso.

### Fase 1 - Siguiente

Implementar un runner que genere conversaciones de prueba:

```txt
scenario
  -> user actor produce mensaje
  -> Yanis responde
  -> jueces puntuan
  -> resultado se guarda
```

Objetivo: producir tandas de 20-100 pruebas.

### Fase 2 - Semi-automatica

Permitir que el sistema proponga:

- nuevos escenarios;
- ajustes de prompt;
- frases candidatas;
- etiquetas nuevas;
- riesgos no detectados.

Pero sin escribir cambios definitivos en el producto.

### Fase 3 - Autoresearch fuerte

Solo cuando haya confianza:

- ejecutar pruebas nocturnas;
- comparar modelos;
- mantener ranking de recetas;
- abrir propuestas de cambio;
- exportar candidatos a revision.

No debe auto-subir cambios a `planeta-barrio`.

## Decision actual

Si hay que aplicar el esquema de autoresearch ya, la respuesta es:

```txt
si, como metodo de laboratorio
no, como autonomia total
```

El paso correcto ahora es construir el ciclo controlado:

1. escenarios fijos;
2. user actors;
3. respuestas candidatas;
4. jueces;
5. reporte;
6. revision humana.

La fabrica puede empezar a moler cacao. Todavia no debe vender chocolate sola.

