"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

const CX = 175;
const CY = 185;
const R = 150;
const RB = 164; // 燈泡環半徑

const SEG_COLORS = [
  "#ede9fe",
  "#dbeafe",
  "#fce7f3",
  "#dcfce7",
  "#fef9c3",
  "#e0e7ff",
  "#ffe4e6",
  "#cffafe",
];

const BULB_COUNT = 28;

const SPARKLES = [
  { top: "6%", left: "10%", s: 12, d: "0s" },
  { top: "12%", left: "82%", s: 10, d: ".5s" },
  { top: "22%", left: "45%", s: 8, d: "1.1s" },
  { top: "34%", left: "6%", s: 14, d: ".2s" },
  { top: "40%", left: "92%", s: 9, d: ".8s" },
  { top: "54%", left: "16%", s: 8, d: "1.4s" },
  { top: "62%", left: "88%", s: 12, d: ".3s" },
  { top: "72%", left: "40%", s: 9, d: ".9s" },
  { top: "78%", left: "70%", s: 10, d: "1.6s" },
  { top: "86%", left: "12%", s: 12, d: ".6s" },
  { top: "90%", left: "54%", s: 8, d: "1.2s" },
  { top: "18%", left: "24%", s: 9, d: "1.8s" },
  { top: "48%", left: "62%", s: 7, d: ".4s" },
  { top: "66%", left: "30%", s: 8, d: "1s" },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
}

function parseNames(text: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

function readAngle(el: SVGGElement) {
  const tr = getComputedStyle(el).transform;
  if (!tr || tr === "none") return 0;
  const m = tr.match(/matrix\(([^)]+)\)/);
  if (m) {
    const [a, b] = m[1].split(",").map(parseFloat);
    return (Math.atan2(b, a) * (180 / Math.PI) + 360) % 360;
  }
  const m3 = tr.match(/matrix3d\(([^)]+)\)/);
  if (m3) {
    const v = m3[1].split(",").map(parseFloat);
    return (Math.atan2(v[1], v[0]) * (180 / Math.PI) + 360) % 360;
  }
  return 0;
}

export default function LuckyDrawPage() {
  const [namesText, setNamesText] = useState(
    "小明\n小華\n小美\n阿強\n阿珍\n大雄"
  );
  const [removeWinner, setRemoveWinner] = useState(true);
  const [drawn, setDrawn] = useState<string[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const pendingWinner = useRef<string | null>(null);
  const spinningRef = useRef(false);
  const fallbackRef = useRef<number | null>(null);
  const gRef = useRef<SVGGElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const tickStateRef = useRef({
    running: false,
    raf: 0,
    prevAngle: 0,
    accum: 0,
    lastCross: 0,
  });

  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRafRef = useRef(0);

  const allNames = useMemo(() => parseNames(namesText), [namesText]);
  const wheelNames = useMemo(
    () => (removeWinner ? allNames.filter((x) => !drawn.includes(x)) : allNames),
    [allNames, drawn, removeWinner]
  );

  const n = wheelNames.length;
  const seg = n > 0 ? 360 / n : 360;
  const canSpin = n >= 2 && !spinning;

  useEffect(() => {
    document.title = "抽獎轉盤 · Joe-tools";
    try {
      if (localStorage.getItem("luckydraw:muted") === "1") setMuted(true);
    } catch {}
    return () => {
      stopTickLoop();
      if (fallbackRef.current) clearTimeout(fallbackRef.current);
      if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 音效（Web Audio 合成，無需檔案） ----
  function ensureAudio() {
    if (typeof window === "undefined") return null;
    let ac = audioCtxRef.current;
    if (!ac) {
      const Ctor: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      ac = new Ctor();
      audioCtxRef.current = ac;
      const mg = ac.createGain();
      mg.gain.value = muted ? 0 : 0.9;
      mg.connect(ac.destination);
      masterGainRef.current = mg;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    gain: number,
    when = 0,
    glideTo?: number
  ) {
    const ac = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ac || !master) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  function playClick() {
    tone(300, 0.09, "square", 0.12, 0, 190);
    tone(760, 0.06, "triangle", 0.07);
  }

  function playWhoosh() {
    const ac = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ac || !master) return;
    const t = ac.currentTime;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.45), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(2800, t + 0.4);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.13, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 0.46);
  }

  function playTick(speed: number) {
    const ac = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ac || !master) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "triangle";
    o.frequency.value = 820 + Math.random() * 160;
    const vol = Math.max(0.05, Math.min(0.2, (60 / Math.max(6, speed)) * 0.03));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.05);
  }

  function playWin() {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => tone(f, 0.22, "triangle", 0.18, i * 0.085));
    tone(1046.5, 0.45, "sine", 0.12, seq.length * 0.085);
    for (let i = 0; i < 7; i++) {
      tone(1500 + Math.random() * 1700, 0.09, "sine", 0.05, 0.42 + i * 0.05);
    }
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem("luckydraw:muted", next ? "1" : "0");
      } catch {}
      const mg = masterGainRef.current;
      const ac = audioCtxRef.current;
      if (mg && ac) mg.gain.setTargetAtTime(next ? 0 : 0.9, ac.currentTime, 0.01);
      return next;
    });
  }

  // ---- 轉動時依扇形通過指針播放「答答」聲 ----
  function startTickLoop() {
    const g = gRef.current;
    if (!g) return;
    const st = tickStateRef.current;
    st.running = true;
    st.accum = 0;
    st.lastCross = 0;
    st.prevAngle = readAngle(g);
    const step = () => {
      if (!st.running) return;
      const el = gRef.current;
      if (!el) return;
      const ang = readAngle(el);
      let delta = ((ang - st.prevAngle) % 360 + 360) % 360;
      st.prevAngle = ang;
      st.accum += delta;
      const cross = Math.floor(st.accum / seg);
      if (cross > st.lastCross) {
        const newOnes = Math.min(cross - st.lastCross, 3);
        st.lastCross = cross;
        for (let k = 0; k < newOnes; k++) playTick(delta);
      }
      st.raf = requestAnimationFrame(step);
    };
    st.raf = requestAnimationFrame(step);
  }

  function stopTickLoop() {
    const st = tickStateRef.current;
    st.running = false;
    if (st.raf) cancelAnimationFrame(st.raf);
    st.raf = 0;
  }

  // ---- 中獎彩帶 ----
  function burstConfetti() {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = (canvas.width = canvas.clientWidth * dpr);
    const H = (canvas.height = canvas.clientHeight * dpr);
    const colors = [
      "#f0abfc",
      "#c084fc",
      "#a78bfa",
      "#38bdf8",
      "#fde047",
      "#fb7185",
      "#ffffff",
    ];
    const parts = Array.from({ length: 150 }, () => ({
      x: W / 2 + (Math.random() - 0.5) * W * 0.25,
      y: H * 0.32 + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 15 * dpr,
      vy: (Math.random() * -13 - 4) * dpr,
      g: (0.32 + Math.random() * 0.25) * dpr,
      size: (4 + Math.random() * 7) * dpr,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.45,
      color: colors[(Math.random() * colors.length) | 0],
      life: 0,
      ttl: 90 + Math.random() * 45,
    }));
    if (confettiRafRef.current) cancelAnimationFrame(confettiRafRef.current);
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      let alive = 0;
      for (const p of parts) {
        p.life++;
        if (p.life > p.ttl) continue;
        alive++;
        p.vy += p.g;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (alive > 0) {
        confettiRafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, W, H);
        confettiRafRef.current = 0;
      }
    };
    draw();
  }

  // ---- 抽獎 ----
  function spin() {
    if (!canSpin) return;
    ensureAudio();
    playClick();
    playWhoosh();

    const winnerIdx = Math.floor(Math.random() * n);
    pendingWinner.current = wheelNames[winnerIdx];

    const center = winnerIdx * seg + seg / 2;
    const jitter = (Math.random() * 2 - 1) * seg * 0.3;
    const rest =
      (((360 - ((rotation % 360) + center + jitter)) % 360) + 360) % 360;

    setWinner(null);
    setAnimate(true);
    setSpinning(true);
    spinningRef.current = true;
    setRotation((r) => r + 6 * 360 + rest);

    requestAnimationFrame(() => requestAnimationFrame(startTickLoop));
    if (fallbackRef.current) clearTimeout(fallbackRef.current);
    fallbackRef.current = window.setTimeout(finishSpin, 5200);
  }

  function finishSpin() {
    if (!spinningRef.current) return;
    spinningRef.current = false;
    if (fallbackRef.current) {
      clearTimeout(fallbackRef.current);
      fallbackRef.current = null;
    }
    stopTickLoop();
    setSpinning(false);
    setAnimate(false);
    const w = pendingWinner.current;
    if (w) {
      setWinner(w);
      setDrawn((d) => (d.includes(w) ? d : [...d, w]));
      playWin();
      burstConfetti();
    }
  }

  function reset() {
    setDrawn([]);
    setWinner(null);
    setRotation(0);
    setAnimate(false);
    setSpinning(false);
    spinningRef.current = false;
    stopTickLoop();
  }

  const rotStyle: CSSProperties = {
    transform: `rotate(${rotation}deg)`,
    transformOrigin: `${CX}px ${CY}px`,
    transformBox: "view-box",
    transition: animate
      ? "transform 4.6s cubic-bezier(0.16, 1, 0.3, 1)"
      : "none",
  };

  const frameStyle: CSSProperties = {
    ["--bulb-dur" as string]: spinning ? "0.5s" : "1.7s",
    boxShadow:
      "0 0 0 3px rgba(240,171,252,.55), 0 0 26px 6px rgba(217,70,239,.55), 0 0 70px 16px rgba(139,92,246,.4), inset 0 0 34px rgba(217,70,239,.3)",
  };

  const centerBtnStyle: CSSProperties = {
    background:
      "radial-gradient(circle at 50% 32%, #f5d0fe 0%, #d946ef 46%, #7c3aed 100%)",
    boxShadow:
      "0 0 20px 5px rgba(217,70,239,.65), inset 0 0 14px rgba(255,255,255,.4)",
    border: "3px solid rgba(255,255,255,.75)",
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-8 text-violet-50"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #4a0d78 0%, #2a1150 45%, #140a26 100%)",
      }}
    >
      {/* 星星閃爍 */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {SPARKLES.map((sp, i) => (
          <span
            key={i}
            className="absolute animate-[twinkle_2.6s_ease-in-out_infinite] text-fuchsia-200/80"
            style={{
              top: sp.top,
              left: sp.left,
              fontSize: sp.s,
              animationDelay: sp.d,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-[0_0_14px_rgba(217,70,239,.55)]">
              🎡 抽獎轉盤
            </h1>
            <p className="mt-1 text-sm text-violet-200/70">
              輸入名單，按下中間按鈕，轉盤會停在中獎者身上。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-pressed={muted}
              className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-1.5 text-sm font-medium text-fuchsia-100 backdrop-blur transition hover:bg-fuchsia-500/20"
            >
              {muted ? "🔇 靜音" : "🔊 音效"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/10 px-4 py-1.5 text-sm font-medium text-fuchsia-100 backdrop-blur transition hover:bg-fuchsia-500/20"
            >
              ← 回首頁
            </Link>
          </div>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          {/* 控制區 */}
          <section className="flex h-fit flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <label className="text-sm font-semibold text-violet-100" htmlFor="names">
              參加名單（一行一位，重複的會自動略過）
            </label>
            <textarea
              id="names"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              rows={12}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-white/15 bg-black/30 p-3 font-mono text-sm text-violet-50 outline-none placeholder:text-violet-300/40 focus:border-fuchsia-400/60"
              placeholder="王小明&#10;陳小華&#10;林小美"
            />

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-violet-200/80">
              <span>
                有效人數：
                <b className="text-violet-50">{allNames.length}</b>
                {removeWinner && drawn.length > 0 && (
                  <>（轉盤剩 {wheelNames.length}）</>
                )}
              </span>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={removeWinner}
                  onChange={(e) => setRemoveWinner(e.target.checked)}
                  className="h-4 w-4 accent-fuchsia-500"
                />
                抽出後從轉盤移除
              </label>
            </div>

            {drawn.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-violet-100">
                    抽獎記錄（{drawn.length}）
                  </span>
                  <button
                    onClick={reset}
                    className="text-xs text-fuchsia-300 underline hover:text-fuchsia-100"
                  >
                    全部清除 / 重來
                  </button>
                </div>
                <ol className="flex flex-wrap gap-1.5">
                  {drawn.map((name, i) => (
                    <li
                      key={name}
                      className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-2.5 py-1 text-fuchsia-50"
                    >
                      <span className="text-fuchsia-300/70">{i + 1}.</span> {name}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* 轉盤區 */}
          <section className="flex flex-col items-center gap-5 justify-self-center">
            <div
              className="relative rounded-full p-2"
              style={frameStyle}
            >
              <svg
                width={350}
                height={370}
                viewBox="0 0 350 370"
                style={{ width: "min(330px, 82vw)", height: "auto" }}
              >
                {/* 燈泡環 */}
                <g style={{ filter: "drop-shadow(0 0 3px rgba(240,171,252,.9))" }}>
                  {Array.from({ length: BULB_COUNT }, (_, i) => {
                    const [bx, by] = polar(
                      CX,
                      CY,
                      RB,
                      (i * 360) / BULB_COUNT
                    );
                    return (
                      <circle
                        key={i}
                        cx={bx}
                        cy={by}
                        r={3.4}
                        fill={i % 2 ? "#f5d0fe" : "#fbcfe8"}
                        style={{
                          animation:
                            "bulbChase var(--bulb-dur, 1.7s) linear infinite",
                          animationDelay: `${-(i / BULB_COUNT) * 1.7}s`,
                        }}
                      />
                    );
                  })}
                </g>

                {/* 指針 */}
                <polygon
                  points={`${CX},${CY - R + 9} ${CX - 13},${CY - R - 18} ${
                    CX + 13
                  },${CY - R - 18}`}
                  fill="#ffffff"
                  style={{ filter: "drop-shadow(0 0 5px #f0abfc)" }}
                />

                {/* 底盤圓 */}
                <circle cx={CX} cy={CY} r={R} fill="#2e1065" />

                {/* 旋轉扇形 */}
                <g ref={gRef} onTransitionEnd={finishSpin} style={rotStyle}>
                  {n === 0 && (
                    <text
                      x={CX}
                      y={CY}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={14}
                      fill="#c4b5fd"
                    >
                      請輸入至少 2 位
                    </text>
                  )}

                  {wheelNames.map((name, i) => {
                    const a0 = i * seg;
                    const a1 = (i + 1) * seg;
                    const [x0, y0] = polar(CX, CY, R, a0);
                    const [x1, y1] = polar(CX, CY, R, a1);
                    const large = seg > 180 ? 1 : 0;
                    const d =
                      n === 1
                        ? `M ${CX - R} ${CY} A ${R} ${R} 0 1 1 ${CX + R} ${CY} A ${R} ${R} 0 1 1 ${CX - R} ${CY} Z`
                        : `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
                    const mid = a0 + seg / 2;
                    const fontSize = n > 16 ? 10 : n > 10 ? 12 : 14;
                    const label =
                      name.length > 12 ? `${name.slice(0, 11)}…` : name;
                    return (
                      <g key={name}>
                        <path
                          d={d}
                          fill={SEG_COLORS[i % SEG_COLORS.length]}
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                        <g transform={`translate(${CX} ${CY}) rotate(${mid - 90})`}>
                          <text
                            x={R - 16}
                            y={0}
                            textAnchor="end"
                            dominantBaseline="central"
                            fontSize={fontSize}
                            fontWeight={700}
                            fill="#5b21b6"
                            style={{ pointerEvents: "none" }}
                          >
                            {label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>

                {/* 外圈 + 中心座 */}
                <circle
                  cx={CX}
                  cy={CY}
                  r={R}
                  fill="none"
                  stroke="#e9d5ff"
                  strokeWidth={4}
                />
                <circle cx={CX} cy={CY} r={54} fill="#3b0764" />
              </svg>

              {/* 中央「立即抽獎」按鈕 */}
              <button
                onClick={spin}
                disabled={!canSpin}
                style={centerBtnStyle}
                className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center whitespace-pre-line rounded-full text-center text-lg font-extrabold leading-tight text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale"
              >
                {spinning ? "轉動中…" : "立即\n抽獎"}
              </button>
            </div>

            {/* 底座 */}
            <div className="rounded-xl border border-fuchsia-400/40 bg-gradient-to-b from-fuchsia-600/30 to-violet-800/30 px-8 py-2 text-sm font-black tracking-[0.4em] text-fuchsia-100 shadow-[0_0_20px_rgba(217,70,239,.4)]">
              JOE-TOOLS
            </div>

            {/* 名額橫幅 */}
            <div className="rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-5 py-1.5 text-sm font-bold text-white shadow-[0_0_22px_rgba(217,70,239,.5)]">
              {n < 2
                ? "至少需要 2 位參加者"
                : `${wheelNames.length} 位參加者候選中`}
            </div>

            {winner && !spinning && (
              <div className="w-full max-w-xs animate-[pop_0.35s_ease-out] rounded-2xl border-2 border-yellow-300 bg-yellow-300/10 px-6 py-4 text-center shadow-[0_0_28px_rgba(253,224,71,.5)]">
                <div className="text-xs font-medium uppercase tracking-widest text-yellow-300">
                  🎊 中獎者
                </div>
                <div className="mt-1 text-2xl font-black text-yellow-100">
                  {winner}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <canvas
        ref={confettiCanvasRef}
        className="pointer-events-none fixed inset-0 z-50 h-full w-full"
      />
    </main>
  );
}
