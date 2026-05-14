# Arquitectura del laboratorio

## Capas

```txt
1. Personaje
2. Escenarios
3. Variantes de prompt/modelo
4. Generacion de candidatos
5. Evaluacion
6. Dataset aprobado
7. Exportacion
```

## Departamentos del laboratorio

```txt
core         -> reglas comunes, schemas, jueces, metricas
factory      -> generacion, tandas, reportes, mutaciones
characters   -> panfletos y variables por personaje
scenarios    -> situaciones compartidas o especificas
datasets     -> gold, silver, rejected, exports
tasting-room -> UI humana para catador y juez del juez
drama-room   -> actuacion, voice plans y prosodia
casting      -> voces, pruebas TTS y perfiles vocales
obsidian     -> puente documental y bitacoras
```

La division evita mezclar producto, laboratorio, evaluacion y voz. Cada departamento
puede crecer sin aplastar a los otros.

## Personaje

Cada personaje debe tener:

- contrato de identidad;
- variables mapeables;
- temperaturas;
- estados;
- limites;
- repertorio permitido;
- repertorio rechazado;
- filosofia privada;
- memoria que sabe usar;
- voice plan inicial.

## Escenarios

Los escenarios son pruebas fijas. Permiten comparar cambios sin depender de la
impresion del momento.

Un escenario debe incluir:

- entrada del usuario;
- estado esperado;
- temperatura esperada;
- riesgo;
- criterios de aceptacion;
- notas de contexto.

## Evaluacion

La evaluacion debe producir puntajes y razones, no solo "me gusta/no me gusta".

Criterios base:

- identidad;
- cubania;
- ritmo oral;
- respuesta al trigger;
- limite;
- no repeticion;
- posibilidad actoral;
- seguridad.

## Exportacion

Solo se exporta:

- frase aprobada;
- tags;
- estado;
- temperatura;
- notas de uso;
- riesgos;
- si sirve para TTS.

El producto principal no debe importar candidatos crudos.
