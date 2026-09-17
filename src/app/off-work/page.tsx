"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "offwork:settings";
const CELEBRATION_MS = 10000;

type Settings = {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  muted: boolean;
};

const DEFAULT_SETTINGS: Settings = {
  start: "09:00",
  end: "18:00",
  muted: false,
};

const END_PRESETS = ["17:30", "18:00", "18:30", "19:00"];

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function parseHM(value: string) {
  const [h, m] = value.split(":").map(Number);
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
}

function nextOccurrence(time: string, from: Date) {
  const { h, m } = parseHM(time);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= from.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

function formatCountdown(totalSeconds: number) {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((clamped % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(clamped % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function formatClock(d: Date) {
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

type Rocket = {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  color: string;
  trail: { x: number; y: number }[];
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  ttl: number;
};

const FIREWORK_COLORS = [
  "#f87171",
  "#fb923c",
  "#fde047",
  "#4ade80",
  "#38bdf8",
  "#a78bfa",
  "#f472b6",
  "#ffffff",
];

export default function OffWorkPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [target, setTarget] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [progress, setProgress] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const settingsRef = useRef(settings);
  const targetRef = useRef<Date | null>(null);
  const intervalRef = useRef<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rocketsRef = useRef<Rocket[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const fireworksRafRef = useRef(0);
  const spawnTimeoutsRef = useRef<number[]>([]);
  const stopTimeoutsRef = useRef<number[]>([]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    document.title = "下班倒數計時 · Joe-tools";
    setSettings(loadSettings());
    setHydrated(true);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      clearFireworkTimers();
      if (fireworksRafRef.current) cancelAnimationFrame(fireworksRafRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, hydrated]);

  // 解鎖 AudioContext：時間到時可能沒有「最近的使用者操作」，
  // 先在使用者第一次互動時建立/解鎖，之後才能自動播放音效。
  useEffect(() => {
    const unlock = () => ensureAudio();
    const onVisible = () => {
      if (document.visibilityState === "visible") audioCtxRef.current?.resume();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const recomputeTarget = useCallback((from: Date) => {
    const t = nextOccurrence(settingsRef.current.end, from);
    targetRef.current = t;
    setTarget(t);
    return t;
  }, []);

  // 主要倒數計時迴圈
  useEffect(() => {
    if (!hydrated) return;
    recomputeTarget(new Date());

    intervalRef.current = window.setInterval(() => {
      const now = new Date();
      let t = targetRef.current;
      if (!t || now.getTime() >= t.getTime()) {
        launchCelebration();
        t = recomputeTarget(now);
      }

      const diffSeconds = Math.round((t.getTime() - now.getTime()) / 1000);
      setSecondsLeft(diffSeconds);

      const { h: sh, m: sm } = parseHM(settingsRef.current.start);
      const dayStart = new Date(t);
      dayStart.setHours(sh, sm, 0, 0);
      if (dayStart.getTime() > t.getTime()) dayStart.setDate(dayStart.getDate() - 1);
      const total = t.getTime() - dayStart.getTime();
      const elapsed = total - diffSeconds * 1000;
      setProgress(total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 0);

      document.title = `⏳ ${formatCountdown(diffSeconds)} · 下班倒數`;
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, settings.end, settings.start]);

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
      mg.gain.value = settingsRef.current.muted ? 0 : 0.9;
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

  function playFanfare() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => tone(f, 0.24, "triangle", 0.2, i * 0.09));
    tone(1568, 0.55, "sine", 0.14, seq.length * 0.09);
  }

  function playWhistle(when: number, freqFrom: number, freqTo: number) {
    const ac = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ac || !master) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freqFrom, t);
    o.frequency.exponentialRampToValueAtTime(freqTo, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.6);
  }

  function playBoom(when: number) {
    const ac = audioCtxRef.current;
    const master = masterGainRef.current;
    if (!ac || !master) return;
    const t = ac.currentTime + when;

    // 爆破的低頻悶響
    const thump = ac.createOscillator();
    const thumpGain = ac.createGain();
    thump.type = "sine";
    thump.frequency.setValueAtTime(140, t);
    thump.frequency.exponentialRampToValueAtTime(40, t + 0.35);
    thumpGain.gain.setValueAtTime(0.0001, t);
    thumpGain.gain.linearRampToValueAtTime(0.35, t + 0.02);
    thumpGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    thump.connect(thumpGain).connect(master);
    thump.start(t);
    thump.stop(t + 0.42);

    // 白噪音爆裂
    const dur = 0.6;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "lowpass";
    bp.frequency.setValueAtTime(3200, t);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.linearRampToValueAtTime(0.3, t + 0.015);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(ng).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);

    // 劈啪細碎聲
    for (let i = 0; i < 8; i++) {
      tone(
        1400 + Math.random() * 2200,
        0.05 + Math.random() * 0.05,
        "sine",
        0.04,
        when + 0.15 + i * (0.06 + Math.random() * 0.06)
      );
    }
  }

  // ---- 煙火動畫 ----
  function clearFireworkTimers() {
    spawnTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    spawnTimeoutsRef.current = [];
    stopTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    stopTimeoutsRef.current = [];
  }

  function launchCelebration() {
    ensureAudio();
    clearFireworkTimers();
    setCelebrating(true);
    playFanfare();

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    let W = 0;
    let H = 0;
    if (canvas) {
      W = canvas.width = canvas.clientWidth * dpr;
      H = canvas.height = canvas.clientHeight * dpr;
    }
    rocketsRef.current = [];
    particlesRef.current = [];

    function spawnRocket() {
      if (!canvas) return;
      const color =
        FIREWORK_COLORS[(Math.random() * FIREWORK_COLORS.length) | 0];
      const x = W * (0.15 + Math.random() * 0.7);
      const targetY = H * (0.18 + Math.random() * 0.32);
      rocketsRef.current.push({
        x,
        y: H,
        targetY,
        vy: -(H * 0.012 + Math.random() * H * 0.004),
        color,
        trail: [],
      });
      playWhistle(0, 260 + Math.random() * 120, 900 + Math.random() * 300);
    }

    function explode(x: number, y: number, color: string) {
      const count = 46 + Math.floor(Math.random() * 24);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const speed = (2.2 + Math.random() * 2.6) * dpr;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: Math.random() < 0.25 ? "#ffffff" : color,
          size: (2 + Math.random() * 2.5) * dpr,
          life: 0,
          ttl: 55 + Math.random() * 35,
        });
      }
      playBoom(0);
    }

    // 排程一連串發射，讓爆炸集中在慶祝時間內結束
    const spawnWindow = Math.max(0, CELEBRATION_MS - 2200);
    let elapsed = 0;
    const scheduleNext = () => {
      if (elapsed > spawnWindow) return;
      const delay = 320 + Math.random() * 480;
      const id = window.setTimeout(() => {
        spawnRocket();
        elapsed += delay;
        scheduleNext();
      }, delay);
      spawnTimeoutsRef.current.push(id);
    };
    spawnRocket();
    scheduleNext();

    if (fireworksRafRef.current) cancelAnimationFrame(fireworksRafRef.current);
    const draw = () => {
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      // 半透明黑色疊加：讓夜空漸暗、拖出尾跡
      ctx.fillStyle = "rgba(6, 8, 23, 0.22)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const rockets = rocketsRef.current;
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 6) r.trail.shift();
        r.y += r.vy;
        r.vy += 0.02 * dpr;

        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        r.trail.forEach((p, idx) => {
          ctx.globalAlpha = idx / r.trail.length;
          if (idx === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;

        if (r.y <= r.targetY || r.vy >= 0) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        if (p.life > p.ttl) {
          particles.splice(i, 1);
          continue;
        }
        p.vy += 0.045 * dpr;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      fireworksRafRef.current = requestAnimationFrame(draw);
    };
    draw();

    const stopId = window.setTimeout(() => {
      setCelebrating(false);
      clearFireworkTimers();
    }, CELEBRATION_MS);
    stopTimeoutsRef.current.push(stopId);

    const clearId = window.setTimeout(() => {
      if (fireworksRafRef.current) {
        cancelAnimationFrame(fireworksRafRef.current);
        fireworksRafRef.current = 0;
      }
      const ctx = canvas?.getContext("2d");
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
      rocketsRef.current = [];
      particlesRef.current = [];
    }, CELEBRATION_MS + 1600);
    stopTimeoutsRef.current.push(clearId);
  }

  function toggleMute() {
    setSettings((s) => {
      const next = !s.muted;
      const mg = masterGainRef.current;
      const ac = audioCtxRef.current;
      if (mg && ac) mg.gain.setTargetAtTime(next ? 0 : 0.9, ac.currentTime, 0.01);
      return { ...s, muted: next };
    });
  }

  function updateEnd(value: string) {
    setSettings((s) => ({ ...s, end: value }));
  }

  function updateStart(value: string) {
    setSettings((s) => ({ ...s, start: value }));
  }

  const R = 120;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - progress);
  const isToday = target ? target.toDateString() === new Date().toDateString() : true;

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-10 text-zinc-800 dark:text-zinc-100"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #fff7ed 0%, #eef2ff 45%, #ffffff 100%)",
      }}
    >
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              🌆 下班倒數計時
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              距離 {settings.end} 下班，時間到會放煙火慶祝！
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={launchCelebration}
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              🎆 測試煙火
            </button>
            <button
              onClick={toggleMute}
              aria-pressed={settings.muted}
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {settings.muted ? "🔇 靜音" : "🔊 音效"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              ← 回首頁
            </Link>
          </div>
        </header>

        <section className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <svg width={280} height={280} viewBox="0 0 280 280">
              <circle
                cx={140}
                cy={140}
                r={R}
                fill="none"
                stroke="currentColor"
                className="text-black/[.06] dark:text-white/10"
                strokeWidth={14}
              />
              <circle
                cx={140}
                cy={140}
                r={R}
                fill="none"
                stroke="#6366f1"
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 140 140)"
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center gap-1">
              <span className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">
                {formatCountdown(secondsLeft)}
              </span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {isToday
                  ? `⏳ 距離下班（${settings.end}）`
                  : `⏳ 距離明天下班（${settings.end}）`}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 text-sm font-semibold">時間設定</div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">🌅 上班時間</span>
              <input
                type="time"
                value={settings.start}
                onChange={(e) => updateStart(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-mono outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-black/30"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">🌆 下班時間</span>
              <input
                type="time"
                value={settings.end}
                onChange={(e) => updateEnd(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-mono outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-black/30"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {END_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => updateEnd(p)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  settings.end === p
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "border border-black/10 bg-white text-zinc-600 hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
            現在時間 {hydrated ? formatClock(new Date()) : "--:--"}，設定會自動記住，每天到點都會慶祝一次。
          </p>
        </section>
      </div>

      {/* 煙火畫布 */}
      <canvas
        ref={canvasRef}
        className={`pointer-events-none fixed inset-0 z-40 h-full w-full transition-opacity duration-500 ${
          celebrating ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* 下班慶祝橫幅 */}
      {celebrating && (
        <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4">
          <div className="animate-[popCelebrate_0.4s_ease-out] rounded-2xl border-2 border-amber-300 bg-black/60 px-8 py-4 text-center shadow-[0_0_40px_rgba(251,191,36,.6)] backdrop-blur">
            <div className="text-3xl font-black text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,.8)]">
              🎉 下班了！辛苦一天了 🎉
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popCelebrate {
          0% { transform: scale(0.7); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </main>
  );
}
