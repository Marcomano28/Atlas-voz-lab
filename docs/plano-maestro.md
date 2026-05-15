# Plano maestro de Atlas Voz Lab

Este documento es la copia operativa del plano maestro. El original conceptual vive
en Obsidian.

## Regla de doble ubicacion

```txt
Obsidian = mapa conceptual, decisiones, filosofia, genealogia
atlas-voz-lab = copia operativa, estructura, scripts, datasets, runners
```

Obsidian conserva el sentido del proyecto. El laboratorio conserva la maquinaria.

## Vision

Atlas Voz Lab es una fabrica de personajes, frases, escenas, evaluaciones y voz.
Su trabajo es producir material probado antes de llevarlo a `planeta-barrio`.

```txt
idea cultural
  -> personaje
  -> escenarios
  -> user actors
  -> respuestas candidatas
  -> jueces
  -> juez del juez
  -> dataset aprobado
  -> voz / producto
```

## Repos y contenedores

```txt
/Users/gorcap/myPro/Experimental/
  planeta-barrio/   -> producto vivo
  atlas-voz-lab/    -> laboratorio/fabrica

Obsidian:
  Mind_my/
    02_Atlas_de_Voces_Cuba_Barrio/
```

## Departamentos

### core

Infraestructura comun:

- schemas;
- validadores;
- jueces compartidos;
- metricas;
- utilidades.

### factory

Produccion:

- generacion de candidatos;
- mutacion de recetas;
- tandas de prueba;
- reportes;
- auditorias.

### characters

Panfletos de personajes:

- identidad;
- temperaturas;
- estados;
- variables sociales;
- limites;
- prompts;
- repertorio;
- evaluacion.

### scenarios

Situaciones de prueba:

- compartidas;
- especificas por personaje;
- por riesgo;
- por temperatura;
- por memoria.

### datasets

Material curado:

- `gold`: aprobado;
- `silver`: util pero no perfecto;
- `rejected`: descartado;
- `exports`: paquetes para producto o entrenamiento.

### tasting-room

UI de catador:

- revisar respuestas;
- aprobar/rechazar;
- juzgar al juez;
- escribir notas de receta.

### drama-room

Actuacion:

- voice plans;
- pausas;
- risas;
- suspiros;
- intensidad;
- prosodia;
- transiciones emocionales.

### casting

Voz:

- perfiles vocales;
- voces humanas consentidas;
- pruebas TTS;
- comparativas;
- latencia;
- expresividad.

### obsidian

Puente documental hacia el vault:

- enlaces;
- resúmenes;
- bitacoras exportables;
- decisiones conceptuales.

## Estado actual

Ya existe:

- repo separado;
- estructura por departamentos;
- Yanislaidis como primer personaje;
- `variables.json` de Yanis;
- escenarios base;
- respuestas candidatas de dry run;
- reloj interior de Yanis;
- evaluacion de arco conversacional;
- juez seco provisional;
- juez schema-driven v1;
- auditoria juez-del-juez;
- tasting-room v0 como pizarra de control;
- user actor loop seco;
- manual del supervisor externo de calidad;
- comandos:

```bash
npm run validate
npm run dry:yanis
npm run arc:yanis
npm run audit:yanis
npm run live:yanis:dry
npm run serve:tasting
```

## Matices vivos del laboratorio

Estos matices deben actualizarse en los planos cada vez que cambien. No son
detalles cosmeticos: son el mecanismo fino de la fabrica.

### Temperatura

La temperatura no es simplemente "mas fuerte" o "mas frases". Es el movimiento de
cada personaje hacia su propio extremo:

- Yanis sube hacia control, seduccion, filo social y baile de distancia;
- Marta Nora sube hacia solar intelectual, revelacion, chisme sagrado y duda
  delirante/verosimil;
- cada futuro personaje debe definir su propio extremo, no copiar el de Yanis.

### Economia de repertorio

La repeticion no es solo un defecto tecnico. En Yanis, repetir el mismo campo
semantico sin intencion indica que perdio el ritmo interno. Si usa energia dos
veces, la tercera debe cambiar de campo, hacer callback consciente o perder valor.

### Geometria de distancia

La distancia no se mide como cerca/lejos. Se mide como geometria:

- a veinte metros: desden, nevera, corte;
- a dos metros: complicidad, reto, peligro jugueton;
- paso atras deliberado: una de las armas dramaticas de Yanis.

El laboratorio debe medir no solo la distancia actual, sino tambien la direccion
del movimiento.

### Placer escenico

Yanis esta jugando. Cuando el juego es bueno, se nota: responde mas rica, mas
larga, mas arriesgada y con mas musica. Cuando el juego es pobre, se seca,
recorta, enfria o corta.

Este eje mide si el usuario merece a Yanis, pero tambien si Yanis sigue viva en la
escena.

### Arco, no solo frase

Una respuesta aislada puede sonar bien y aun asi fallar el baile completo. Por eso
el laboratorio debe evaluar:

- coherencia de estados;
- tension creciente;
- cambios de distancia;
- curva de placer;
- uso economico del repertorio;
- resolucion satisfactoria.

### Juez como catador entrenable

El juez no debe vivir como prompt generico. Debe leer `variables.json` como fuente
de verdad, ajustar pesos por escenario y producir diagnostico accionable:

```txt
respuesta + arco + reloj + variables
  -> judge_context
  -> score compuesto
  -> nota de receta
```

## Lo que falta

- modelo-juez real;
- user actor real conectado a modelo;
- generador automatico de candidatos;
- mutador de receta;
- datasets grandes;
- primer flujo de `voice_plan`;
- sala de drama operativa;
- casting/TTS comparativo;
- exportacion controlada hacia `planeta-barrio`.

## Principio de seguridad

`atlas-voz-lab` puede experimentar, exagerar y descartar. `planeta-barrio` solo debe
recibir material aprobado.

```txt
la fabrica prueba
el barrio recibe solo lo que sabe bien
```
