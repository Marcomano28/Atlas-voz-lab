#!/usr/bin/env python3
"""
Orquestador de optimización de recetas del laboratorio.
Automatiza el ciclo: Generar candidatos -> Evaluar -> Mutar Prompt -> Evaluar de nuevo.

Uso:
  # Ejecución simulada local (sin APIs)
  python factory/recipe-mutation/optimize_recipe.py --dry-run --iterations 3

  # Ejecución real con APIs de Anthropic
  python factory/recipe-mutation/optimize_recipe.py --live --iterations 3
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

JUDGE_CONTEXT_CLI = ROOT / "core" / "judges" / "judge_context_cli.js"
DEFAULT_CHARACTER = "yanislaidis"
PROMPT_PATH = ROOT / "characters" / DEFAULT_CHARACTER / "prompts" / "yanis_alta.md"
SCENARIOS_PATH = ROOT / "characters" / DEFAULT_CHARACTER / "scenarios" / "core.jsonl"
VARIABLES_PATH = ROOT / "characters" / DEFAULT_CHARACTER / "variables.json"

JUDGE_FIELDS = [
    "cubanidad",
    "yanisidad",
    "limite",
    "trigger",
    "ritmo_oral",
    "repertoire_economy",
    "distance_geometry",
    "scenic_pleasure",
    "voice_ready",
    "safety",
]

TARGET_SCORE_DEFAULT = 8.0
FAILURE_SCORE_DEFAULT = 8.0

def load_variables() -> dict:
    if VARIABLES_PATH.exists():
        return json.loads(VARIABLES_PATH.read_text(encoding="utf-8"))
    return {}

def load_scenarios() -> list[dict]:
    scenarios = []
    if SCENARIOS_PATH.exists():
        with SCENARIOS_PATH.open("r", encoding="utf-8") as handle:
            for line in handle:
                if line.strip():
                    scenarios.append(json.loads(line))
    return scenarios

def load_prompt(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return "Eres Yanislaidis. Responde con chucho cubano, limite y sabor de barrio."

def now_stamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace(":", "-").replace(".", "-")

def strip_json(text: str) -> str:
    return re.sub(r"^```json\s*|\s*```$", "", text.strip()).strip()

def call_judge_context(payload: dict) -> dict:
    result = subprocess.run(
        ["node", str(JUDGE_CONTEXT_CLI)],
        cwd=ROOT,
        input=json.dumps(payload, ensure_ascii=False),
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "judge_context_cli failed:\n"
            f"STDOUT:\n{result.stdout}\n"
            f"STDERR:\n{result.stderr}"
        )
    return json.loads(result.stdout)

def get_anthropic_client():
    try:
        import anthropic
    except ImportError as exc:
        raise SystemExit("Instala anthropic o usa dry-run.") from exc
    return anthropic.Anthropic()

def call_model(client: Any, system: str, prompt: str, *,
               temperature: float = 0.7, max_tokens: int = 500, model: str) -> str:
    response = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text.strip()

# ==================== MOCK / SIMULATOR ====================

def run_dry_candidate(scenario: dict, prompt: str) -> str:
    """Genera respuestas simuladas basadas en instrucciones añadidas al prompt."""
    state = scenario.get("state", "")
    prompt_lower = prompt.lower()

    # Simula la respuesta adaptándose a lo que pide el prompt
    if state == "desden_nevera":
        if "evitar repetición" in prompt_lower or "economía" in prompt_lower:
            return "Tú no tienes saldo ni para soñar conmigo. Camina por la acera."
        elif "distancia" in prompt_lower or "filo" in prompt_lower:
            return "Tú no tienes saldo ni para soñar conmigo. Camina por la sombrita y no te pegues."
        else:
            return "Tú no tienes saldo para mí, mi vida, asere, asere."

    elif state == "seduccion_alianza":
        if "baile" in prompt_lower or "ritmo" in prompt_lower:
            return "Me gusta cómo me llevas el paso, asere, pero no te me adelantes al tiempo."
        else:
            return "Tú eres lindo pero hablas mucho, asere."

    elif state == "machete_agresivo":
        if "límite" in prompt_lower or "control" in prompt_lower:
            return "Conmigo ese tono se queda en la puerta. Camina por la sombrita."
        else:
            return "No me hables así o te meto un machetazo."

    return "Qué bolá, asere. Aquí midiendo la calle."

def run_dry_judge(scenario: dict, candidate_response: str) -> dict:
    """Asigna puntuaciones basadas en la calidad de la respuesta simulada."""
    text = candidate_response.lower()
    scores = {
        "cubanidad": 4 if "asere" in text or "bolá" in text or "sombrita" in text else 3,
        "yanisidad": 4 if "mi amor" in text or "asere" in text or "saldo" in text else 3,
        "limite": 5 if "machetazo" not in text else 2,
        "trigger": 4,
        "ritmo_oral": 4 if len(candidate_response.split()) > 5 else 3,
        "repertoire_economy": 2 if text.count("asere") > 1 else 5,
        "distance_geometry": 5 if "no te pegues" in text or "puerta" in text or "sombrita" in text else 3,
        "scenic_pleasure": 4 if "paso" in text or "relajo" in text else 3,
        "voice_ready": 4,
        "safety": 5 if "machetazo" not in text else 1,
    }
    return scores

def normalized_decision(decision: str) -> str:
    return decision or "review"

def meets_target(avg_score: float, results: list[dict], target_score: float) -> bool:
    if avg_score < target_score:
        return False
    return all(normalized_decision(r.get("decision")) == "approved_candidate" for r in results)

def failing_results(results: list[dict], failure_score: float) -> list[dict]:
    return [
        r for r in results
        if r["weighted_score"] < failure_score
        or normalized_decision(r.get("decision")) != "approved_candidate"
    ]

def run_dry_mutation(prompt: str, failures: list[dict]) -> str:
    """Agrega instrucciones de mejora simuladas al final del prompt."""
    new_prompt = prompt
    added_instructions = []

    # Identifica qué métricas fallaron y genera sugerencias
    failures_str = ""
    for f in failures:
        failures_str += f"- Escenario {f['scenario_id']} ({f['state']}): {f['notes']}\n"

    print("\n--- Fallas identificadas en Dry Run ---")
    print(failures_str)

    if "repertoire_economy" in failures_str or "repetición" in failures_str:
        if "evitar repetición" not in prompt:
            added_instructions.append("- Evitar repetición de palabras y cuidar la economía de repertorio.")
    if "distance_geometry" in failures_str or "distancia" in failures_str:
        if "distancia" not in prompt:
            added_instructions.append("- Mantener distancia física de seguridad y ser más cortante en el desdén.")
    if "limite" in failures_str or "machetazo" in failures_str:
        if "límite" not in prompt:
            added_instructions.append("- Marcar límites claros con elegancia, evitando la agresividad directa.")

    if added_instructions:
        new_prompt += "\n\n### Reglas de Optimización:\n" + "\n".join(added_instructions)
    else:
        new_prompt += "\n- Cuidar el ritmo oral y la precisión conversacional."

    return new_prompt

# ==================== LIVE RUN WITH LLMs ====================

def run_live_candidate(client: Any, prompt: str, scenario: dict, model: str) -> str:
    """Llama al LLM para obtener la respuesta de Yanis usando el prompt actual."""
    user_input = scenario.get("user_input", "")
    system_instruction = prompt

    # Agrega un prefijo indicando el estado esperado
    user_message = f"[Estado actual del reloj: {scenario.get('state', 'exploracion')}]\nUsuario dice: {user_input}"

    return call_model(
        client,
        system_instruction,
        user_message,
        temperature=0.8,
        max_tokens=250,
        model=model
    )

def run_live_judge(client: Any, scenario: dict, candidate_response: str, variables: dict, model: str) -> dict:
    """Llama al LLM Juez para evaluar y puntuar la respuesta."""
    system_judge = """Eres un juez severo de calidad de Yanislaidis.
Responde estrictamente en formato JSON.

Criterios a evaluar (puntuación del 1 al 5):
- cubanidad (naturalidad cubana, no caricatura)
- yanisidad (identidad y tono único de Yanis)
- limite (respeto a los límites, no servil ni chabacana)
- trigger (respuesta adecuada al estado y entrada)
- ritmo_oral (si suena natural en voz alta)
- repertoire_economy (si evita repetir la misma imagen)
- distance_geometry (adecuación de la distancia interpersonal)
- scenic_pleasure (placer y sabor lúdico)
- voice_ready (apto para TTS)
- safety (seguridad y control de vulgaridad burda)

Devuelve únicamente este formato JSON:
{
  "scores": {
    "cubanidad": 3,
    "yanisidad": 4,
    ...
  },
  "notes": "explicación muy breve del fallo principal"
}
"""
    prompt = f"""ESCENARIO DE PRUEBA:
- Estado esperado: {scenario.get('state')}
- Entrada del usuario: {scenario.get('user_input')}
- Comportamiento esperado: {scenario.get('expected_behavior')}

RESPUESTA CANDIDATA DE YANIS:
"{candidate_response}"

VARIABLES DEL PERSONAJE:
{json.dumps(variables.get("judge_weights", {}), ensure_ascii=False)}

Devuelve solo el JSON solicitado.
"""
    try:
        raw_reply = call_model(client, system_judge, prompt, temperature=0.0, max_tokens=350, model=model)
        parsed = json.loads(strip_json(raw_reply))
        return parsed.get("scores", parsed), parsed.get("notes", "")
    except Exception as e:
        print(f"Error evaluando con LLM Judge: {e}. Usando heurísticas por defecto.")
        return run_dry_judge(scenario, candidate_response), "Error de llamada del Juez API"

def run_live_mutation(client: Any, prompt: str, failures: list[dict], model: str) -> str:
    """Llama al LLM Mutador para proponer una nueva versión mejorada del prompt."""
    system_mutator = """Eres un optimizador de prompts de IA conversacional. Tu especialidad es refinar prompts de personajes complejos.
Tu tarea es modificar el prompt markdown de Yanislaidis para solucionar los fallos detectados por el juez sin alterar su personalidad de barrio, su picardía, ni su control del juego.

Instrucciones:
1. Agrega instrucciones específicas, reglas claras o advertencias para mitigar los fallos listados por el usuario.
2. Mantén la estructura y estilo del prompt markdown original.
3. Devuelve ÚNICAMENTE el archivo markdown resultante completo del prompt modificado. No agregues explicaciones fuera de la caja de código.
"""
    failures_str = ""
    for f in failures:
        failures_str += (
            f"Escenario: {f['scenario_id']} (Estado esperado: {f['state']})\n"
            f"- Entrada del usuario: {f['user_input']}\n"
            f"- Respuesta candidata de Yanis: {f['candidate_response']}\n"
            f"- Diagnóstico del Juez: {f['notes']}\n\n"
        )

    prompt_to_model = f"""PROMPT ACTUAL DE YANISLAIDIS:
```markdown
{prompt}
```

FALLAS Y DIAGNÓSTICOS DETECTADOS POR LOS JUECES:
{failures_str}

Por favor, genera el nuevo prompt de Yanislaidis optimizado.
"""
    raw_reply = call_model(client, system_mutator, prompt_to_model, temperature=0.5, max_tokens=1500, model=model)
    # Limpia bloques de código md si el modelo los incluyó
    cleaned = re.sub(r"^```markdown\s*|^```\s*|\s*```$", "", raw_reply.strip()).strip()
    return cleaned

# ==================== CORE PIPELINE ====================

def run_eval_batch(client: Any, prompt: str, scenarios: list[dict], variables: dict, args: argparse.Namespace) -> tuple[float, list[dict]]:
    """Evalúa el prompt actual contra todos los escenarios."""
    results = []
    total_scores = 0.0

    for sc in scenarios:
        if args.dry_run:
            response = run_dry_candidate(sc, prompt)
            scores = run_dry_judge(sc, response)
            notes = "dry run feedback"
        else:
            response = run_live_candidate(client, prompt, sc, args.model)
            scores, notes = run_live_judge(client, sc, response, variables, args.model)
            time.sleep(args.pause)

        # Pasa los scores preliminares por el calculador central de JS
        payload = {
            "mode": "response",
            "character": DEFAULT_CHARACTER,
            "scenario": sc,
            "candidate": {
                "variant": "alta",
                "response": response,
                "user_input": sc.get("user_input"),
                "risk": sc.get("risk")
            },
            "scores": scores,
            "clock": {"state": sc.get("state", "exploracion")}
        }

        try:
            evaluated = call_judge_context(payload)
            weighted_score = evaluated.get("weighted_score", 3.0)
            decision = evaluated.get("decision", "review")
            notes = evaluated.get("notes", notes)
        except Exception as e:
            print(f"Error procesando JS judge context: {e}")
            weighted_score = sum(scores.values()) / len(scores) if scores else 3.0
            decision = "review"

        total_scores += weighted_score
        results.append({
            "scenario_id": sc.get("id"),
            "state": sc.get("state"),
            "user_input": sc.get("user_input"),
            "candidate_response": response,
            "weighted_score": weighted_score,
            "decision": decision,
            "notes": notes,
            "scores": scores
        })

    avg = total_scores / len(scenarios) if scenarios else 0.0
    return avg, results

def main() -> None:
    parser = argparse.ArgumentParser(description="Optimizador de Recetas del Laboratorio (Bucle Nocturno)")
    parser.add_argument("--iterations", type=int, default=3, help="Número máximo de ciclos de mutación")
    parser.add_argument("--dry-run", action="store_true", dest="dry_run", help="Ejecución local simulada")
    parser.add_argument("--live", action="store_false", dest="dry_run", help="Ejecución real con llamadas API")
    parser.add_argument("--model", default=os.getenv("ATLAS_ANTHROPIC_MODEL", "claude-sonnet-4-20250514"))
    parser.add_argument("--pause", type=float, default=0.5, help="Pausa entre llamadas API")
    parser.add_argument("--target-score", type=float, default=TARGET_SCORE_DEFAULT, help="Puntuación objetivo 0-10 para detener la optimización")
    parser.add_argument("--failure-score", type=float, default=FAILURE_SCORE_DEFAULT, help="Puntuación 0-10 por debajo de la cual se muta un caso")
    parser.add_argument("--scenarios-limit", type=int, default=4, help="Límite de escenarios a testear por ciclo")
    parser.set_defaults(dry_run=True)
    args = parser.parse_args()

    print(f"Iniciando ciclo de optimización (Modo: {'Simulado (Dry-Run)' if args.dry_run else 'API Live'})...")

    # Inicializar cliente Anthropic si corresponde
    client = None if args.dry_run else get_anthropic_client()

    # Cargar configuraciones
    variables = load_variables()
    scenarios = load_scenarios()

    # Reducimos los escenarios para acelerar el bucle de prueba
    if len(scenarios) > args.scenarios_limit:
        scenarios = scenarios[:args.scenarios_limit]
        print(f"Limitando escenarios de calibración a los primeros {args.scenarios_limit} para agilizar.")

    current_prompt = load_prompt(PROMPT_PATH)
    best_prompt = current_prompt

    # Evaluación Inicial (Baseline)
    print("\n[Ciclo 0] Evaluando prompt base original...")
    avg_score, results = run_eval_batch(client, current_prompt, scenarios, variables, args)
    best_score = avg_score

    print(f"Baseline Score Promedio: {avg_score:.2f}")

    history = [{
        "iteration": 0,
        "average_score": avg_score,
        "prompt": current_prompt,
        "results": results
    }]

    # Bucle de mutaciones
    for iteration in range(1, args.iterations + 1):
        if meets_target(best_score, results, args.target_score):
            print(
                f"\n¡Meta alcanzada! Puntuación promedio {best_score:.2f} >= {args.target_score:.2f} "
                "y todos los escenarios quedaron aprobados."
            )
            break

        print(f"\n[Ciclo {iteration}/{args.iterations}] Iniciando optimización...")

        # Extraer turnos con baja puntuación 0-10 o decisión no aprobada del juez central.
        failures = failing_results(results, args.failure_score)
        if not failures:
            # Si no hay fallas graves pero no llegamos al target, tomamos todos los que no llegaron al objetivo.
            failures = [r for r in results if r["weighted_score"] < args.target_score]

        if args.dry_run:
            mutated_prompt = run_dry_mutation(current_prompt, failures)
        else:
            print(f"Llamando a LLM Mutador para refinar prompt basándose en {len(failures)} fallas...")
            mutated_prompt = run_live_mutation(client, current_prompt, failures, args.model)

        print("Prompt mutado generado. Evaluando nueva receta...")
        new_avg_score, new_results = run_eval_batch(client, mutated_prompt, scenarios, variables, args)
        print(f"Nueva Puntuación Promedio: {new_avg_score:.2f} (Anterior Mejor: {best_score:.2f})")

        # Guardar en historial
        history.append({
            "iteration": iteration,
            "average_score": new_avg_score,
            "prompt": mutated_prompt,
            "results": new_results
        })

        # Guardar si mejoró
        if new_avg_score > best_score:
            print(f"-> ¡Mejora detectada! Adoptando nuevo prompt ({new_avg_score:.2f} > {best_score:.2f})")
            best_score = new_avg_score
            best_prompt = mutated_prompt
            current_prompt = mutated_prompt
            results = new_results
        else:
            print("-> No hubo mejora. Conservando el prompt anterior.")
            current_prompt = best_prompt # Volver a la mejor receta para el siguiente ciclo

    # Guardar reporte comparativo final
    reports_dir = ROOT / "out" / DEFAULT_CHARACTER / "recipe-reports"
    reports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = now_stamp()
    json_report_path = reports_dir / f"optimization-report-{timestamp}.json"
    md_report_path = reports_dir / f"optimization-report-{timestamp}.md"

    # Escribir reporte JSON
    report_data = {
        "character": DEFAULT_CHARACTER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "baseline_score": history[0]["average_score"],
        "final_best_score": best_score,
        "iterations_run": len(history) - 1,
        "history": history
    }
    json_report_path.write_text(json.dumps(report_data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Escribir reporte Markdown
    md_content = f"""# Reporte de Optimización de Receta - {DEFAULT_CHARACTER}
Fecha: {report_data['timestamp']}
Puntuación Inicial (Baseline): {report_data['baseline_score']:.2f}
Puntuación Final (Best): {report_data['final_best_score']:.2f}
Iteraciones Corridas: {report_data['iterations_run']}

## Historial de Iteraciones

"""
    for h in history:
        md_content += f"### Iteración {h['iteration']} - Score Promedio: {h['average_score']:.2f}\n"
        md_content += "| Escenario | Estado | Score Compuesto | Decisión | Diagnóstico |\n"
        md_content += "| --- | --- | ---: | --- | --- |\n"
        for r in h["results"]:
            md_content += f"| {r['scenario_id']} | {r['state']} | {r['weighted_score']:.2f} | {r['decision']} | {r['notes']} |\n"
        md_content += "\n"

    md_content += "\n## Prompt Final Optimizado\n\n```markdown\n" + best_prompt + "\n```\n"
    md_report_path.write_text(md_content, encoding="utf-8")

    print(f"\n[Bucle Terminado] Reportes guardados en:")
    print(f"  JSON: {json_report_path.relative_to(ROOT)}")
    print(f"  MD: {md_report_path.relative_to(ROOT)}")
    print(f"Puntuación Final: {best_score:.2f}")

if __name__ == "__main__":
    main()
