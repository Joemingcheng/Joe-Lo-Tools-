"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Level = {
  key: string;
  weight: number;
  desc: string;
  accent: string;
  glow: string;
};

const LEVELS: Level[] = [
  {
    key: "大吉",
    weight: 8,
    desc: "諸事大吉，心想事成的一天！大膽去做吧。",
    accent: "#eab308",
    glow: "rgba(234,179,8,.55)",
  },
  {
    key: "中吉",
    weight: 14,
    desc: "運勢穩定向上，好事正在靠近。",
    accent: "#22c55e",
    glow: "rgba(34,197,94,.5)",
  },
  {
    key: "小吉",
    weight: 16,
    desc: "小小的好運藏在細節裡，留意身邊的驚喜。",
    accent: "#2dd4bf",
    glow: "rgba(45,212,191,.5)",
  },
  {
    key: "吉",
    weight: 18,
    desc: "平順如常，安心去做今天想做的事。",
    accent: "#38bdf8",
    glow: "rgba(56,189,248,.5)",
  },
  {
    key: "末吉",
    weight: 16,
    desc: "運勢後段才會回升，先別太早下定論。",
    accent: "#818cf8",
    glow: "rgba(129,140,248,.5)",
  },
  {
    key: "凶",
    weight: 16,
    desc: "諸事宜謹慎，決定前多想一步。",
    accent: "#f87171",
    glow: "rgba(248,113,113,.5)",
  },
  {
    key: "大凶",
    weight: 6,
    desc: "低潮期，靜下心來充電，也是一種前進。",
    accent: "#b91c1c",
    glow: "rgba(185,28,28,.55)",
  },
];

const CATEGORY_POOL = {
  事業: [
    "工作進度會有意外驚喜",
    "適合主動出擊，爭取機會",
    "團隊合作運佳，多與人討論",
    "宜按部就班，不躁進",
    "會議上小心溝通誤會",
    "適合整理手邊未完成的事",
    "貴人可能就在你身邊",
    "今天適合學一項新技能",
  ],
  愛情: [
    "單身者有機會遇到有趣的人",
    "與伴侶溝通會更順暢",
    "適合主動表達心意",
    "感情運平穩，維持現況即可",
    "小心言語上的小摩擦",
    "多花點時間陪伴重要的人",
    "曖昧對象可能主動聯繫你",
    "感情需要多一點耐心",
  ],
  財運: [
    "投資前請再三確認",
    "適合檢視一下自己的預算",
    "可能有意外的小收入",
    "避免衝動購物",
    "適合規劃長期理財目標",
    "偏財運不錯，但別貪心",
    "獎金或分紅機會浮現",
    "省小錢，賺大方向",
  ],
  健康: [
    "注意睡眠品質",
    "適合安排一次運動",
    "多喝水，留意保養喉嚨",
    "心情放鬆有助恢復體力",
    "留意肩頸痠痛",
    "飲食均衡，少吃刺激性食物",
    "適合安排一次健康檢查",
    "早睡早起，精神會更好",
  ],
} as const;

const ADVICE_POOL = [
  "把握今天，勇敢嘗試新事物",
  "遇到困難時，先深呼吸再行動",
  "多聽聽身邊人的建議",
  "今天適合斷捨離，整理環境",
  "對自己好一點，不用太苛責",
  "專注眼前的小事，累積會成大事",
  "保持微笑，運氣自然靠近",
  "低潮時，休息也是一種前進",
];

const POEMS = [
  "雲開霧散見晴天，事事順心自安然。",
  "靜水流深藏機遇，耐心等待見分明。",
  "風起雲湧變化多，穩紮穩打渡難關。",
  "一分耕耘一分穫，踏實向前莫遲疑。",
  "柳暗花明又一村，轉念之間見光明。",
  "春風化雨潤心田，善緣自來福自全。",
  "登高望遠心自寬，眼前小事莫掛牽。",
  "守拙藏鋒待時機，厚積薄發終有成。",
];

type Category = keyof typeof CATEGORY_POOL;
const CATEGORIES = Object.keys(CATEGORY_POOL) as Category[];

type FortuneResult = {
  level: string;
  desc: string;
  accent: string;
  glow: string;
  poem: string;
  advice: string;
  categories: Record<Category, string>;
};

const STORAGE_RESULT_KEY = "fortune:today";
const STORAGE_MUTED_KEY = "fortune:muted";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function drawLevel(): Level {
  const total = LEVELS.reduce((s, l) => s + l.weight, 0);
  let r = Math.random() * total;
  for (const level of LEVELS) {
    if (r < level.weight) return level;
    r -= level.weight;
  }
  return LEVELS[LEVELS.length - 1];
}

function drawFortune(): FortuneResult {
  const level = drawLevel();
  const categories = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = pick(CATEGORY_POOL[cat]);
    return acc;
  }, {} as Record<Category, string>);
  return {
    level: level.key,
    desc: level.desc,
    accent: level.accent,
    glow: level.glow,
    poem: pick(POEMS),
    advice: pick(ADVICE_POOL),
    categories,
  };
}

export default function FortunePage() {
  const [result, setResult] = useState<FortuneResult | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [muted, setMuted] = useState(false);
  const [savedToday, setSavedToday] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const shakeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "好運抽籤 · Joe-tools";
    try {
      if (localStorage.getItem(STORAGE_MUTED_KEY) === "1") setMuted(true);
      const raw = localStorage.getItem(STORAGE_RESULT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { date: string; result: FortuneResult };
        if (saved.date === todayStr()) {
          setResult(saved.result);
          setRevealed(true);
          setSavedToday(true);
        }
      }
    } catch {}
    return () => {
      if (shakeTimeoutRef.current) window.clearTimeout(shakeTimeoutRef.current);
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

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
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }

  function playClack() {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource();
    src.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3.2;
    bp.frequency.value = 1400 + Math.random() * 500;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.22, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(ac.destination);
    src.start(t);
    src.stop(t + 0.08);
  }

  function playReveal(good: boolean) {
    if (muted) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    const seq = good ? [659.25, 830.61, 987.77, 1318.51] : [440, 392, 349.23];
    seq.forEach((freq, i) => {
      const start = t + i * (good ? 0.13 : 0.19);
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = good ? "triangle" : "sine";
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(good ? 0.18 : 0.14, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + (good ? 0.5 : 0.65));
      o.connect(g).connect(ac.destination);
      o.start(start);
      o.stop(start + (good ? 0.55 : 0.7));
    });
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(STORAGE_MUTED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function draw() {
    if (drawing) return;
    ensureAudio();
    setRevealed(false);
    setDrawing(true);

    let clacks = 0;
    const clackInterval = window.setInterval(() => {
      playClack();
      clacks++;
      if (clacks >= 7) window.clearInterval(clackInterval);
    }, 130);

    shakeTimeoutRef.current = window.setTimeout(() => {
      window.clearInterval(clackInterval);
      const fortune = drawFortune();
      setResult(fortune);
      setDrawing(false);
      setRevealed(true);
      setSavedToday(true);
      try {
        localStorage.setItem(
          STORAGE_RESULT_KEY,
          JSON.stringify({ date: todayStr(), result: fortune })
        );
      } catch {}
      const good = !["凶", "大凶", "末吉"].includes(fortune.level);
      playReveal(good);
    }, 950);
  }

  function drawAgain() {
    setResult(null);
    setRevealed(false);
    setSavedToday(false);
    try {
      localStorage.removeItem(STORAGE_RESULT_KEY);
    } catch {}
    draw();
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-10 text-red-50"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #7f1d1d 0%, #450a0a 55%, #1c0505 100%)",
      }}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight drop-shadow-[0_0_14px_rgba(234,179,8,.5)]">
              🎋 好運抽籤
            </h1>
            <p className="mt-1 text-sm text-red-100/70">
              誠心一抽，看看今天的運勢如何。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-pressed={muted}
              className="rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-100 backdrop-blur transition hover:bg-amber-500/20"
            >
              {muted ? "🔇 靜音" : "🔊 音效"}
            </button>
            <Link
              href="/"
              className="rounded-full border border-amber-300/40 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-100 backdrop-blur transition hover:bg-amber-500/20"
            >
              ← 回首頁
            </Link>
          </div>
        </header>

        <section className="flex flex-col items-center gap-6">
          <button
            onClick={draw}
            disabled={drawing || (savedToday && revealed)}
            className={`relative flex h-40 w-32 flex-col items-center justify-end rounded-b-2xl rounded-t-lg border-4 border-amber-300/70 bg-gradient-to-b from-red-700 to-red-900 pb-4 text-center shadow-[0_0_30px_rgba(234,179,8,.35)] transition disabled:cursor-not-allowed disabled:opacity-60 ${
              drawing ? "animate-[shake_0.13s_ease-in-out_infinite]" : ""
            }`}
          >
            <span className="absolute top-3 text-3xl">🎍</span>
            <span className="text-sm font-bold text-amber-100">
              {drawing ? "搖籤中…" : savedToday && revealed ? "今日已抽" : "點我抽籤"}
            </span>
          </button>

          {savedToday && revealed && !drawing && (
            <button
              onClick={drawAgain}
              className="text-sm text-amber-300 underline hover:text-amber-100"
            >
              不滿意？重新抽一次
            </button>
          )}

          {result && revealed && (
            <div
              className="w-full animate-[pop_0.4s_ease-out] rounded-2xl border-2 bg-[#fdf6e3] px-6 py-6 text-center text-red-950 shadow-2xl"
              style={{ borderColor: result.accent, boxShadow: `0 0 40px ${result.glow}` }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-red-700/70">
                今日運勢
              </div>
              <div
                className="mt-2 text-6xl font-black tracking-widest"
                style={{ color: result.accent, textShadow: `0 0 18px ${result.glow}` }}
              >
                {result.level}
              </div>
              <p className="mt-3 text-sm font-medium text-red-900/80">
                {result.desc}
              </p>
              <p className="mt-4 rounded-lg bg-red-900/5 px-3 py-2 font-serif text-sm italic text-red-800/80">
                「{result.poem}」
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-left text-sm">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    className="rounded-lg border border-red-900/10 bg-white/50 px-3 py-2"
                  >
                    <div className="text-xs font-bold text-red-700">{cat}</div>
                    <div className="mt-0.5 text-red-900/80">
                      {result.categories[cat]}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-100/50 px-3 py-2 text-sm font-medium text-amber-900">
                💡 今日建議：{result.advice}
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: rotate(-4deg) translateX(-2px); }
          50% { transform: rotate(4deg) translateX(2px); }
        }
      `}</style>
    </main>
  );
}
