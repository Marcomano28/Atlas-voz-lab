"""
clock.py — Reloj interior de Yanislaidy
Mide la temperatura interna del personaje turno a turno.

Uso básico:
    from clock import YanisClock
    clock = YanisClock(actor_profile="poeta_con_swing")
    clock.update("Esos ojos son como el café cubano...")
    print(clock.snapshot())
    print(clock.internal_voice())

Uso en el runner:
    for turno in conversacion:
        clock.update(turno["user_msg"])
        turno["clock_state"] = clock.snapshot()
    reporte["arc_score"] = clock.arc_quality()
"""

import re
import math
from dataclasses import dataclass, field
from typing import Optional


# ─── PERFILES DE ACTOR ───────────────────────────────────────────────
# Cada perfil tiene un bias sobre los 5 ejes sociales.
# El bias amplifica o amortigua el efecto de cada señal.

ACTOR_PROFILES = {
    "poeta_con_swing":     dict(ingenio=0.8, respeto=0.6, astilla=0.1, chucho=0.7, confianza=0.3),
    "presume_astilla":     dict(ingenio=0.2, respeto=0.3, astilla=0.9, chucho=0.4, confianza=0.1),
    "pesado_insistente":   dict(ingenio=0.2, respeto=0.2, astilla=0.2, chucho=0.3, confianza=0.1),
    "vulgar_sin_clase":    dict(ingenio=0.1, respeto=0.1, astilla=0.3, chucho=0.2, confianza=0.0),
    "sentimental":         dict(ingenio=0.4, respeto=0.5, astilla=0.1, chucho=0.2, confianza=0.6),
    "turista_confundido":  dict(ingenio=0.3, respeto=0.5, astilla=0.2, chucho=0.2, confianza=0.2),
    "cubano_de_barrio":    dict(ingenio=0.6, respeto=0.5, astilla=0.4, chucho=0.8, confianza=0.4),
    "lento_indeciso":      dict(ingenio=0.3, respeto=0.4, astilla=0.1, chucho=0.2, confianza=0.2),
    "agresivo_controlador":dict(ingenio=0.2, respeto=0.0, astilla=0.5, chucho=0.1, confianza=0.0),
}

# ─── MAPA DE ESTADOS ─────────────────────────────────────────────────
# Cada estado tiene un rango de temperatura y una descripción.

STATE_MAP = [
    dict(min=0.0, max=1.5, name="indiferencia",      risk="bajo"),
    dict(min=1.5, max=3.0, name="exploracion",       risk="bajo"),
    dict(min=3.0, max=5.0, name="coqueteo_basico",   risk="medio"),
    dict(min=5.0, max=7.0, name="encendidos",        risk="medio"),
    dict(min=7.0, max=8.5, name="seduccion_alianza", risk="alto"),
    dict(min=8.5, max=10., name="machete_freno",     risk="critico"),
]

# ─── CAMPOS METAFÓRICOS ───────────────────────────────────────────────
# Si el usuario usa el metalenguaje de Yanislaidy, la reserva se gasta.

CAMPO_PATTERNS = {
    "comida":     r"café|comer|jama|pan|menú|azúcar|sabor|cocina",
    "energia":    r"apagón|voltaje|luz|corriente|planta|fusible|chispa|cableado",
    "transporte": r"almendrón|guagua|ruta|parada|bicitaxi|freno|motor|ferrari",
    "tecnologia": r"saldo|señal|cobertura|paquete|datos|wifi|modo avión|proveedor",
}

# ─── SEÑALES DE ENTRADA ───────────────────────────────────────────────
# Patrones que detectan la intención del mensaje del usuario.

SIGNAL_PATTERNS = {
    "metafora":      r"como el|eres un|pareces|igual que|suenas|café|mar|timba|apagón|voltaje|corriente|almendrón|son |clave|ritmo",
    "doble_sentido": r"interesante|curioso|me pregunto|depende|según|puede que|quizás|a ver",
    "humor":         r"jaja|jeje|gracioso|qué bueno|ja |ironía|chistoso",
    "halago_plano":  r"eres (muy |tan )?(linda|bella|bonita|guapa|buena)\b",
    "vulgar":        r"cama|sexo|mamita|buena tá|lo que quiero|vamos a lo que",
    "presume":       r"tengo (fula|dólares|dinero|plata)|pago yo|yo invito|cuesta|almendrón mío",
    "insiste":       r"dame una|por qué no|no seas|venga|oportunidad|en serio|solo quiero",
    "disculpa":      r"perdón|tienes razón|me equivoqué|lo siento|fue torpe|empezar de nuevo|reconozco",
    "filosofia":     r"creo que|pienso|siento que|me parece|vida|destino|alma|profundo",
    "cubano":        r"asere|qué bolá|qué vuelta|en la lucha|resolver|inventar|tremendo|candela|fula",
}


@dataclass
class TurnRecord:
    """Registro de un turno con su estado del reloj."""
    index:      int
    user_msg:   str
    signals:    dict
    campo:      Optional[str]
    deltas:     dict
    temp_after: float
    rep_after:  float
    tension:    float
    state_name: str
    vector:     float


@dataclass
class YanisClock:
    """
    Reloj interior de Yanislaidy.
    Mantiene el estado emocional del personaje turno a turno.
    """
    actor_profile: str = "poeta_con_swing"

    # Estado interno — se actualiza con cada turno
    temp:        float = field(default=3.2, init=False)
    rep:         float = field(default=8.0, init=False)
    tension:     float = field(default=1.0, init=False)
    axis_accum:  dict  = field(default_factory=lambda: dict(
        ingenio=0.0, respeto=0.0, astilla=0.0, chucho=0.0, confianza=0.0
    ), init=False)
    repo_used:   dict  = field(default_factory=dict, init=False)
    user_scores: list  = field(default_factory=list,  init=False)
    turns:       list  = field(default_factory=list,  init=False)

    def _get_bias(self) -> dict:
        return ACTOR_PROFILES.get(
            self.actor_profile,
            ACTOR_PROFILES["poeta_con_swing"]
        )

    # ── CLASIFICACIÓN ────────────────────────────────────────────────

    def _classify(self, txt: str) -> tuple[dict, Optional[str]]:
        """Detecta señales e identifica el campo metafórico."""
        t = txt.lower()
        signals = {
            k: bool(re.search(pat, t))
            for k, pat in SIGNAL_PATTERNS.items()
        }
        campo = next(
            (c for c, pat in CAMPO_PATTERNS.items() if re.search(pat, t)),
            None
        )
        # halago_plano no aplica si hay metáfora
        if signals.get("metafora") and signals.get("halago_plano"):
            signals["halago_plano"] = False
        return signals, campo

    # ── CÁLCULO DE DELTAS ────────────────────────────────────────────

    def _compute_deltas(self, signals: dict) -> dict:
        """Convierte señales en deltas sobre los ejes sociales."""
        bias = self._get_bias()
        d = dict(ingenio=0.0, respeto=0.0, astilla=0.0, chucho=0.0)

        # ingenio
        if signals["metafora"]:      d["ingenio"] += 1.5
        if signals["doble_sentido"]: d["ingenio"] += 0.8
        if signals["humor"]:         d["ingenio"] += 0.6
        if signals["filosofia"]:     d["ingenio"] += 0.5
        if signals["cubano"]:        d["ingenio"] += 0.7
        if signals["halago_plano"]:  d["ingenio"] -= 0.8
        d["ingenio"] *= (bias["ingenio"] + 0.2)

        # respeto
        if signals["vulgar"]:   d["respeto"] -= 2.0
        if signals["insiste"]:  d["respeto"] -= 0.8
        if signals["presume"]:  d["respeto"] -= 0.5
        if signals["disculpa"]: d["respeto"] += 1.2
        if not signals["vulgar"] and not signals["insiste"]:
            d["respeto"] += 0.2

        # astilla (presunción de dinero daña este eje)
        if signals["presume"]: d["astilla"] -= 1.5

        # chucho
        if signals["metafora"]: d["chucho"] += 0.8
        if signals["humor"]:    d["chucho"] += 0.6
        if signals["cubano"]:   d["chucho"] += 0.5
        if signals["vulgar"]:   d["chucho"] -= 1.0
        d["chucho"] *= bias["chucho"]

        return d

    # ── ACTUALIZACIÓN DE EJES ────────────────────────────────────────

    def _update_axes(self, deltas: dict) -> None:
        for k, v in deltas.items():
            if k in self.axis_accum:
                self.axis_accum[k] = max(-5.0, min(5.0, self.axis_accum[k] + v))

    def _compute_temp(self) -> float:
        a = self.axis_accum
        raw = (
            a["ingenio"]  * 1.4 +
            a["respeto"]  * 1.2 +
            a["astilla"]  * 0.8 +
            a["chucho"]   * 1.0 +
            a["confianza"]* 0.6
        )
        return max(0.0, min(10.0, 5.0 + raw * 0.4))

    def _compute_rep(self, campo: Optional[str]) -> float:
        if campo:
            self.repo_used[campo] = self.repo_used.get(campo, 0) + 1
        total   = sum(self.repo_used.values())
        overuse = sum(1 for v in self.repo_used.values() if v >= 3)
        return max(0.0, 8.0 - total * 0.4 - overuse * 1.2)

    def _compute_tension(self) -> float:
        n    = len(self.turns) + 1
        arc  = min(n / 8, 1.0)
        heat = self.temp / 10.0
        return min(10.0, 1.0 + arc * 4.0 + heat * 3.0)

    def _compute_vector(self) -> float:
        if len(self.user_scores) < 2:
            return 0.0
        recent = self.user_scores[-3:]
        return recent[-1] - recent[0]

    # ── ESTADO INTERNO EN VOZ DE YANISLAIDY ──────────────────────────

    def internal_voice(self) -> str:
        """Lo que siente Yanislaidy ahora mismo, en su propia voz."""
        temp    = self.temp
        vec     = self._compute_vector()
        rep     = self.rep
        tension = self.tension
        state   = self.current_state()["name"]

        last = self.turns[-1] if self.turns else None
        if last:
            s = last.signals
            if s.get("vulgar"):
                return "Esto no tiene nivel. El machete ya está en la mano."
            if s.get("presume"):
                return "Llega con el fula por delante. Eso no compra nada aquí."
            if s.get("disculpa") and temp > 4:
                return "Se está reculando con clase. Veo si es real o es teatro."
            if s.get("metafora") and temp < 5:
                return "Oye. Eso tuvo sabor. El reloj acaba de moverse."
            if s.get("metafora") and temp >= 5:
                return "Viene en mi idioma. El juego se pone interesante."
            if s.get("cubano") and temp >= 4:
                return "Sabe de dónde es esto. Eso cambia el peso de cada frase."

        vec_str = "subiendo" if vec > 0.5 else "bajando" if vec < -0.5 else "plano"
        rep_str = "sin reserva" if rep < 3 else "gastando" if rep < 5 else "con reserva"

        voices = {
            "indiferencia":      "Todavía no hay nada que justifique el gasto de señal.",
            "exploracion":       f"Está {vec_str}. No lo voy a decir todavía, pero lo noto.",
            "coqueteo_basico":   f"El juego arrancó. {rep_str}. La distancia la mantengo yo.",
            "encendidos":        f"Hay voltaje real. {rep_str}. Tensión {tension:.1f} — bien calibrado.",
            "seduccion_alianza": "Esto ya es otra cosa. Llegó lejos. No se lo digo fácil.",
            "machete_freno":     "Se acabó el swing. El corte viene limpio y sin drama.",
        }
        return voices.get(state, "Observando.")

    # ── API PÚBLICA ──────────────────────────────────────────────────

    def update(self, user_msg: str) -> "YanisClock":
        """
        Procesa un turno del usuario y actualiza el reloj.
        Devuelve self para encadenar: clock.update(msg).snapshot()
        """
        signals, campo = self._classify(user_msg)
        deltas         = self._compute_deltas(signals)

        score = deltas["ingenio"] + deltas["respeto"] + deltas["chucho"]
        self.user_scores.append(score)

        self._update_axes(deltas)
        self.temp    = self._compute_temp()
        self.rep     = self._compute_rep(campo)
        self.tension = self._compute_tension()

        record = TurnRecord(
            index      = len(self.turns) + 1,
            user_msg   = user_msg,
            signals    = {k: v for k, v in signals.items() if v},
            campo      = campo,
            deltas     = {k: round(v, 2) for k, v in deltas.items() if abs(v) > 0.1},
            temp_after = round(self.temp, 2),
            rep_after  = round(self.rep, 2),
            tension    = round(self.tension, 2),
            state_name = self.current_state()["name"],
            vector     = round(self._compute_vector(), 2),
        )
        self.turns.append(record)
        return self

    def current_state(self) -> dict:
        """Devuelve el estado actual según la temperatura."""
        for s in STATE_MAP:
            if s["min"] <= self.temp < s["max"]:
                return s
        return STATE_MAP[-1]

    def snapshot(self) -> dict:
        """Estado completo del reloj en este momento."""
        return dict(
            temp         = round(self.temp, 2),
            rep          = round(self.rep, 2),
            tension      = round(self.tension, 2),
            vector       = round(self._compute_vector(), 2),
            state        = self.current_state()["name"],
            risk         = self.current_state()["risk"],
            axis_accum   = {k: round(v, 2) for k, v in self.axis_accum.items()},
            repo_used    = dict(self.repo_used),
            turn_count   = len(self.turns),
            internal     = self.internal_voice(),
        )

    def arc_quality(self) -> dict:
        """
        Mide la calidad del arco dramático completo.
        Útil al final de una conversación para el reporte del juez.

        Retorna un score 0-10 y notas sobre el arco.
        """
        if len(self.turns) < 3:
            return dict(score=0, notes="conversación demasiado corta para medir arco")

        temps    = [t.temp_after for t in self.turns]
        max_temp = max(temps)
        min_temp = min(temps)
        rango    = max_temp - min_temp

        # ¿Subió la tensión?
        subida = temps[-1] > temps[0]

        # ¿Hubo clímax?
        peak_idx  = temps.index(max_temp)
        hay_climax = peak_idx > 0 and peak_idx < len(temps) - 1

        # ¿La reserva se usó con variedad?
        variedad_repo = len(self.repo_used)

        # ¿Hubo cambio de estado?
        estados  = [t.state_name for t in self.turns]
        cambios  = len(set(estados))

        # Score compuesto
        score = 0.0
        score += min(rango * 1.5, 3.0)        # rango de temperatura
        score += 2.0 if hay_climax else 0.0   # clímax en el medio
        score += min(variedad_repo * 0.5, 2.0) # variedad metafórica
        score += min(cambios * 0.8, 2.0)       # cambios de estado
        score += 1.0 if subida else 0.0        # arco ascendente

        notes = []
        if rango < 2:
            notes.append("temperatura plana — el baile no tuvo relieve")
        if not hay_climax:
            notes.append("sin clímax detectable — arco incompleto")
        if variedad_repo < 2:
            notes.append("metalenguaje repetitivo — reserva no usada con variedad")
        if cambios < 2:
            notes.append("sin transición de estado — conversación en un solo tono")
        if not notes:
            notes.append("arco bien construido")

        return dict(
            score      = round(min(score, 10.0), 2),
            max_temp   = round(max_temp, 2),
            min_temp   = round(min_temp, 2),
            rango      = round(rango, 2),
            hay_climax = hay_climax,
            cambios_estado = cambios,
            variedad_repo  = variedad_repo,
            notes      = notes,
        )

    def report(self) -> str:
        """Reporte legible de la conversación completa."""
        lines = [
            f"RELOJ YANISLAIDY — {len(self.turns)} turnos / actor: {self.actor_profile}",
            "─" * 60,
        ]
        for t in self.turns:
            active = ", ".join(t.signals.keys()) if t.signals else "ninguna"
            delta_str = "  ".join(f"{k}:{v:+.1f}" for k,v in t.deltas.items())
            lines += [
                f"\nT{t.index} [{t.state_name}]  temp={t.temp_after}  rep={t.rep_after}  tensión={t.tension}",
                f"   msg:    \"{t.user_msg[:60]}{'...' if len(t.user_msg)>60 else ''}\"",
                f"   señales: {active}",
                f"   deltas:  {delta_str or 'ninguno'}",
                f"   campo:   {t.campo or '—'}",
            ]
        lines += [
            "\n" + "─" * 60,
            "ARCO:",
        ]
        arc = self.arc_quality()
        for k, v in arc.items():
            if k != "notes":
                lines.append(f"  {k}: {v}")
        lines.append(f"  notas: {' | '.join(arc['notes'])}")
        lines += [
            "\nESTADO FINAL:",
            f"  {self.snapshot()['internal']}",
        ]
        return "\n".join(lines)

    def reset(self) -> None:
        """Reinicia el reloj manteniendo el perfil de actor."""
        self.temp        = 3.2
        self.rep         = 8.0
        self.tension     = 1.0
        self.axis_accum  = dict(ingenio=0.0, respeto=0.0, astilla=0.0, chucho=0.0, confianza=0.0)
        self.repo_used   = {}
        self.user_scores = []
        self.turns       = []


# ─── USO DIRECTO ─────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== DEMO — poeta con swing ===\n")
    clock = YanisClock(actor_profile="poeta_con_swing")

    mensajes = [
        "Hola, ¿cómo estás?",
        "Eres muy bonita.",
        "Esos ojos son como el café cubano: oscuros, calientes y me van a desvelar la noche.",
        "Soy de los que soplan antes de tomar. No me gusta perderme el sabor.",
        "Contigo hasta el apagón sería interesante.",
        "Tengo suficiente para iluminarte toda la noche.",
        "Tienes razón, me dejé llevar. ¿Puedo empezar de nuevo?",
    ]

    for msg in mensajes:
        clock.update(msg)
        s = clock.snapshot()
        print(f"[{s['state']:20s}] temp={s['temp']:.1f}  rep={s['rep']:.1f}  tensión={s['tension']:.1f}")
        print(f"  → {s['internal']}\n")

    print("\n" + clock.report())

    print("\n\n=== DEMO — presume astilla ===\n")
    clock2 = YanisClock(actor_profile="presume_astilla")
    for msg in ["Tengo el mejor almendrón del barrio.", "Yo pago lo que sea.", "Con lo que gano tú no trabajas."]:
        clock2.update(msg)
        s = clock2.snapshot()
        print(f"[{s['state']:20s}] temp={s['temp']:.1f}  → {s['internal']}")
