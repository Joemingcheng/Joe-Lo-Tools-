"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "worldclock:clocks";

type ClockEntry = {
  tz: string;
  label: string;
  flag: string;
};

const DEFAULT_CLOCKS: ClockEntry[] = [
  { tz: "Asia/Taipei", label: "台灣", flag: "🇹🇼" },
  { tz: "America/New_York", label: "美國（紐約）", flag: "🇺🇸" },
  { tz: "Europe/London", label: "英國", flag: "🇬🇧" },
  { tz: "Europe/Prague", label: "捷克", flag: "🇨🇿" },
  { tz: "Asia/Kolkata", label: "印度", flag: "🇮🇳" },
  { tz: "Asia/Tokyo", label: "日本", flag: "🇯🇵" },
];

const FALLBACK_TIMEZONES = [
  "Pacific/Midway",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Berlin",
  "Europe/Athens",
  "Europe/Moscow",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function getTimezoneList(): string[] {
  try {
    const intlWithZones = Intl as unknown as {
      supportedValuesOf?: (key: string) => string[];
    };
    const list = intlWithZones.supportedValuesOf?.("timeZone");
    if (list && list.length > 0) return list;
  } catch {}
  return FALLBACK_TIMEZONES;
}

function loadClocks(): ClockEntry[] {
  if (typeof window === "undefined") return DEFAULT_CLOCKS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CLOCKS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_CLOCKS;
  } catch {
    return DEFAULT_CLOCKS;
  }
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function zonedParts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("zh-TW", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday,
  };
}

function offsetMinutes(date: Date, parts: ReturnType<typeof zonedParts>) {
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return Math.round((asUTC - date.getTime()) / 60000);
}

function formatOffset(minutes: number) {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${pad2(h)}:${pad2(m)}`;
}

function formatDiff(minutes: number) {
  if (minutes === 0) return "與本地時間相同";
  const sign = minutes > 0 ? "快" : "慢";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `比本地${sign} ${h}${m ? ` 小時 ${m} 分` : " 小時"}`;
}

function tzShortName(tz: string) {
  const parts = tz.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
}

export default function WorldClockPage() {
  const [clocks, setClocks] = useState<ClockEntry[]>(DEFAULT_CLOCKS);
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [selectedTz, setSelectedTz] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  const timezoneList = useMemo(() => getTimezoneList(), []);

  useEffect(() => {
    document.title = "世界時鐘 · Joe-tools";
    setClocks(loadClocks());
    setNow(new Date());
    setHydrated(true);
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clocks));
    } catch {}
  }, [clocks, hydrated]);

  const localOffset = now ? -now.getTimezoneOffset() : 0;

  const sortedClocks = useMemo(() => {
    if (!now) return clocks;
    return [...clocks].sort((a, b) => {
      const oa = offsetMinutes(now, zonedParts(now, a.tz));
      const ob = offsetMinutes(now, zonedParts(now, b.tz));
      return oa - ob;
    });
  }, [clocks, now]);

  function removeClock(tz: string) {
    setClocks((cs) => cs.filter((c) => c.tz !== tz));
  }

  function restoreDefaults() {
    setClocks(DEFAULT_CLOCKS);
  }

  function addCustom() {
    if (!selectedTz) return;
    if (clocks.some((c) => c.tz === selectedTz)) return;
    const label = customLabel.trim() || tzShortName(selectedTz);
    setClocks((cs) => [...cs, { tz: selectedTz, label, flag: "🌐" }]);
    setSelectedTz("");
    setCustomLabel("");
  }

  return (
    <main
      className="relative min-h-screen px-4 py-10 text-zinc-800"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #ecfeff 0%, #eef2ff 45%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              🌍 世界時鐘
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              一次看懂各地現在幾點，也可以新增你自己的城市。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={restoreDefaults}
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              ↺ 恢復預設 6 國
            </button>
            <Link
              href="/"
              className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              ← 回首頁
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedClocks.map((clock) => {
            if (!now) {
              return (
                <div
                  key={clock.tz}
                  className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/70 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <div className="text-sm font-semibold">
                    {clock.flag} {clock.label}
                  </div>
                  <div className="text-4xl font-black tabular-nums tracking-tight text-zinc-300 dark:text-zinc-700">
                    --:--:--
                  </div>
                </div>
              );
            }

            const parts = zonedParts(now, clock.tz);
            const off = offsetMinutes(now, parts);
            const diff = off - localOffset;
            const isDay = parts.hour >= 6 && parts.hour < 18;
            const isLocal = off === localOffset;

            return (
              <div
                key={clock.tz}
                className={`group relative flex flex-col gap-3 rounded-2xl border bg-white/70 p-5 backdrop-blur transition dark:bg-white/5 ${
                  isLocal
                    ? "border-indigo-400/60 shadow-[0_0_0_1px_rgba(99,102,241,.35)]"
                    : "border-black/10 dark:border-white/10"
                }`}
              >
                <button
                  onClick={() => removeClock(clock.tz)}
                  aria-label={`移除 ${clock.label}`}
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 opacity-0 transition hover:bg-black/[.06] hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-zinc-200"
                >
                  ✕
                </button>

                <div className="flex items-center gap-2 pr-6">
                  <span className="text-lg">{clock.flag}</span>
                  <span className="text-sm font-semibold">{clock.label}</span>
                  {isLocal && (
                    <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300">
                      本地
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tabular-nums tracking-tight">
                    {pad2(parts.hour)}:{pad2(parts.minute)}:{pad2(parts.second)}
                  </span>
                  <span className="text-base">{isDay ? "☀️" : "🌙"}</span>
                </div>

                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {parts.year}/{pad2(parts.month)}/{pad2(parts.day)}（{parts.weekday}）
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-black/10 bg-black/[.03] px-2 py-0.5 font-mono text-zinc-600 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
                    {formatOffset(off)}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {isLocal ? "與本地時間相同" : formatDiff(diff)}
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 text-sm font-semibold">➕ 新增自訂地區</div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 min-w-[220px] flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">時區</span>
              <select
                value={selectedTz}
                onChange={(e) => setSelectedTz(e.target.value)}
                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-black/30"
              >
                <option value="">請選擇時區…</option>
                {timezoneList.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-1 min-w-[160px] flex-col gap-1 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                顯示名稱（選填）
              </span>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder={selectedTz ? tzShortName(selectedTz) : "例如：新加坡"}
                className="rounded-lg border border-black/10 bg-white px-3 py-1.5 outline-none focus:border-indigo-400 dark:border-white/15 dark:bg-black/30"
              />
            </label>
            <button
              onClick={addCustom}
              disabled={!selectedTz || clocks.some((c) => c.tz === selectedTz)}
              className="h-[38px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              新增
            </button>
          </div>
          {selectedTz && clocks.some((c) => c.tz === selectedTz) && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              這個時區已經在清單裡了。
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
