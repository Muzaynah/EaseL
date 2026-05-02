/**
 * Minimal geometric vectors for “How it works” — basic shapes only.
 * Colors: theme variables from easeLPalette.css.
 */

function TiltArt() {
  return (
    <svg viewBox="0 0 100 72" className="easeL-landing-interaction-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Horizontal axis + arrows */}
      <line x1="10" y1="36" x2="90" y2="36" stroke="var(--easeL-text)" strokeWidth="3" strokeLinecap="square" />
      <polygon points="4,36 12,31 12,41" fill="var(--easeL-accent-mint)" />
      <polygon points="96,36 88,31 88,41" fill="var(--easeL-accent-coral)" />
      {/* Head block: rounded rect */}
      <rect
        x="34"
        y="14"
        width="32"
        height="44"
        rx="14"
        fill="var(--easeL-bg-section)"
        stroke="var(--easeL-landing-card-outline)"
        strokeWidth="2.5"
      />
      <circle cx="44" cy="32" r="4" fill="var(--easeL-text)" />
      <circle cx="56" cy="32" r="4" fill="var(--easeL-text)" />
    </svg>
  );
}

function MouthArt() {
  return (
    <svg viewBox="0 0 100 72" className="easeL-landing-interaction-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Outer ring = optional activation / focus zone (not a live dwell timer) */}
      <circle
        cx="50"
        cy="36"
        r="30"
        fill="none"
        stroke="var(--easeL-primary)"
        strokeWidth="2.5"
        strokeDasharray="6 5"
      />
      {/* Face disc */}
      <circle
        cx="50"
        cy="36"
        r="22"
        fill="var(--easeL-bg-section)"
        stroke="var(--easeL-landing-card-outline)"
        strokeWidth="2.5"
      />
      {/* Eyes: squares */}
      <rect x="40" y="28" width="6" height="6" rx="1" fill="var(--easeL-text)" />
      <rect x="54" y="28" width="6" height="6" rx="1" fill="var(--easeL-text)" />
      {/* Mouth: rectangle block */}
      <rect x="38" y="40" width="24" height="10" rx="2" fill="var(--easeL-accent-coral)" stroke="var(--easeL-landing-card-outline)" strokeWidth="2" />
    </svg>
  );
}

function BaselineArt() {
  return (
    <svg viewBox="0 0 100 72" className="easeL-landing-interaction-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      {/* Straight baseline */}
      <line x1="8" y1="52" x2="92" y2="52" stroke="var(--easeL-primary-light)" strokeWidth="2.5" strokeDasharray="4 4" />
      {/* Active path: zig polyline */}
      <polyline
        points="12,52 28,24 50,52 72,20 88,52"
        fill="none"
        stroke="var(--easeL-primary)"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Position marker: square on the path */}
      <rect
        x="46"
        y="16"
        width="12"
        height="12"
        rx="2"
        fill="var(--easeL-accent-mint)"
        stroke="var(--easeL-landing-card-outline)"
        strokeWidth="2"
        transform="rotate(-12 52 22)"
      />
    </svg>
  );
}

const VARIANTS = {
  tilt: TiltArt,
  mouth: MouthArt,
  baseline: BaselineArt,
};

export default function InteractionSpotArt({ variant }) {
  const Cmp = VARIANTS[variant] ?? BaselineArt;
  return (
    <div className="easeL-landing-interaction-visual">
      <Cmp />
    </div>
  );
}
