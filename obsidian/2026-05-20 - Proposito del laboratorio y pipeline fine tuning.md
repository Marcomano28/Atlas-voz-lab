# Proposito del laboratorio y pipeline fine tuning

Fecha: 2026-05-20
Proyecto: Atlas Voz Lab
Tema: alineacion conceptual del laboratorio, dataset y fine tuning

## Resumen corto

El laboratorio no es solo un casting de modelos ni solo un depurador de frases.
Es un sistema de produccion de datasets de personaje: toma material bruto,
lo transforma en ejemplos conversacionales utiles, los evalua con un juez
calibrado, los repara si hace falta, los pasa por revision humana y finalmente
los exporta en formato apto para fine tuning.

El objetivo final es crear una receta y un dataset para que Yanislaidis sea
consistente como personaje: cubana habanera, con chucho, limite, estatus,
distancia dramatica, placer escenico y seguridad.

## Alineacion alcanzada

Estamos alineados en esta idea:

```txt
material bruto
  -> extraccion / destilado
  -> candidatos conversacionales
  -> evaluacion automatica
  -> reparacion por loop
  -> cola de revision humana
  -> dataset final para fine tuning
  -> modelo fine-tuned
  -> casting post-tuning
  -> comparacion contra modelos base y otras recetas
```

El laboratorio debe servir para producir datasets de personaje, no solo para
generar respuestas sueltas.

## Que NO es solamente

No es solamente casting de modelos.

El casting existe, pero no busca responder "que modelo habla cubano mejor" en
abstracto. Busca medir que combinacion de modelo, prompt, ejemplos, variables y
juez sostiene mejor a Yanislaidis en situaciones concretas.

No es solamente depuracion de frases.

Puede tomar tweets, TikToks, videos, transcripciones o notas crudas, pero no
para copiarlos directamente al producto. El material bruto se usa como fuente
de rasgos, ritmos, escenas, giros, tensiones sociales y posibles respuestas.

## Output real del laboratorio

El output principal no es una frase aprobada aislada. Es una receta de personaje
y un dataset trazable.

La receta incluye:

- prompts;
- variables del personaje;
- escenarios fijos;
- rubrica y juez;
- datasets aprobados;
- planes de voz;
- reportes de evaluacion;
- evidencia de por que algo funciona o falla.

El dataset final debe contener ejemplos aprobados, diversos y utiles para
entrenamiento.

## Pipeline propuesto

1. Ingesta de material bruto

Fuentes posibles: tweets, TikToks, videos, transcripciones, notas escritas,
escenas improvisadas y dialogos generados.

Cada entrada deberia guardar origen, registro, tema, riesgo, estado emocional y
posibles etiquetas de personaje.

2. Extraccion o destilado

El sistema no debe convertir todo el bruto en dataset. Primero extrae lo util:
giros, metaforas, situaciones, ritmos, limites, fallos tipicos y tension social.

3. Reelaboracion controlada

El bruto se transforma en ejemplos tipo conversacion:

```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

La respuesta no tiene que copiar el material original. Debe convertirlo en
comportamiento de Yanislaidis.

4. Evaluacion automatica

El juez mide criterios como:

- cubanidad;
- yanisidad;
- limite;
- trigger;
- ritmo oral;
- economia de repertorio;
- distancia dramatica;
- placer escenico;
- voice-ready;
- safety.

5. Reparacion por loop

Las respuestas flojas se mutan o reparan. Las peligrosas o fuera de personaje
se rechazan. Las buenas pasan a cola de revision.

6. Cata humana

La revision humana sigue siendo necesaria. El juez es una brujula, no el dueno
del personaje. La puntuacion automatica no debe reemplazar el criterio estetico
y narrativo.

7. Dataset final

Solo entran ejemplos con trazabilidad y aprobacion. El dataset debe estar listo
para fine tuning y separado por uso: train, validation y holdout/test.

8. Fine tuning

Se entrena el modelo con el dataset aprobado.

9. Casting post-tuning

El modelo fine-tuned se compara contra:

- modelo base + prompt;
- modelo fine-tuned + prompt minimo;
- modelo fine-tuned + receta completa;
- otros modelos candidatos.

10. Evaluacion final

Se usan escenarios fijos, escenarios nuevos y pruebas humanas para decidir si el
fine-tune realmente mejora la voz o solo aprende tics del dataset.

## Riesgos importantes

Separar entrenamiento de evaluacion.

No se deben usar los mismos escenarios para crear el dataset y para evaluar el
modelo final. Hace falta separar:

- train;
- validation;
- holdout/test.

Evitar sobreoptimizar para el juez.

Si el loop solo maximiza puntuacion, el modelo puede aprender a complacer al
juez en vez de sonar vivo.

Evitar monocultivo de frases.

Si el sistema premia siempre "saldo", "motor", "acera" o "sombrita", el modelo
terminara repetitivo. Hay que medir variedad semantica.

Mantener trazabilidad.

Cada ejemplo deberia guardar origen, version de prompt, version del juez,
variables, puntuacion, decision y revision humana.

Cuidar licencias y privacidad.

El material de redes o videos deberia usarse con cuidado, preferiblemente como
inspiracion transformada y no como copia literal si se va a entrenar un modelo.

## Cambios tecnicos hechos en esta sesion

Se reviso el archivo pendiente:

```txt
factory/recipe-mutation/optimize_recipe.py
```

Hallazgo principal: el script trataba el `weighted_score` como escala 1-5, pero
el juez central lo devuelve en escala 0-10.

Correcciones realizadas:

- `target-score` ahora usa escala 0-10;
- `failure-score` ahora usa escala 0-10;
- el default de ambos quedo en 8.0;
- el script corre en dry-run por defecto;
- Anthropic/API solo se usa si se pasa `--live`;
- la meta no se considera alcanzada solo por promedio: todos los escenarios del
  lote deben quedar como `approved_candidate`.

Comprobacion local:

```bash
python3 factory/recipe-mutation/optimize_recipe.py --iterations 1 --scenarios-limit 4
npm run validate
```

Resultado observado:

- baseline inicial: 7.42;
- el script ya no paro falsamente;
- entro al loop de mutacion;
- nueva puntuacion: 7.94;
- `npm run validate` paso con 72 registros JSONL en 6 archivos.

## Lo que falta para empezar pruebas

Falta decidir y ejecutar lo siguiente:

- anadir `factory/recipe-mutation/optimize_recipe.py` a Git;
- crear un script en `package.json`, por ejemplo `recipe:yanis:dry`;
- documentar el comando en `factory/README.md`;
- decidir si los reportes de `out/yanislaidis/recipe-reports/` seran solo
  artefactos locales o si Tasting Room los consumira;
- definir formato final de dataset para fine tuning;
- separar carpetas o manifests para train, validation y holdout/test;
- disenar la etapa de ingestion de material bruto;
- definir como se guarda la trazabilidad de cada ejemplo;
- decidir el criterio minimo de revision humana antes de que algo entre al
  dataset final.

## Proxima decision recomendada

Antes de seguir generando ejemplos, conviene definir el contrato del dataset:

- formato exacto de cada ejemplo;
- metadatos obligatorios;
- estados y riesgos permitidos;
- criterio de aprobacion;
- separacion train/validation/holdout;
- ruta de exportacion.

Sin ese contrato, el laboratorio puede producir mucho material, pero sera mas
dificil convertirlo en fine tuning limpio y comparable.
