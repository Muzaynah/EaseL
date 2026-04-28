**EaseL**

**Cerebral Palsy–Specific Technical Framework**

*Submission-Ready Research + Implementation Guideline*

**Version 2.0 — Clinician-Validated & Updated**

| **Primary Target Population**<br>Children and Adolescents with Cerebral Palsy (CP)<br>**Eligibility: Instruction-Following Capable (not age-gated)**<br>Document Version: 2.0 \| Date: Feb 2026 \| Device: Laptop / Desktop only |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 0. Executive Summary

EaseL is a browser-based, client-side assistive drawing and guided visuomotor learning application that enables hands-free interaction via webcam-based facial landmark tracking. Head tilt drives cursor movement; mouth-opening serves as the primary activation gesture. This document defines a cerebral palsy (CP)–specific, academically defensible framework, updated to incorporate direct clinician input (pediatric occupational therapy context, Feb 2026).

The framework provides:

-   Clinical/scientific context specific to CP motor phenotypes and their interaction signatures;
-   A binary eligibility gate (instruction-following capability) that precedes all profiling;
-   A two-mode functional architecture replacing a rigid four-tier hierarchy;
-   A structured lesson progression grounded in mastery learning and errorless learning, with explicit goal framing as behavioural exercise and autonomy — not drawing skill;
-   Precision-learning adaptation rules based on implicit performance signals;
-   Tilt-dominant head tracking with continuous resting-position recalibration;
-   Clinically grounded session duration parameters and reinforcement requirements;
-   Ethics/privacy standards appropriate for pediatric and disability contexts.

| **Scope Statement**<br>Primary validation and evaluation are constrained to CP users who pass the instruction-following eligibility gate. The tool may be used by others only under a "functional profile similarity" statement. |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Non-Medical-Device Statement**<br>EaseL is not intended to diagnose, treat, cure, or prevent any disease. It does not assess clinical cognition or "mental age." It supports learning and practice activities through adaptive interaction and structured tasks. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

| **Goal Framing (Clinician-Validated)**<br>The goal of EaseL is to provide behavioural exercise and a sense of autonomy — not to teach drawing or painting skill. Motor precision may not improve with practice; only cognitive focus and engagement can. The system must compensate for motor impairment implicitly, not frame imprecision as failure. |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

# 1. Clinical and Scientific Background (Cerebral Palsy)

## 1.1 Definition and Neurodevelopmental Basis

***

Cerebral palsy (CP) is a group of permanent disorders of movement and posture causing activity limitation, attributed to non-progressive disturbances in the developing fetal or infant brain. The condition is present from birth and static in its neurological substrate, though clinical presentation changes with growth and therapy.

## 1.2 CP Motor Phenotypes and Interaction Signatures

***

EaseL's tilt-dominant cursor and facial activation must accommodate three primary CP motor phenotypes. Parameters are not hard-coded by phenotype — they are inferred from observed performance via the LIP screener.

-   **Spastic CP**: (hypertonia, reduced selective motor control): slow, effortful cursor movement with difficulty at endpoints. Requires large targets, endpoint magnets, slow cursor gain, generous dwell threshold.
-   **Dyskinetic CP**: (dystonia/choreoathetosis): involuntary jaw movement produces false mouth-open activations; low-frequency positional drift in cursor trace. Requires higher activation threshold, minimum dwell-duration gating, adaptive smoothing. Mouth-open may need replacement with dwell activation.
-   **Ataxic CP**: (cerebellar coordination deficit): overshoot-correct-overshoot oscillation around target. Requires endpoint snapping, corridor-based tracing, progressive narrowing of assistance envelope.
-   **Mixed presentations**: are the most common clinical presentation. Parameters must be inferred from observed behavior, not assumed from subtype.

| **Clinician-Validated Update (Feb 2026)**<br>*Head and neck are the strongest and most voluntary control site in the CP body — validates head-as-cursor.*<br>*Patients show slow, deliberate movement with possible involuntary jerks; the intended goal is reached eventually.*<br>*Rotation and flexion (turning/nodding) should be minimised as they break eye contact, which is critical for sustained interaction.*<br>*Tilt (lateral roll) is the recommended primary navigation axis — extent of tilt should not strongly dictate outcome magnitude.*<br>*Resting head position is not static due to hypermobility; continuous baseline recalibration is required.* |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 1.3 Associated Impairments Commonly Co-occurring in CP

***

-   **Vision and visuoperceptual differences**: require high-contrast options, uncluttered visuals, adjustable cue intensity.
-   **Communication limitations**: require icon-first prompts, minimal text, optional Urdu audio instructions.
-   **Epilepsy (subset)**: requires low-stimulation options: no flashing, conservative animation, muted colour transitions.
-   **Attention and learning variability**: demands short trials, consistent routines, scaffolding/fading.
-   **Fatigue, posture tolerance, pain**: require session time caps, scheduled breaks, simple error recovery.

## 1.4 Functional Classification for Participant Description

***

Report participant function using established CP frameworks (caregiver/clinician reported where possible):

-   **GMFCS**: gross motor function context (sitting/posture supports).
-   **MACS**: manual ability; supports the rationale for hands-free access.
-   **CFCS**: communication function; dictates instruction modality and caregiver involvement.

# 2. User Eligibility: Instruction-Following Capability Gate

## 2.1 Why Capability, Not Age, Is the Correct Gate

***

The original framework used chronological age (\~6–7 years) as a lower bound. Clinician input has corrected this: CP is present from birth and static neurologically. Developmental milestones are delayed but the condition itself does not change with age in a predictable, uniform way. Age is therefore not a reliable proxy for interaction readiness.

The correct and clinically validated eligibility criterion is instruction-following capability — specifically, the ability to understand and respond to a single-step instruction. This is a hard barrier: users below this threshold cannot benefit from EaseL and must be excluded from scope entirely, not placed in a lower LIP tier.

| **Clinician-Validated Update (Feb 2026)**<br>*CP patients have comprehension of basic single-step actions (look here, raise your arm) but complex multi-step instructions are difficult.*<br>*Patients with delayed milestones who retain instruction-following capability will be able to use the app.*<br>*Those with no instruction-following capability cannot engage with a learning tool — this is a hard exclusion, not a lower tier.*<br>*Age is not a meaningful variable; the condition is static and present from birth.*<br>*Gradual cognitive and behavioural improvement is possible with the app; motor precision improvement is not a realistic goal.* |
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|

## 2.2 Pre-Screener Eligibility Check (Before LIP Assignment)

***

Before the LIP screener runs, EaseL must perform a binary eligibility check. This is a single-step instruction task:

1.  Show a large target on screen with an audio prompt: "Tilt your head toward the circle."
2.  Observe whether the user produces any directional head movement toward the target within a generous time window (e.g., 10 seconds).
3.  If the user responds: proceed to LIP screener.
4.  If the user does not respond across three attempts: display a caregiver message — "This tool requires the ability to follow a simple instruction. Please consult a clinician before proceeding." Do not advance to screener.

## 2.3 Who Is In Scope

***

| **In Scope — Eligible Users**                                                                                                                                                                                                                                            | **Out of Scope — Excluded Users**                                                                                                                                                                                                                                            |
|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| • Can follow a single-step instruction reliably<br>• Has voluntary head/neck movement, however limited<br>• Can maintain eye contact in short bursts<br>• May have delayed milestones but retains basic comprehension<br>• Any age, provided eligibility check is passed | • Cannot follow a single-step instruction after three prompted attempts<br>• Has no voluntary head movement whatsoever<br>• Requires clinical intervention before assistive technology use<br>• Assessed by caregiver/clinician as not ready for structured task interaction |

## 2.4 Device Requirement

***

EaseL requires a laptop or desktop computer with a webcam. A phone screen is too small for reliable target acquisition and does not provide sufficient display area for the lesson interface. This is a hard platform constraint.

# 3. System Description (Project-Specific)

## 3.1 EaseL Architecture

***

EaseL is a client-side Progressive Web App built in React and Tailwind, running entirely in the browser. MediaPipe FaceMesh delivers a 468-landmark facial mesh at approximately 30 fps via WebAssembly and WebGL. No data leaves the device.

## 3.2 Head Tracking — Tilt-Dominant Mapping (Updated)

***

The landmark-to-cursor mapping is redesigned based on clinician input to prioritise lateral head tilt as the primary navigation axis, and to suppress rotation and flexion which break eye contact.

-   **Tilt (lateral roll)**: computed as the signed angle between the line connecting landmarks at the left and right outer canthi (eye corners) and the horizontal axis. This is the primary cursor navigation signal.
-   **Flexion/extension (nodding)**: used only for a secondary binary toggle (e.g., up/down mode switch) — not for continuous cursor control.
-   **Rotation (turning)**: actively suppressed — the system discards significant yaw displacement to avoid rewarding interactions that break eye contact.
-   **Tilt extent**: maps to cursor velocity, not cursor position. Small consistent tilts navigate the cursor; the degree of tilt does not need to be large to produce effective movement.

## 3.3 Continuous Resting-Position Recalibration (Updated)

***

Because CP patients are hypermobile and their resting head position drifts continuously, a one-time calibration at session start is insufficient. EaseL implements a rolling neutral baseline:

5.  A rolling window (e.g., 2 seconds) of recent tilt values is maintained.
6.  The median of that window — computed only during low-velocity frames — is treated as the current neutral.
7.  All cursor movement is computed as displacement relative to the rolling neutral, not the initial calibration.
8.  Recalibration is continuous and silent — the user experiences no interruption.

## 3.4 Activation Gesture & False-Positive Handling

***

The primary activation gesture is mouth-opening past a calibrated aperture threshold. Because CP patients may produce involuntary mouth movements, the system applies:

-   **Minimum dwell duration**: the aperture must exceed threshold for a minimum continuous duration (e.g., 300–500 ms) before an activation event fires.
-   **Velocity gating**: rapid involuntary jaw openings (high onset velocity) are discarded; slow deliberate openings are accepted.
-   **Dwell fallback**: for users with high false-positive rates identified in S3 of the screener, mouth-open activation is replaced by cursor dwell (hold still for N ms).

## 3.5 Interaction Goal & Reinforcement (Clinician-Validated)

***

The goal of every interaction is behavioural exercise and the experience of autonomous control — not motor accuracy. The system must therefore:

-   **Reward attempt, not accuracy**: immediate positive reinforcement (sound + visual) fires after every completed attempt, regardless of corridor adherence score.
-   **Never display failure**: no red crosses, no error sounds, no "try again" framing. The system silently adjusts assistance and reruns the trial.
-   **Compensate for motor impairment**: autocomplete, endpoint magnets, corridor assist, and smoothing are not optional features — they are required so the displayed output does not reflect raw motor noise.

## 3.6 Why Guided Drawing Is a Cognitive–Motor Tool in CP

***

-   **Visuospatial mapping**: following a path, matching shapes.
-   **Attention and persistence**: short repeated trials with clear goals and immediate reward.
-   **Sequencing**: step-by-step shape construction.
-   **Controlled activation**: intent capture and start/stop reliability.
-   **Cognitive focus**: the measurable and realistic improvement target — not motor precision.

# 4. Methodology Overview: Evidence to Design Mapping

## 4.1 Evidence Sources

***

-   **Literature**: CP motor control, pediatric learning, mastery learning, errorless learning.
-   **Clinician interview**: pediatric occupational therapist (Feb 2026) — validated phenotype descriptions, fatigue parameters, eligibility gate, tilt-dominance, recalibration requirement, reinforcement priority, and goal framing.
-   **Caregiver input**: comprehension, language, fatigue, home/school constraints (Pakistan context).

## 4.2 Core Methodological Decisions

***

-   **No mental age claims**: LIP is assigned from observed interaction behavior only.
-   **No age gating**: eligibility is determined by instruction-following capability, not chronological age.
-   **No motor accuracy as outcome**: primary outcomes are engagement, intent accuracy, and cognitive focus — not stroke precision.
-   **Assisted-use is a valid outcome category**: caregiver-assisted sessions are reported separately, not excluded.

# 5. Functional Profiling: Learning–Interaction Profile (LIP)

## 5.1 Two-Mode Architecture (Clinician-Validated)

***

Based on clinician input, the four LIP tiers are consolidated into two primary functional modes that reflect the most meaningful clinical distinction — whether the user is providing intent direction only, or whether they can exercise guided cursor control:

| **Mode**                    | **Name**       | **Functional Description**                                                 | **UI Constraints**                                                                         | **Lesson / Assistance Model**                                                                          |
|-----------------------------|----------------|----------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| **Mode 1**<br>**(LIP-1/2)** | Intent Capture | Cannot reliably produce precise cursor movement; intent direction only.    | Single-screen; caregiver-initiated; autocomplete on gesture detection; maximum assistance. | Gesture fires predefined action; system autocompletes; assistance fades with repetition.               |
| **Mode 2**<br>**(LIP-3/4)** | Guided Control | Can produce directed movement with scaffolding; voluntary control present. | Step-by-step lesson flow; consistent layout; corridor guidance active.                     | Real cursor control with jerk/involuntary-movement filtering; corridor tracing; progressive narrowing. |

LIP-1 and LIP-2 map to Mode 1. LIP-3 and LIP-4 map to Mode 2. The four-tier internal resolution is preserved for research reporting and gradual transition tracking between modes.

## 5.2 Pre-Screener Eligibility Gate (New)

***

See Section 2.2. The eligibility gate must pass before the LIP screener begins. Users who fail the gate are not assigned a LIP — they are flagged for caregiver/clinician review.

## 5.3 In-App Screener Protocol (S1–S5)

***

Conducted after eligibility confirmation and calibration. Tasks are short, concrete, and icon/demonstration-based.

-   **S1 — Cause→Effect Engagement**: user observes that head tilt drives cursor movement. Objective: attention and basic mapping.
-   **S2 — Hold-in-Target Stability**: user holds cursor inside a large target for 2–5 seconds. Measures: time-in-target, re-entry count, jitter (tilt velocity variance).
-   **S3 — Activation Reliability**: user triggers mouth-open gesture 10–20 times. Measures: true activation rate, false positive rate, missed activations. High false positive → flag for dwell fallback.
-   **S4 — Simple Corridor Trace**: user traces a wide straight corridor. Measures: adherence (% points within), mean deviation from centreline.
-   **S5 — Fatigue Sensitivity**: repeat of S2 late in the screener. Fatigue index = performance delta between early and late trials.

## 5.4 Screener Metrics

***

-   **Time-to-complete**: per task.
-   **Stability**: time inside target, re-entry count, tilt velocity variance (jitter proxy).
-   **Activation reliability**: true rate, false positive rate, missed rate.
-   **Trace adherence**: % of stroke points within corridor, mean signed deviation.
-   **Fatigue index**: performance decay from S2 early to S5 late.

## 5.5 Independent-Use vs. Assisted-Use

***

-   **Independent-use**: passes eligibility gate; meets minimum stability and activation thresholds; safe fatigue profile.
-   **Assisted-use**: caregiver initiates steps, interprets prompts; user participates in movement/activation as able. Valid and reported separately.

# 6. Lesson System Specification (Baseline Curriculum)

## 6.1 Lesson Design Principles

***

-   **One goal at a time**: avoid multi-objective screens.
-   **Demonstration-first**: ghost stroke/animation before user acts.
-   **Short trials**: 5–20 seconds each; breaks built in.
-   **Errorless learning**: maximum assistance at start; faded as performance stabilises.
-   **Immediate reward**: sound + visual reinforcement after every completed attempt — non-negotiable.
-   **No failure display**: system never shows error; it silently adjusts and retries.
-   **Mode 1 default**: actions are predefined; system autocompletes from detected gesture direction.

## 6.2 Session Duration Parameters (Clinician-Validated)

***

| **Phase**         | **Duration**     | **Condition**                                            |
|-------------------|------------------|----------------------------------------------------------|
| Initial sessions  | 5–10 minutes     | All new users regardless of mode                         |
| Standard sessions | 15–30 minutes    | After demonstrated tolerance                             |
| Extended sessions | Up to 60 minutes | Only with demonstrated tolerance and caregiver agreement |

## 6.3 Lesson Object Model

***

Each lesson consists of steps. Each step defines:

-   Target primitive: points, corridor path, or region.
-   Assistance envelope: corridor width, snapping strength, endpoint magnets, autocomplete threshold.
-   Activation rule: mouth-open / dwell / caregiver.
-   Mastery criteria: accuracy/time/stability thresholds.
-   Repetition plan: trials per step.
-   Progression rule: advance, repeat, or widen assistance.
-   Reward specification: sound file, animation, display duration.

## 6.4 Micro-Skill Progression Ladder

***

All learners begin at or near Stage 0. Mode 1 users operate primarily in Stages 0–3 with full autocomplete. Mode 2 users may reach Stages 4–8. Advancement is gated by mastery criteria.

| **Stage**          | **Micro-Skill**            | **Description / Notes**                        |
|--------------------|----------------------------|------------------------------------------------|
| **Stage 0**        | Cause→Effect Target Reach  | Touch big targets with head tilt               |
| **Stage 1**        | Hold / Stability           | Dwell readiness; resting recalibration active  |
| **Stage 2**        | Stop/Go Activation Control | Intent capture; system autocompletes action    |
| **Stage 3**        | Straight Corridor Tracing  | Auto-assist 100%; narrowing on repetition      |
| **Stage 4**        | Curved Corridor Tracing    | "Rainbow arc"; reduced assistance              |
| **Stage 5**        | Closed Shapes              | Circle, square, triangle; faded assistance     |
| **Stage 6**        | Sequenced Construction     | House, kite, sun (culturally familiar)         |
| **Stage 7**        | Patterns / Copying         | Attention + sequencing; reward after each step |
| **Stage 8 (opt.)** | Functional Symbols         | Only when appropriate; avoid broad claims      |

# 7. Precision Learning and Adaptation (Technical Methodology)

## 7.1 Definition

***

Precision learning in EaseL means: (i) high-frequency measurement of performance during short trials; (ii) mastery criteria for micro-skills; (iii) individualized adjustment of task constraints and assistance parameters to maintain high probability of success while encouraging progression. Accuracy of output stroke is not the primary outcome — intent direction and engagement are.

## 7.2 Per-Trial Metrics

***

For an attempt a with sampled stroke points pᵢ:

-   **Completion time**: Tₐ
-   **Corridor adherence**: Pₐ = (\# points within corridor) / (total points)
-   **Mean deviation**: d̄ₐ = average distance to corridor centreline
-   **Jitter**: tilt velocity variance over trial duration
-   **Activation errors**: false triggers, missed triggers
-   **Fatigue index**: performance drop across session
-   **Intent alignment**: direction of attempted movement vs. required direction (Mode 1 primary metric)

## 7.3 Mastery Criteria

***

Mastery for micro-skill s requires meeting thresholds for k of the last n attempts:

-   **Advance:** Pₐ ≥ P\* for k/n attempts AND jitter ≤ J\* AND fatigue acceptable.
-   **Hold:** improving trend but not yet stable.
-   **Widen assistance:** no improvement + high jitter or high false activations.

## 7.4 Adaptation Parameters

***

### When performance is low — increase support:

-   Widen corridor; increase endpoint magnet radius; increase smoothing; reduce cursor gain.
-   Increase autocomplete threshold (Mode 1); add more ghost-stroke modelling.
-   Switch mouth-open to dwell if false positive rate is high.
-   Shorten trial duration; increase break frequency.

### When performance is high and stable — increase challenge:

-   Narrow corridor; reduce magnets/snap; reduce autocomplete assistance.
-   Lengthen segments; increase sequencing complexity; reduce ghost-stroke frequency.

# 8. Accessibility and UX Requirements (CP-Focused)

## 8.1 Mandatory Tutorial

***

Before any lesson, a tutorial demonstrates: tilt head left/right → cursor moves; open mouth → drawing activates. Confirmed via a micro-task (reach one target). Re-triggered automatically if repeated errors indicate confusion.

## 8.2 Mode-Based UI Gating

***

-   **Mode 1**: single screen; no navigation; autocomplete; caregiver controls hidden. Only: start, pause.
-   **Mode 2**: step-by-step lesson flow; limited consistent controls; corridor guidance visible. Additional tools unlock gradually.

## 8.3 Reinforcement System (Required, Not Optional)

***

Immediately after every completed attempt — regardless of accuracy — the system fires a positive reinforcement event:

-   Audio: a short cheerful sound (configurable to caregiver preference).
-   Visual: a brief animation (star, confetti, colour flash — low-stimulation configurable).
-   Duration: 1–2 seconds maximum; does not interrupt lesson flow.

This is clinician-confirmed as critical for this population — not a UX nicety.

## 8.4 Language and Pakistan Context

***

Icon-first prompts throughout. Optional Urdu audio. Culturally familiar objects in later stages (kite, sun, house). Avoid heavy text dependence.

# 9. Data, Privacy, and Ethics (Pediatric CP)

## 9.1 Data Minimisation

***

Store only derived performance metrics. No raw video, no biometric templates. Camera processing is entirely on-device.

## 9.2 Consent Model

***

-   Caregiver consent required for data export.
-   Child assent obtained where feasible.
-   Export outputs only defined metrics and configuration parameters (see Appendix C).

## 9.3 Safety Constraints

***

-   Session time caps enforced per Section 6.2 parameters.
-   Mandatory breaks scheduled based on fatigue index.
-   Low-stimulation mode: reduced animations, muted colours, no flashing.
-   Eligibility gate prevents unsuitable users from entering lesson flow.

# 10. Evaluation Plan (Academic Rigor)

## 10.1 Study Design

***

Within-subject longitudinal design: baseline screener and probe trials → repeated sessions over multiple weeks → post-screener and probe trials. Report participant characteristics using GMFCS/MACS/CFCS and LIP mode (1 or 2) as the primary grouping variable.

## 10.2 Outcomes

***

-   **Primary**: intent alignment improvement (Mode 1); corridor adherence at fixed probe difficulty (Mode 2); reduced required assistance to maintain mastery.
-   **Secondary**: activation reliability improvements; fatigue resilience; engagement duration; caregiver usability ratings.
-   **Explicitly excluded**: stroke geometric accuracy and drawing likeness are not outcome measures.

# 11. Implementation Guideline (Feature Roadmap)

## 11.1 Priority Order (Research-Critical)

***

9.  Implement tilt-dominant head tracking with rotation suppression.
10. Implement continuous rolling-neutral resting-position recalibration.
11. Implement pre-screener eligibility gate (single-step instruction check).
12. Implement screener S1–S5 with all computed metrics.
13. Implement LIP assignment and mode-based UI gating.
14. Implement lesson engine with corridor/region targets and autocomplete (Mode 1).
15. Implement per-trial metric logging and mastery/adaptation policy.
16. Implement reinforcement system (audio + visual after every attempt).
17. Add dwell activation fallback for high false-positive users.
18. Add fatigue management (break scheduling, session time caps per Section 6.2).
19. Add Urdu audio prompt pipeline and icon-first instruction assets.
20. Add caregiver mode and data export.

## 11.2 Research Integrity Constraints

***

-   Do not claim mental age. Use functional mode and communication context.
-   Do not claim motor precision improvement as an outcome.
-   Do not age-gate. Gate on instruction-following capability only.
-   Do not generalise to non-CP diagnoses; generalise to functional similarity only.
-   Report assisted-use separately from independent-use.

# 12. References

Format per your university style guide (APA/IEEE). Suggested core references:

-   WHO. International Classification of Functioning, Disability and Health (ICF).
-   Rosenbaum et al. — definition and description of CP.
-   Palisano et al. — Gross Motor Function Classification System (GMFCS).
-   Eliasson et al. — Manual Ability Classification System (MACS).
-   Hidecker et al. — Communication Function Classification System (CFCS).
-   Baddeley & Wilson — errorless learning in rehabilitation contexts.
-   Bloom — mastery learning framework.
-   Motor learning and pediatric rehabilitation literature relevant to task practice, feedback, and scaffolding.
-   Clinician interview notes (Feb 2026) — cite per institutional policy on expert consultation.

# Appendix A: Clinician Interview Summary (Feb 2026)

### Key Confirmations

-   Head and neck are the strongest voluntary control site in CP — validates interaction model.
-   Individual grading is required; generalisation across patients is inappropriate.
-   Errorless learning with gradual assistance fading is consistent with OT practice for this population.
-   Reinforcement after every attempt is critical, not optional.
-   Instruction-following capability is the correct eligibility gate, not age.

### Key Corrections Applied to v2.0

-   Age removed as eligibility criterion; replaced by instruction-following gate.
-   Head tilt designated as primary axis; rotation/flexion suppressed.
-   Continuous resting-position recalibration required due to hypermobility.
-   Goal reframed: behavioural exercise and autonomy, not drawing skill.
-   Session durations defined: 5–10 min initial, 15–30 min standard, 60 min maximum.
-   Device constraint added: laptop/desktop only; phone excluded.
-   Four LIP tiers consolidated into two functional modes for architectural clarity.

# Appendix B: Caregiver Context Questions (Pakistan-Relevant)

21. Language preference (Urdu/English) and reading comfort.
22. Typical attention span for structured tasks.
23. Prior exposure to phones/tablets/computers.
24. Preferred rewards (praise, stickers, sounds) and sensitivities.
25. Typical fatigue triggers; best times of day for practice.

# Appendix C: Data Dictionary (Minimum Viable)

### User Profile

-   Age, language mode, LIP mode (1 or 2), LIP tier (1–4), GMFCS/MACS/CFCS if available, eligibility gate result.

### Calibration

-   Tilt sensitivity, deadzone, smoothing, activation method (mouth-open / dwell), neutral baseline window duration.

### Trial Log

-   Lesson ID, step ID, attempt index, time, adherence, mean deviation, jitter, intent alignment, activation errors, assistance parameters, reward fired, outcome.

### Session Log

-   Duration, breaks, fatigue index, mode, completion status, reinforcement events fired.
