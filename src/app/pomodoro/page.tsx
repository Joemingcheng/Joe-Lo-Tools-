"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "focus" | "short" | "long";

const MODE_LABEL: Record<Mode, string> = {
  focus: "專注",
  short: "短休息",
  long: "長休息",
};

const MODE_EMOJI: Record<Mode, string> = {
  focus: "🍅",
  short: "☕",
  long: "🛋️",
};

const DEFAULT_DURATIONS: Record<Mode, number> = {
  focus: 25,
  short: 5,
  long: 15,
};

const LONG_BREAK_EVERY = 4;
const STORAGE_KEY = "pomodoro:settings";

type Settings = {
  focus: number;
  short: number;
  long: number;
  autoStart: boolean;
  muted: boolean;
};

function loadSettings(): Settings {
  const fallback: Settings = {
    ...DEFAULT_DURATIONS,
    autoStart: false,
    muted: false,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function PomodoroPage() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [mode, setMode] = useState<Mode>("focus");
  const [secondsLeft, setSecondsLeft] = useState(
    () => DEFAULT_DURATIONS.focus * 60
  );
  const [running, setRunning] = useState(false);
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const keepAliveRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(
    null
  );
  const intervalRef = useRef<number | null>(null);
  const settingsRef = useRef(settings);
  const playChimeRef = useRef<() => void>(() => {});

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const durations = useMemo(
    () => ({ focus: settings.focus, short: settings.short, long: settings.long }),
    [settings.focus, settings.short, settings.long]
  );

  useEffect(() => {
    document.title = "番茄鐘 · Joe-tools";
    const loaded = loadSettings();
    setSettings(loaded);
    setSecondsLeft(loaded.focus * 60);
    setHydrated(true);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      keepAliveRef.current?.osc.stop();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  // Chrome/Safari auto-suspend an idle AudioContext, which silently drops the
  // end-of-timer chime if it fires with no recent user gesture. Unlock on the
  // first interaction anywhere on the page, and re-resume when the tab
  // regains focus, so the alarm still plays after a long unattended session.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    playChimeRef.current = playChime;
  });

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, hydrated]);

  useEffect(() => {
    document.title = `${MODE_EMOJI[mode]} ${formatTime(secondsLeft)} · ${
      MODE_LABEL[mode]
    }`;
  }, [mode, secondsLeft]);

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

      // Silent (inaudible) drone that keeps the context "active" so the
      // browser doesn't auto-suspend it during a long, quiet 25-minute
      // countdown with no other sound playing.
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      gain.gain.value = 0.00001;
      osc.frequency.value = 20;
      osc.connect(gain).connect(ac.destination);
      osc.start();
      keepAliveRef.current = { osc, gain };
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  // Not the actual film score (that's copyrighted and can't be embedded here) —
  // an original bell/music-box motif synthesized with Web Audio, evoking the
  // same soft, dreamy Ghibli mood as the timer's end-of-session chime.
  function playChime() {
    const ac = ensureAudio();
    if (!ac || settingsRef.current.muted) return;

    const master = ac.createGain();
    master.gain.value = 0.85;
    master.connect(ac.destination);

    // short feedback delay for a gentle, spacious music-box tail
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.24;
    const feedback = ac.createGain();
    feedback.gain.value = 0.32;
    const delayTone = ac.createBiquadFilter();
    delayTone.type = "lowpass";
    delayTone.frequency.value = 2600;
    delay.connect(feedback).connect(delayTone).connect(delay);
    delay.connect(master);

    const bell = (freq: number, t: number, dur: number, vol: number) => {
      const fundamental = ac.createOscillator();
      const overtone = ac.createOscillator();
      const overtoneGain = ac.createGain();
      const g = ac.createGain();
      fundamental.type = "sine";
      overtone.type = "triangle";
      fundamental.frequency.setValueAtTime(freq, t);
      overtone.frequency.setValueAtTime(freq * 2.01, t);
      overtoneGain.gain.value = 0.15;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      fundamental.connect(g);
      overtone.connect(overtoneGain).connect(g);
      g.connect(master);
      g.connect(delay);
      fundamental.start(t);
      fundamental.stop(t + dur + 0.05);
      overtone.start(t);
      overtone.stop(t + dur + 0.05);
    };

    const now = ac.currentTime + 0.02;
    // gentle pentatonic arpeggio, G major-ish: G5 B5 D6 G6 D6 B5 ... G6
    const notes = [783.99, 987.77, 1174.66, 1567.98, 1174.66, 987.77];
    notes.forEach((f, i) =>
      bell(f, now + i * 0.26, 1.3, i === notes.length - 1 ? 0.24 : 0.19)
    );
    bell(1567.98, now + notes.length * 0.26 + 0.06, 2.4, 0.22);
  }

  const switchToNextMode = useCallback(
    (finishedMode: Mode) => {
      let next: Mode;
      let nextFocusCount = completedFocusCount;
      if (finishedMode === "focus") {
        nextFocusCount = completedFocusCount + 1;
        next = nextFocusCount % LONG_BREAK_EVERY === 0 ? "long" : "short";
        setCompletedFocusCount(nextFocusCount);
      } else {
        next = "focus";
      }
      setMode(next);
      setSecondsLeft(durations[next] * 60);
      setRunning(settings.autoStart);
    },
    [completedFocusCount, durations, settings.autoStart]
  );

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          playChimeRef.current();
          window.setTimeout(() => switchToNextMode(mode), 0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, mode, switchToNextMode]);

  function toggleRunning() {
    ensureAudio();
    setRunning((r) => !r);
  }

  function resetCurrent() {
    setRunning(false);
    setSecondsLeft(durations[mode] * 60);
  }

  function skip() {
    setRunning(false);
    switchToNextMode(mode);
  }

  function switchMode(next: Mode) {
    setRunning(false);
    setMode(next);
    setSecondsLeft(durations[next] * 60);
  }

  function updateDuration(key: Mode, minutes: number) {
    const clamped = Math.min(180, Math.max(1, Math.round(minutes)));
    setSettings((s) => ({ ...s, [key]: clamped }));
    if (mode === key && !running) {
      setSecondsLeft(clamped * 60);
    }
  }

  const total = durations[mode] * 60;
  const progress = total > 0 ? (total - secondsLeft) / total : 0;

  const R = 120;
  const CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - progress);

  const ringColor =
    mode === "focus" ? "#f43f5e" : mode === "short" ? "#22c55e" : "#3b82f6";

  const cyclePos = ((completedFocusCount % LONG_BREAK_EVERY) + (mode === "focus" ? 0 : 1));

  return (
    <main
      className="relative min-h-screen px-4 py-10 text-zinc-800 dark:text-zinc-100"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #fef2f2 0%, #fff7ed 45%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              🍅 番茄鐘
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              專注 {durations.focus} 分鐘，休息一下，再繼續。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => playChimeRef.current()}
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              🔔 測試音效
            </button>
            <button
              onClick={() =>
                setSettings((s) => ({ ...s, muted: !s.muted }))
              }
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

        {/* 模式切換 */}
        <div className="flex justify-center gap-2">
          {(["focus", "short", "long"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                mode === m
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "border border-black/10 bg-white text-zinc-600 hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10"
              }`}
            >
              {MODE_EMOJI[m]} {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        {/* 計時圓環 */}
        <section className="flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <svg
              width={280}
              height={280}
              viewBox="0 0 280 280"
              style={{ width: "clamp(200px, 64vw, 280px)", height: "auto" }}
            >
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
                stroke={ringColor}
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
                {formatTime(secondsLeft)}
              </span>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                {MODE_EMOJI[mode]} {MODE_LABEL[mode]}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRunning}
              className="flex h-14 w-32 items-center justify-center rounded-full text-base font-bold text-white shadow-lg transition active:scale-95"
              style={{ background: ringColor }}
            >
              {running ? "暫停" : secondsLeft === total ? "開始" : "繼續"}
            </button>
            <button
              onClick={resetCurrent}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-lg transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              title="重設本段計時"
            >
              ↺
            </button>
            <button
              onClick={skip}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-white text-lg transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
              title="跳到下一段"
            >
              ⏭
            </button>
          </div>

          {/* 番茄鐘進度點 */}
          <div className="flex items-center gap-2">
            {Array.from({ length: LONG_BREAK_EVERY }, (_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < cyclePos
                    ? "bg-rose-500"
                    : "bg-black/10 dark:bg-white/15"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
              已完成 {completedFocusCount} 個番茄鐘
            </span>
          </div>
        </section>

        {/* 設定 */}
        <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold">時間設定（分鐘）</span>
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={settings.autoStart}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, autoStart: e.target.checked }))
                }
                className="h-4 w-4 accent-rose-500"
              />
              結束後自動開始下一段
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["focus", "short", "long"] as Mode[]).map((m) => (
              <label key={m} className="flex flex-col gap-1 text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">
                  {MODE_EMOJI[m]} {MODE_LABEL[m]}
                </span>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={durations[m]}
                  onChange={(e) => updateDuration(m, Number(e.target.value))}
                  className="rounded-lg border border-black/10 bg-white px-3 py-1.5 font-mono outline-none focus:border-rose-400 dark:border-white/15 dark:bg-black/30"
                />
              </label>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
