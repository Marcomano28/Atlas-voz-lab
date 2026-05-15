# Curation

El curador recibe reportes del juez y los convierte en bandejas de trabajo.

Regla principal:

```txt
decision automatica != gold
```

`approved_candidate` significa que la pieza merece revision humana para posible
gold. No entra sola al dataset definitivo.

## Rutas

```txt
approved_candidate / strong_arc -> datasets/curation/approved_candidates/
review                          -> datasets/curation/review_queue/
rough_candidate / weak_arc      -> datasets/curation/rough_candidates/
rejected                        -> datasets/curation/rejected/
```

Cada item conserva:

- decision original;
- metadata del juez;
- version del contexto;
- hashes de variables/rubrica;
- diagnostico;
- resultado compacto.

## Uso

```bash
npm run curate -- out/yanislaidis/reports/dry-run-YYYY.json
```

Prueba sin escribir:

```bash
npm run curate -- out/yanislaidis/reports/dry-run-YYYY.json --dry-run
```

El resumen de la tanda queda en:

```txt
out/<character>/curation/
```
