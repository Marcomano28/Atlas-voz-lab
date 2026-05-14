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

Futura UI de catador:

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
- juez seco provisional;
- auditoria juez-del-juez;
- comandos:

```bash
npm run validate
npm run dry:yanis
npm run audit:yanis
```

## Lo que falta

- UI del `tasting-room`;
- modelo-juez real;
- user actor real;
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

