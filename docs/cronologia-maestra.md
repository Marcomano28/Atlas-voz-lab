# Cronologia maestra de Atlas de Voces / Planeta Barrio

Este documento es la copia operativa de la cronologia general. El original
conceptual vive en Obsidian.

## Fuentes

- Commits de `planeta-barrio`.
- Commits de `atlas-voz-lab`.
- Notas de Obsidian en `02_Atlas_de_Voces_Cuba_Barrio`.
- Bitacora del 14 de mayo de 2026.

## Fase 0 - Intuicion original: A.I. Bayu

Fecha exacta no fijada por commit.

Punto de cambio:

La idea inicial era una IA con identidad, memoria y personalidad. Todavia no estaba
separada la arquitectura entre personaje, escena, voz, evaluacion y dataset.

Rol historico:

```text
origen filosofico
```

## Fase 1 - Primera vision de plataforma: La Esquina

Fecha documentada en Obsidian: marzo/abril de 2026 segun notas existentes.

Punto de cambio:

La idea toma forma de plataforma cultural cubana para diaspora:

- agentes cubanos;
- memoria;
- voz;
- sonido ambiental;
- comunidad;
- avatares;
- VR;
- corpus cubano.

Rol historico:

```text
primera maqueta de producto
```

## Fase 2 - Nacimiento del prototipo vivo: Planeta Barrio

### 2026-04-20 - Prototipo inicial

Commit:

```text
1787e35 Initial Planeta Barrio prototype
17a7d87 Add Habana scene adjustments
```

Cambio de rumbo:

La idea deja de ser solo vision y se convierte en una experiencia navegable.
Empieza el barrio como escena.

### 2026-04-21 - Personajes en escena

Commit:

```text
9a12924 Organize assets and add scene characters
```

Cambio de rumbo:

Los personajes dejan de ser solo voces abstractas y empiezan a ocupar el espacio
visual del barrio.

### 2026-04-22 - Chat con backend de personajes

Commits:

```text
cd59c09 Add barrio character chat backend
168f3b8 Tune bubble tails and chat response rhythm
b8f037b Add situated place knowledge and bubble polish
```

Cambio de rumbo:

El barrio pasa a ser conversacional. Aparece la arquitectura base:

```text
personaje + escena + conocimiento situado + burbuja
```

### 2026-04-23 - Voz por agente y preparacion visual

Commits:

```text
ed0da69 Refine manisera voice and support per-agent models
1bd9e22 Refine manisera and yanislaidis voice guards
```

Cambio de rumbo:

La personalidad empieza a separarse por agente. Se reconoce que cada personaje
necesita guardrails propios, no un prompt comun.

### 2026-04-24 - Streaming, memoria y audio ambiente

Commits:

```text
7f3df5a Stream chat replies into speech bubbles
cce90c4 Add social memory echoes
4a2ca82 Add name memory surprise replies
f1882f2 Add ambient scene audio
91cb3cb Add ambient audio files
```

Cambio de rumbo:

El chat gana vida temporal: ya no solo responde, sino que aparece en burbujas con
ritmo. La memoria entra como sorpresa social, y el ambiente sonoro empieza a
convertir la escena en lugar.

### 2026-04-25 - Verdades compartidas del barrio

Commit:

```text
5f211fc Add shared barrio truth pilot
```

Cambio de rumbo:

El barrio empieza a tener hechos compartidos. Los personajes ya no son islas: viven
en un mundo comun.

### 2026-04-26 - Memoria social distribuida

Commits:

```text
5c4d7a3 Add Irving memories across barrio voices
5234e19 Remember heard shared truth versions
31eef0f Add Mame bracelet shared truth
5efa80b Add Irving unfinished painting shared truth
19502d3 Loosen character prompt scaffolding
545e9f5 Clarify other Marta Nora local name
df92ad9 Clarify Frank machete lore
```

Cambio de rumbo:

Se fortalece la idea de barrio como red oral. Los personajes oyen, recuerdan,
repiten y deforman verdades. Aparece una forma embrionaria de chisme/memoria
social.

## Fase 3 - Entrada por voz, idioma y visitante

### 2026-05-03 - Identidad nominal de la Manisera

Commit:

```text
10f7e96 Add manisera self-name response
```

Cambio de rumbo:

Se sigue afinando que los personajes sepan contestar desde identidad propia, no
como asistentes genericos.

### 2026-05-05 - STT, idioma aleman y modo visitante

Commits clave:

```text
66f8340 Add speech-to-text input for chat
8d259af Improve mobile voice input review
385091d Add German language mode
77517a3 Document visitor experience roadmap
e9ee0cd Add visitor experience mode scaffold
3608602 Keep visitor mode internal
3abc2d6 Separate chat sessions by language
479cf78 Add Paco German language reply
bf9238a Add Paco German visitor repertoire
```

Cambio de rumbo:

El proyecto deja de ser solo texto escrito en espanol. Aparecen:

- entrada por microfono;
- posturas de visitante;
- separacion idioma/experiencia;
- Paco como primer puente serio hacia aleman.

Esta etapa abre el eje:

```text
barrio interno <-> visitante extranjero
```

## Fase 4 - Yanis como primer experimento de temperatura

### 2026-05-12 - Yanis A/B y Reina de la Acera

Commits:

```text
817098a Add Yanislaidis character variant toggle
018b485 Add Reina repertoire for Yanislaidis
12b8dd5 Add Yanislaidis approach levels
13686fd Document social memory horizon
```

Cambio de rumbo:

Yanis se convierte en el primer personaje sometido a contraste controlado:

```text
Yanis A/moderada
Yanis B/Reina de la Acera
```

Aparece la idea de temperatura como extremo propio del personaje, no como simple
intensidad.

## Fase 5 - Memoria anonima y llave del barrio

### 2026-05-13 - Nombre, oficio, SQLite, saludos y fuente del nombre

Commits:

```text
b412d37 Add anonymous profile profession memory
64ce825 Add SQLite anonymous memory store
dfdf97b Add character confidences and Yanis astilla context
ad3df35 Add character temperature greetings
b54376a Refine user name prompt dynamics
fe44ad3 Add local STT post correction
6e0ba55 Track name source for barrio recognition
```

Cambio de rumbo:

La memoria deja de ser solo recuerdo local de sesion y empieza a parecer entrada
social al barrio.

Conceptos fijados:

- nombre como llave del barrio;
- oficio como material de chucho;
- saludos de confianza;
- quien supo primero el nombre;
- otros personajes pueden reconocer al usuario;
- Yanis gana dimension de astilla y filosofia;
- STT mejora con post-correccion local.

Esta etapa formula una pieza central:

```text
usuario anonimo
  -> nombre
  -> oficio
  -> personaje que lo conocio primero
  -> trato de confianza
```

## Fase 6 - Giro Atlas de Voces y laboratorio separado

### 2026-05-14 - Aislar Yanis y crear fabrica

Commits de `atlas-voz-lab`:

```text
a766d38 Initial Atlas Voz lab
c0e9e82 Document autoresearch loop for characters
779113a Add dry loop for Yanis evaluation
e455d5e Add judge audit workflow
4ed3b21 Organize lab into departments
70c9595 Add lab master plan
```

Notas de Obsidian:

```text
02_Bitacora_2026-05-14
03_Sandbox_Yanislaidis
05_Plano_Maestro_Laboratorio
```

Cambio de rumbo:

El proyecto entiende que no basta con seguir agregando frases al producto. Hace
falta una fabrica separada:

```text
atlas-voz-lab experimenta
planeta-barrio consume solo lo aprobado
```

Nacen los departamentos:

- `core`;
- `factory`;
- `characters`;
- `datasets`;
- `scenarios`;
- `tasting-room`;
- `drama-room`;
- `casting`;
- `obsidian`.

Yanis queda como primer personaje de laboratorio con:

- variables mapeables;
- escenarios fijos;
- respuestas candidatas;
- juez seco;
- juez del juez;
- dry loop;
- auditoria.

## Lectura general de la evolucion

```text
idea de IA con identidad
  -> plataforma cultural cubana
  -> barrio conversacional
  -> personajes situados
  -> memoria social
  -> voz/microfono e idioma
  -> temperatura de personajes
  -> memoria anonima persistente
  -> laboratorio separado
  -> fabrica de voces y evaluacion
```

## Cambios de rumbo principales

1. De idea conceptual a prototipo visual: 2026-04-20.
2. De escena a conversacion con personajes: 2026-04-22.
3. De respuestas sueltas a memoria social: 2026-04-24 a 2026-04-26.
4. De texto a entrada por voz/modos/idiomas: 2026-05-05.
5. De personaje moderado a temperatura/extremo: 2026-05-12.
6. De memoria de sesion a perfil anonimo: 2026-05-13.
7. De producto unico a producto + laboratorio: 2026-05-14.

## Proximo punto cronologico esperado

El siguiente hito deberia ser:

```text
Tasting Room v0
```

Objetivo:

- revisar respuestas candidatas en UI;
- permitir juicio humano del juez;
- aprobar/revisar/rechazar sin editar JSONL a mano;
- empezar a generar dataset gold de Yanis.

