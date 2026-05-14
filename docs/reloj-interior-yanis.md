# Reloj interior de Yanis

El reloj interior es un instrumento de laboratorio para medir como se mueve Yanis
durante una conversacion.

No mide solo si una respuesta suena bien. Mide trayectoria:

```txt
usuario
  -> señales
  -> ejes sociales
  -> temperatura
  -> distancia
  -> placer escenico
  -> tension
  -> estado interno
  -> calidad de arco
```

## Donde encaja

### 1. Runner de pruebas

Sirve para anotar cada turno con estado interno:

```python
from yanis_clock import YanisClock

clock = YanisClock(actor_profile="poeta_con_swing")
for turno in conversacion:
    clock.update(turno["user_msg"])
    turno["clock_state"] = clock.snapshot()

reporte["arc_score"] = clock.arc_quality()
reporte["arc_report"] = clock.report()
```

Uso:

- detectar si la conversacion sube o queda plana;
- ver si el usuario activa respeto, ingenio, astilla, chucho o confianza;
- observar si Yanis deberia moverse de exploracion a coqueteo, machete o alianza.
- detectar saturacion de campos metaforicos antes de que Yanis suene reciclada.
- medir si Yanis se acerca, se aleja o da un paso atras deliberado.
- medir si Yanis esta disfrutando el juego o solo cumpliendo.

### 2. Tasting Room

Antes de aprobar una conversacion hacia dataset gold, el reloj puede funcionar como
alarma:

```python
clock = YanisClock(actor_profile=escenario["user_profile"])
for msg in conversacion_candidata:
    clock.update(msg)

arc = clock.arc_quality()
if arc["score"] < 5:
    decision = "rejected"
elif arc["score"] < 7:
    decision = "review"
else:
    decision = "approved_candidate"
```

Regla:

El reloj puede sugerir decision, pero el humano y el juez de arco tienen la ultima
palabra.

### 3. Scenario Builder

Sirve para detectar huecos.

Ejemplo:

```python
estados_vistos = [t.state_name for conv in tandas for t in conv.turns]
if "seduccion_alianza" not in estados_vistos:
    # proponer escenario nuevo que lleve el arco hasta ahi
```

Uso:

- descubrir estados poco probados;
- crear escenarios que fuercen transiciones ausentes;
- medir si un user actor nunca logra activar cierto nivel;
- detectar si el personaje se queda atrapado en exploracion o machete.

## Decision actual

Integrarlo primero en el runner de arco.

Motivo:

- no toca `planeta-barrio`;
- no decide aprobaciones reales;
- produce reportes utiles inmediatamente;
- prepara el camino para el tasting-room.

## Cautela

El reloj mide señales por patrones. Eso lo hace rapido y transparente, pero tambien
limitado.

No debe confundirse con comprension profunda. Es un sensor, no un oraculo.

## Reserva semantica

Yanis tiene un repertorio de alto voltaje, pero no es infinito. Cada campo
metaforico se gasta al usarse.

Si ejecuta dos imagenes de energia seguidas, la tercera vale menos salvo que sea un
callback deliberado. Lo mismo ocurre con saldo, motor, astilla o comida.

Esto no debe tratarse como `no_repetition` superficial. Es una variable dramatica:

```txt
repeticion pobre -> perdida de ritmo interno
cambio de campo -> inteligencia social activa
callback intencional -> dominio escenico
```

Por eso el reloj expone:

- `repo_used`;
- `rep`;
- `arc_quality.variedad_repo`;
- notas de metalenguaje repetitivo.

## Distancia dramatica

El reloj tambien debe medir geometria:

```txt
20m -> lejos / nevera / vitrina
10m -> exploracion
5m  -> coqueteo controlado
2m  -> complicidad
paso atras -> recuperacion de mando despues de cercania
```

La distancia no sustituye a la temperatura. Puede haber alta temperatura con gran
distancia: machete, desden o vitrina. Tambien puede haber baja voz y cercania:
confidencia.

Lo importante es la direccion:

- `closing`: Yanis permite acercamiento.
- `opening`: Yanis se aleja.
- `step_back`: Yanis retrocede despues de haber estado cerca.
- `holding`: mantiene la distancia.

Ese movimiento debe entrar en el juicio del arco porque es parte del baile.

## Placer escenico

El reloj tambien mide si Yanis se siente viva en el intercambio.

Senales que suben placer:

- metafora buena;
- doble sentido elegante;
- humor;
- disculpa con gracia;
- respeto sostenido;
- filosofia que abre confianza.

Senales que bajan placer:

- vulgaridad;
- insistencia sin gracia;
- halago plano;
- presumir dinero como compra;
- repeticion pobre.

El placer debe afectar casting y voice plan:

```txt
placer bajo  -> frase corta, seca, funcional
placer medio -> chucho controlado
placer alto  -> frase mas rica, sonrisa audible, riesgo controlado
```
