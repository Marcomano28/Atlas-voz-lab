# Tasting Room

Departamento futuro para la UI de catador.

Aqui el humano revisa:

- metadata de trazabilidad;
- frases candidatas;
- decisiones del juez;
- falsos aprobados;
- falsos rechazos;
- notas de receta;
- aprobacion o rechazo hacia dataset gold.

Pregunta central:

```txt
Esto sabe a barrio de verdad o solo tiene azucar por arriba?
```

## v0

Primera pizarra de control local:

- debe mostrar `judge_version` y hashes antes de aprobar gold;
- carga reportes JSON;
- muestra arcos;
- muestra score del reloj;
- muestra distancia;
- muestra placer escenico;
- muestra notas del microscopio.

Abrir:

```txt
tasting-room/index.html
```

## v1 adelanto

Panel local con puesto de control y mando.

Control:

- carga demo o JSON manual;
- carga ultimo dry-run, arc-run o live-run desde `out/`;
- muestra metadata del juez, hashes, scores, reloj y notas;
- muestra conteo de colas de curacion.

Mando:

- ejecuta `dry:yanis`;
- ejecuta `arc:yanis`;
- ejecuta `live:yanis:dry`;
- cura el reporte cargado.

Arrancar con comandos:

```bash
npm run control:tasting
```

El servidor solo expone acciones cerradas. No ejecuta comandos arbitrarios.
