import Link from "next/link";

type Tool = {
  href: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  gradient: string;
  ring: string;
};

const TOOLS: Tool[] = [
  {
    href: "/lucky-draw",
    emoji: "🎡",
    name: "抽獎轉盤",
    tagline: "聚會、活動抽獎必備",
    description:
      "貼上參加者名單，轉盤會用動畫與音效隨機停在一位中獎者身上，可設定抽完自動移除。",
    gradient: "from-fuchsia-500 to-violet-600",
    ring: "hover:border-fuchsia-400/60 dark:hover:border-fuchsia-400/50",
  },
  {
    href: "/pomodoro",
    emoji: "🍅",
    name: "番茄鐘",
    tagline: "專注工作，好好休息",
    description:
      "25 分鐘專注、5 分鐘短休、15 分鐘長休自動循環，時間到會播放提示音，設定會自動記住。",
    gradient: "from-rose-500 to-orange-500",
    ring: "hover:border-rose-400/60 dark:hover:border-rose-400/50",
  },
  {
    href: "/fortune",
    emoji: "🎋",
    name: "好運抽籤",
    tagline: "每天抽一支，看看手氣",
    description:
      "從大吉到大凶隨機抽出今日運勢，附上事業、愛情、財運、健康提示與一句籤詩。",
    gradient: "from-red-600 to-amber-500",
    ring: "hover:border-amber-400/60 dark:hover:border-amber-400/50",
  },
  {
    href: "/off-work",
    emoji: "🌆",
    name: "下班倒數計時",
    tagline: "撐住，快到點了",
    description:
      "設定上下班時間，即時倒數距離下班還有多久，時間一到會放煙火、播音效慶祝 10 秒。",
    gradient: "from-indigo-600 to-orange-500",
    ring: "hover:border-indigo-400/60 dark:hover:border-indigo-400/50",
  },
  {
    href: "/world-clock",
    emoji: "🌍",
    name: "世界時鐘",
    tagline: "各地時間一目瞭然",
    description:
      "預設台灣、美國、英國、捷克、印度、日本六個時區，也能自訂新增任何國家或城市。",
    gradient: "from-cyan-500 to-indigo-600",
    ring: "hover:border-cyan-400/60 dark:hover:border-cyan-400/50",
  },
  {
    href: "/esp32-pinout",
    emoji: "🔌",
    name: "ESP32 系列規格表",
    tagline: "選型、接線前先查一下",
    description:
      "ESP32、S2、S3、C2、C3、C6、H2 等系列的規格比較與腳位功能對照，含開機檢測、Flash、USB 等注意事項。",
    gradient: "from-emerald-500 to-teal-600",
    ring: "hover:border-emerald-400/60 dark:hover:border-emerald-400/50",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="sticky top-0 z-10 border-b border-black/[.06] bg-zinc-50/80 backdrop-blur dark:border-white/[.08] dark:bg-black/70">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
          <a href="#tools" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-base">
              🧰
            </span>
            <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Joe Lo 的小工具箱
            </span>
          </a>
          <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a
              href="#tools"
              className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
            >
              工具一覽
            </a>
            <a
              href="#about"
              className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
            >
              關於
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden px-6 py-24 sm:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute left-1/2 top-[-10%] h-72 w-72 -translate-x-[60%] rounded-full bg-fuchsia-400/25 blur-3xl dark:bg-fuchsia-500/15" />
            <div className="absolute left-1/2 top-[-6%] h-72 w-72 translate-x-[10%] rounded-full bg-rose-400/25 blur-3xl dark:bg-rose-500/15" />
            <div className="absolute left-1/2 top-[8%] h-72 w-72 translate-x-[80%] rounded-full bg-amber-400/25 blur-3xl dark:bg-amber-500/15" />
          </div>

          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <span className="rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-zinc-600 backdrop-blur dark:border-white/15 dark:bg-white/5 dark:text-zinc-300">
              持續新增中・目前 {TOOLS.length} 個工具
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
              嗨，這裡是{" "}
              <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 bg-clip-text text-transparent">
                Joe Lo 的小工具箱
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              一些自己開發、隨手就能用的小工具，簡單、有趣，
              不需要註冊，打開就能開始用。
            </p>
            <a
              href="#tools"
              className="mt-2 flex h-12 items-center justify-center rounded-full bg-zinc-900 px-7 text-base font-semibold text-white shadow-lg shadow-zinc-900/10 transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              看看有哪些工具 ↓
            </a>
          </div>
        </section>

        {/* Tools */}
        <section id="tools" className="px-6 pb-24">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex flex-col items-center gap-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                工具一覽
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                點卡片就能直接開始使用
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TOOLS.map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group flex flex-col gap-4 rounded-2xl border border-black/[.08] bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-xl dark:border-white/[.1] dark:bg-white/[.04] ${tool.ring}`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-2xl ${tool.gradient}`}
                  >
                    {tool.emoji}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                      {tool.name}
                    </h3>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                      {tool.tagline}
                    </p>
                  </div>
                  <p className="flex-1 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {tool.description}
                  </p>
                  <span className="flex items-center gap-1 text-sm font-semibold text-zinc-900 transition group-hover:gap-2 dark:text-zinc-50">
                    立即使用
                    <span aria-hidden>→</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="border-t border-black/[.06] px-6 py-16 dark:border-white/[.08]">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 text-center">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              關於這個工具箱
            </h2>
            <p className="max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
              這裡收集一些日常會用到的小工具，用 Next.js 做成網頁版，
              不用安裝、開瀏覽器就能用。之後想到什麼好玩的小工具，
              也會陸續加進來。
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[.06] px-6 py-8 dark:border-white/[.08]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-xs text-zinc-500 sm:flex-row sm:justify-between sm:text-left dark:text-zinc-500">
          <span>© {new Date().getFullYear()} Joe Lo 的小工具箱</span>
          <span>Built with Next.js</span>
        </div>
      </footer>
    </div>
  );
}
