---
target: tranh-viet mockup
total_score: 11
max_score: 16
na_heuristics: 1,3,5,7,9,10
p0_count: 1
p1_count: 3
target_identity: "file:D:\\Claude\\3D Virtual Gallery\\tranh-viet mockup"
timestamp: 2026-09-06T11-14-57Z
slug: tranh-viet-mockup
---
# Critique — REDA "Tranh Việt" direction mockup

Method: dual-agent (A design review · B deterministic detector), isolated.

## Design Health Score — 11/16 (~69%, Acceptable/borderline Good)
Static Experience board; interaction heuristics n/a (1,3,5,7,9,10).
- H2 Match real world: 3 — VN copy lands; English wordmark + 印 glyph read pan-Asian.
- H4 Consistency: 3 — VN display face on English wordmark; kicker above H1.
- H6 Recognition: 3 — bilingual labels help; 印 culture-dependent.
- H8 Aesthetic/minimalist: 2 — concept told (enumerated traditions, named materials) more than shown; decorative gold border-left + 5-term kicker.

## Design Specificity — ~60% authored / 40% generic; the 40% is the hero.
Hero is category-interchangeable warm-dark + gold-on-black + italic serif (same register as the rejected Renaissance Codex). Fusion uneven: sơn mài expressed; sơn dầu asserted (oil-canvas "memorable moment" absent from hero); đông hồ only named (no woodblock keyline/spot-color/điệp shimmer). Traditions listed in labels more than shown in form.

Detector: 19 findings, exit 0 (all warning/advisory). TRUE positives: 3 WCAG AA contrast fails — cream/gold 3.0:1, cream/vermilion 3.4:1, bronze/điệp 4.1:1; gradient-text (wordmark); dark-glow (gold text-shadow). FALSE positives (spec-board formatting): all-caps-body, wide-tracking (labels), em-dash-overuse (Label—Value captions). Browser overlay unavailable (local file://).

## What's working
1. Reading register (MJ Modern/Merriweather) is gallery-grade — earned through form.
2. Two-register system (lacquer viewer / điệp studio) maps to Experience/Operate.
3. Sơn mài is genuinely expressed.

## Priority issues
- [P0] Hero delivers AI-default, not the memorable oil-canvas room moment. Fix: real sơn dầu canvas ground + hint the room, full-bleed 100vh. (/impeccable bolder)
- [P1] Đông hồ asserted, never expressed — fusion one leg short. Fix: woodblock keyline / registered folk spot-colors / oyster-shell shimmer in light register. (/impeccable delight)
- [P1] Three WCAG AA contrast failures in proposed tokens (cream/gold 3.0, cream/vermilion 3.4, bronze/điệp 4.1) + small stone text. Fix: darken text on gold/vermilion, raise stone. (/impeccable colorize)
- [P1] Mono kicker above wordmark = double anti-pattern (eyebrow + enumerates traditions). Fix: delete it. (/impeccable distill)
- [P2] Wordmark wastes VN display face on English string + over-uses it on every H2. Fix: pair REDA with a VN descriptor; reserve display face for wordmark + one heading. (/impeccable typeset)

## Persona red flags
- Jordan: hero gives no cue this is a walkable 3D exhibition; kicker demands art-history literacy.
- Sam: stone on lacquer at 11–12.5px below AA; 印/stamp no text alt; vermilion-on-dark vibrates.
- Casey: seal only action, below low-contrast text; hero depth flattens on mobile CSS-3D flatten.

## Minor
- Indigo (chàm) phantom color — one swatch, zero components.
- 印 seal reads Chinese/Japanese; a Vietnamese triện/Nôm chop fits better.
