import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * "Cara kerjanya": three steps that are a true sequence (so they are numbered), joined by a line that draws
 * itself as you scroll to them, each with its own small picture instead of the same icon in a different color.
 * The pictures are original illustrations of the interface. The only figure in them, "8.000.000", is the same
 * example amount the budget field suggests; none of it is catalog data.
 *
 * The motion is plain CSS in globals.css ("Cara kerjanya"): each step gets .is-visible from ScrollReveal when it
 * reaches the screen. Without JavaScript or with reduced motion, every picture just sits in its finished state.
 */

const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Step 1: three need cards, two of them picked, and a cursor that just clicked the second. */
function PickPicture() {
  const card = (x: number, tone: string, glyph: ReactNode, picked: boolean, delay: number) => (
    <g key={x}>
      <rect x={x} y="26" width="64" height="92" rx="12" fill="var(--surface)" stroke="var(--line-strong)" />
      <circle cx={x + 32} cy="56" r="15" fill={`var(--${tone}-soft)`} stroke={`var(--${tone})`} strokeWidth="1.2" />
      <g stroke="currentColor" style={{ color: `var(--${tone}-fg)` }} fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" transform={`translate(${x + 32} 56)`}>
        {glyph}
      </g>
      <rect x={x + 12} y="84" width="40" height="6" rx="3" fill="#cfd8ec" />
      <rect x={x + 12} y="96" width="27" height="5" rx="2.5" fill="#e1e8f6" />
      {picked ? (
        <g className="il-select" style={d(delay)}>
          <rect x={x} y="26" width="64" height="92" rx="12" fill="var(--accent-soft)" fillOpacity="0.7" stroke="var(--accent)" strokeWidth="2" />
          <circle cx={x + 55} cy="35" r="9" fill="var(--accent)" />
          <path
            className="il-draw"
            style={d(delay + 150)}
            pathLength={1}
            d={`M${x + 51} 35.2l2.8 2.8 4.8-5.4`}
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
    </g>
  );

  return (
    <svg viewBox="0 0 240 144" aria-hidden="true" className="h-full w-full">
      {card(14, "blue", <><path d="M-8 -2l8 -4l8 4l-8 4z" /><path d="M-4.5 0.4v4c2.4 1.6 6.6 1.6 9 0v-4" /></>, true, 500)}
      {card(88, "violet", <><circle cx="0" cy="0" r="7" /><circle cx="-2.6" cy="-2.2" r="0.9" fill="currentColor" /><circle cx="2.6" cy="-2.2" r="0.9" fill="currentColor" /><circle cx="0" cy="3" r="0.9" fill="currentColor" /></>, false, 0)}
      {card(162, "mint", <><path d="M-3.5 -4.5l-4.5 4.5l4.5 4.5" /><path d="M3.5 -4.5l4.5 4.5l-4.5 4.5" /></>, true, 1200)}
      <g className="il-cursor il-part" style={d(900)}>
        <path d="M188 92l0 17l4.4 -4l3 6.8l2.8 -1.2l-3 -6.6l5.8 -0.4z" fill="var(--ink)" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

/** Step 2: the budget field being typed into, and the choices that sit beside it. */
function BudgetPicture() {
  const pill = (x: number, width: number, label: string, picked: boolean, delay: number) => (
    <g key={label} className="il-pop il-part" style={d(delay)}>
      <rect
        x={x}
        y="100"
        width={width}
        height="28"
        rx="14"
        fill={picked ? "var(--accent-soft)" : "var(--surface)"}
        stroke={picked ? "var(--accent)" : "var(--line-strong)"}
        strokeWidth={picked ? 1.8 : 1.2}
      />
      <text x={x + width / 2} y="118.2" textAnchor="middle" fontSize="10.5" fontWeight="700" fill={picked ? "var(--accent-strong)" : "var(--ink-2)"} fontFamily="inherit">
        {label}
      </text>
    </g>
  );

  return (
    <svg viewBox="0 0 240 144" aria-hidden="true" className="h-full w-full">
      <defs>
        <clipPath id="how-typed">
          <rect className="il-type il-part" style={d(500)} x="56" y="34" width="150" height="40" />
        </clipPath>
      </defs>
      <text x="20" y="22" fontSize="10.5" fontWeight="700" fill="var(--ink-3)" fontFamily="inherit">
        Anggaran maksimal
      </text>
      <rect x="14" y="30" width="212" height="52" rx="14" fill="var(--surface)" stroke="var(--accent)" strokeWidth="2" />
      <text x="30" y="63" fontSize="15" fontWeight="700" fill="var(--ink-3)" fontFamily="inherit">
        Rp
      </text>
      <g clipPath="url(#how-typed)">
        <text x="60" y="64" fontSize="21" fontWeight="800" fill="var(--ink)" fontFamily="inherit" style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
          8.000.000
        </text>
      </g>
      <rect className="il-caret" x="190" y="42" width="2.4" height="26" rx="1.2" fill="var(--accent)" />
      {pill(14, 58, "Baru", true, 1000)}
      {pill(80, 62, "Bekas", false, 1120)}
      {pill(148, 80, "Min. 256 GB", false, 1240)}
    </svg>
  );
}

/** Step 3: a result card with a verdict, its reasons ticking in, and a magnifier over it. */
function ReadPicture() {
  const row = (y: number, width: number, delay: number) => (
    <g key={y}>
      <path className="il-draw" style={d(delay)} pathLength={1} d={`M38 ${y}l3 3l5.4 -6`} fill="none" stroke="var(--mint)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="il-pop il-part" style={d(delay)} x="54" y={y - 3} width={width} height="6" rx="3" fill="#cfd8ec" />
    </g>
  );

  return (
    <svg viewBox="0 0 240 144" aria-hidden="true" className="h-full w-full">
      <rect x="22" y="12" width="196" height="122" rx="14" fill="var(--surface)" stroke="var(--line-strong)" />
      <rect x="22" y="12" width="196" height="5" rx="2.5" fill="var(--cocok-edge)" opacity="0.9" />
      <circle cx="44" cy="38" r="10" fill="var(--accent)" />
      <text x="44" y="42.2" textAnchor="middle" fontSize="11.5" fontWeight="800" fill="#fff" fontFamily="inherit">
        1
      </text>
      <rect x="62" y="31" width="82" height="8" rx="4" fill="var(--ink)" />
      <rect x="62" y="45" width="108" height="6" rx="3" fill="#cfd8ec" />
      <g className="il-pop il-part" style={d(300)}>
        <rect x="34" y="62" width="74" height="20" rx="10" fill="var(--cocok-bg)" stroke="var(--cocok-line)" />
        <path d="M45 72.4l2.6 2.6l4.6 -5" fill="none" stroke="var(--cocok-fg)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        <text x="58" y="75.8" fontSize="10" fontWeight="800" fill="var(--cocok-fg)" fontFamily="inherit">
          Cocok
        </text>
      </g>
      <rect className="il-grow il-part" style={d(500)} x="168" y="62" width="11" height="14" rx="3" fill="#9db8f7" />
      <rect className="il-grow il-part" style={d(620)} x="184" y="52" width="11" height="24" rx="3" fill="#6c92f3" />
      <rect className="il-grow il-part" style={d(740)} x="200" y="40" width="11" height="36" rx="3" fill="var(--accent)" />
      {row(96, 96, 700)}
      {row(110, 74, 900)}
      {row(124, 88, 1100)}
      <g className="il-pop il-part" style={d(1300)}>
        <circle cx="186" cy="108" r="17" fill="#fff" fillOpacity="0.7" stroke="var(--tone)" strokeWidth="4" />
        <path d="M198 120.5l14 13" stroke="var(--tone)" strokeWidth="5.5" strokeLinecap="round" />
        <path d="M178.4 108.4l5.4 5.4l9.2 -10.2" fill="none" stroke="var(--tone-fg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const STEPS = [
  {
    title: "Pilih kebutuhan",
    text: "Kuliah dan kantor, desain, pemrograman, atau game. Boleh lebih dari satu; setiap kebutuhan punya batas minimal yang bisa kamu baca sendiri.",
    tone: "tone-blue",
    Picture: PickPicture,
  },
  {
    title: "Isi anggaran",
    text: "Tulis angkanya saja, misalnya 8.000.000. Tambahkan syarat penyimpanan dan pilihan baru atau bekas kalau perlu.",
    tone: "tone-coral",
    Picture: BudgetPicture,
  },
  {
    title: "Baca alasannya",
    text: "Tiap rekomendasi menjelaskan apa yang sudah nyaman, apa yang pas-pasan, dan apa yang perlu kamu tahu sebelum membeli.",
    tone: "tone-mint",
    Picture: ReadPicture,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="cara-kerja" aria-labelledby="cara-kerja-judul" className="container-page py-16 sm:py-20">
      <div className="max-w-2xl">
        <h2 id="cara-kerja-judul" className="reveal text-3xl font-extrabold sm:text-4xl">
          Cara kerjanya
        </h2>
        <p className="reveal mt-3 text-lg text-ink-2" style={{ "--reveal-delay": "80ms" } as CSSProperties}>
          Tiga langkah, tanpa daftar akun.
        </p>
      </div>

      <ol className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-8">
        {STEPS.map(({ title, text, tone, Picture }, index) => {
          const last = index === STEPS.length - 1;
          return (
            <li key={title} className={cn("reveal flow-step flex gap-5 lg:flex-col lg:gap-6", tone)} style={{ "--i": index } as CSSProperties}>
              <div className="flex flex-col items-center lg:w-full lg:flex-row">
                <span
                  aria-hidden="true"
                  className="flow-node grid size-11 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-on-accent shadow-[0_10px_20px_-10px_var(--shadow-accent)]"
                  style={d(0)}
                >
                  {index + 1}
                </span>
                {last ? null : (
                  <span
                    aria-hidden="true"
                    className="flow-line mt-2 w-0.5 flex-1 rounded-full lg:-mr-[1.25rem] lg:ml-3 lg:mt-0 lg:h-0.5 lg:w-auto"
                    style={d(250)}
                  />
                )}
              </div>
              <div className="flow-card card card-hover min-w-0 flex-1 overflow-hidden" style={d(150)}>
                <div
                  aria-hidden="true"
                  className="aspect-[5/3] w-full border-b border-line p-3"
                  style={{ background: "linear-gradient(160deg, var(--tone-soft), var(--surface) 78%)" }}
                >
                  <Picture />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="mt-2 text-ink-2">{text}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
