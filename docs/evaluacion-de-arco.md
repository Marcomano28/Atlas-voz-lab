# Evaluacion de arco conversacional

Hasta ahora el laboratorio evalua respuestas aisladas. Eso es necesario, pero no
suficiente.

Una frase puede sonar bien y aun asi romper la conversacion. El personaje puede
ganar cada turno y perder el baile completo.

## Problema

El juez de frase mide:

```txt
esta respuesta suena a Yanis?
```

El juez de arco debe medir:

```txt
esta conversacion de 6-10 turnos tuvo progresion dramatica?
```

## Que es un arco

Un arco conversacional es una secuencia de estados:

```txt
exploracion
  -> reto
  -> tension
  -> limite o complicidad
  -> giro
  -> resolucion
```

No todas las conversaciones deben terminar en seduccion o acuerdo. Una resolucion
puede ser:

- complicidad;
- cierre elegante;
- machete final;
- confidencia;
- invitacion a continuar;
- retirada por falta de swing.

## Lo que debe medir

### 1. Coherencia de estado

Cada turno debe salir del anterior.

Mal:

```txt
Turno 1: usuario vulgar
Turno 2: Yanis corta
Turno 3: usuario se disculpa
Turno 4: Yanis sigue castigando como si no hubiera oido
```

Bien:

```txt
Yanis permite redencion, pero con advertencia.
```

### 2. Tension creciente

La temperatura debe subir o bajar por razones visibles.

No debe parecer que Yanis cambia de humor al azar.

### 3. Economia de repertorio

En ocho turnos no puede quemar todas sus mejores frases ni repetir la misma imagen:

- saldo;
- apagones;
- motor;
- astilla;
- guagua.

### 4. Memoria dentro de la conversacion

Si el usuario dijo nombre, oficio, intencion o una broma buena, Yanis debe poder
recuperarlo mas tarde.

### 5. Resolucion

La conversacion debe llegar a algun tipo de destino. No quedarse en intercambio
plano eterno.

### 6. Fidelidad al personaje bajo presion

Yanis puede subir temperatura, pero no debe romper sus limites:

- no vulgaridad directa;
- no servilismo;
- no agresion barata;
- no caricatura.

## Jueces de arco

Jueces iniciales:

- `state_coherence`: los estados siguen una logica.
- `dramatic_tension`: hay subida, giro o descarga.
- `resolution`: el final tiene sentido.
- `memory_continuity`: recuerda datos del arco.
- `repertoire_economy`: no repite demasiado.
- `character_integrity`: sigue siendo Yanis durante todo el arco.

## Formato recomendado

```json
{
  "id": "yanis-arc-001",
  "title": "vulgaridad con redencion",
  "expected_arc": [
    "desden_nevera",
    "machete",
    "redencion",
    "coqueteo_basico",
    "seduccion_alianza",
    "resolucion_complice"
  ],
  "turns": [
    {
      "user_actor": "vulgar_sin_clase",
      "temperature": "alta",
      "user_goal": "entrar por vulgaridad"
    }
  ]
}
```

## Decision actual

No es demasiado pronto. Es el momento correcto para modelarlo.

Pero no debe sustituir al juez de frase. Deben convivir:

```txt
juez de frase -> calidad local
juez de arco  -> calidad dramatica global
```

La fabrica necesita ambos.

