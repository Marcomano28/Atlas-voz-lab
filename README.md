# Atlas Voz Lab

Laboratorio separado de `planeta-barrio` para fabricar, probar y filtrar voces de
personajes antes de llevarlas al producto.

La regla principal:

```txt
atlas-voz-lab experimenta
planeta-barrio solo consume lo aprobado
```

Este repositorio puede generar candidatos, exagerar estilos, comparar modelos,
descartar respuestas y preparar datasets. El producto principal no debe cargar con
ese ruido.

## Objetivo

Crear una fabrica de frases, escenas, evaluaciones y planes actorales que trabaje
como una destileria:

```txt
hipotesis de personaje
  -> escenarios fijos
  -> variantes de prompt/modelo
  -> respuestas candidatas
  -> criticos automaticos
  -> revision humana
  -> dataset aprobado
  -> exportacion al producto
```

## Estructura

```txt
core/
  runners/
  judges/
  metrics/
  schemas/
factory/
  candidate-generation/
  recipe-mutation/
  batch-runs/
  reports/
characters/
  yanislaidis/
    prompts/
    scenarios/
    datasets/
      candidates/
      approved/
      rejected/
    evaluations/
      results/
    voice_plan/
scenarios/
  shared/
datasets/
  gold/
  silver/
  rejected/
  exports/
drama-room/
casting/
tasting-room/
docs/
```

## Departamentos

- `core`: utilidades, schemas, runners base, jueces y metricas compartidas.
- `factory`: produccion de candidatos, tandas, mutaciones de receta y reportes.
- `characters`: panfletos, variables y pruebas por personaje.
- `scenarios`: situaciones compartidas entre personajes.
- `datasets`: material aprobado, silver, rechazado y exportable.
- `drama-room`: actuacion, voice plans, pausas, risa, suspiro y prosodia.
- `casting`: voces base, perfiles vocales, pruebas TTS y comparativas.
- `tasting-room`: futura UI para catador humano y juez del juez.
- `obsidian`: notas puente hacia el vault de conocimiento.

## Documentos guia

- [Fabrica de chocolates](docs/fabrica-de-chocolates.md)
- [Arquitectura](docs/arquitectura.md)
- [Plano maestro](docs/plano-maestro.md)
- [Cronologia maestra](docs/cronologia-maestra.md)
- [Evaluacion de arco conversacional](docs/evaluacion-de-arco.md)
- [Reloj interior de Yanis](docs/reloj-interior-yanis.md)
- [Autoresearch para personajes](docs/autoresearch-para-personajes.md)
- [Juez del juez](docs/juez-del-juez.md)
- [Evolucion del juez](docs/evolucion-del-juez.md)
- [Manual del supervisor de calidad](docs/manual-supervisor-calidad.md)
- [Blueprint de personaje](characters/CHARACTER_BLUEPRINT.md)
- [Variables de Yanislaidis](characters/yanislaidis/variables.json)

## Primer personaje

Yanislaidis es el primer personaje de laboratorio porque ya tiene:

- temperatura media/alta;
- repertorio amplio;
- limites de vulgaridad;
- memoria de nombre/oficio;
- relacion con astilla, coqueteo, chucho y machete;
- horizonte claro hacia voz dramatica.

## Comandos iniciales

```bash
npm run validate
npm run pack:yanis
npm run dry:yanis
npm run audit:yanis
npm run arc:yanis
```

`validate` revisa que los escenarios JSONL tengan forma correcta.

`pack:yanis` arma paquetes de prueba en `out/yanislaidis/` para comparar variantes
de prompt o modelo.
