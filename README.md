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
docs/
scripts/
```

## Documentos guia

- [Fabrica de chocolates](docs/fabrica-de-chocolates.md)
- [Arquitectura](docs/arquitectura.md)
- [Autoresearch para personajes](docs/autoresearch-para-personajes.md)

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
```

`validate` revisa que los escenarios JSONL tengan forma correcta.

`pack:yanis` arma paquetes de prueba en `out/yanislaidis/` para comparar variantes
de prompt o modelo.
