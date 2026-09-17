"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type CpuCat = "xtensa2" | "xtensa1" | "riscv1" | "riscv2";
type WifiCat = "none" | "wifi4" | "wifi6";

type SeriesSpec = {
  id: string;
  name: string;
  short: string;
  accent: string;
  cpu: string;
  cpuCat: CpuCat;
  freq: string;
  sram: string;
  ramKB: number;
  wifi: string;
  wifiCat: WifiCat;
  bt: string;
  hasBt: boolean;
  proto154: string;
  has154: boolean;
  flash: string;
  flashMaxMB: number;
  gpio: string;
  gpioMax: number;
  adc: string;
  touch: string;
  usb: string;
  pkg: string;
  note: string;
};

type PinInfo = {
  id: string;
  name: string;
  strapping: string;
  flashReserved: string;
  usbPins: string;
  jtagPins: string;
  uart0: string;
  adcPins: string;
  touchPins: string;
  inputOnly: string;
  caution: string;
};

const SERIES: SeriesSpec[] = [
  {
    id: "esp32",
    name: "ESP32（原始版）",
    short: "ESP32",
    accent: "#334155",
    cpu: "Xtensa LX6 雙核",
    cpuCat: "xtensa2",
    freq: "最高 240 MHz",
    sram: "520 KB",
    ramKB: 520,
    wifi: "Wi-Fi 4（2.4G, 802.11b/g/n）",
    wifiCat: "wifi4",
    bt: "BT 4.2（傳統 + BLE）",
    hasBt: true,
    proto154: "無",
    has154: false,
    flash: "晶片本身不含內嵌 Flash，模組（WROOM/WROVER）常見 4／8／16 MB，WROVER 另加 8 MB PSRAM",
    flashMaxMB: 16,
    gpio: "34（其中 6 隻 34–39 僅能輸入）",
    gpioMax: 34,
    adc: "2×12-bit SAR，共 18 通道",
    touch: "10",
    usb: "無原生 USB，開發板多外接 CP2102／CH340 等 USB-UART 橋接晶片",
    pkg: "QFN48（5×5／6×6）",
    note: "資源最成熟、範例最多的經典款；ADC2 在 Wi-Fi 啟用時無法使用，類比腳位盡量選 ADC1（GPIO32–39）。",
  },
  {
    id: "esp32-s2",
    name: "ESP32-S2",
    short: "S2",
    accent: "#7c3aed",
    cpu: "Xtensa LX7 單核",
    cpuCat: "xtensa1",
    freq: "最高 240 MHz",
    sram: "320 KB",
    ramKB: 320,
    wifi: "Wi-Fi 4（2.4G）",
    wifiCat: "wifi4",
    bt: "無藍牙",
    hasBt: false,
    proto154: "無",
    has154: false,
    flash: "模組常見 4 MB（部分精簡版 2 MB），可選內嵌 PSRAM 版本",
    flashMaxMB: 4,
    gpio: "43",
    gpioMax: 43,
    adc: "2×12-bit SAR，共 20 通道",
    touch: "14",
    usb: "原生 USB OTG（GPIO19 D-／GPIO20 D+）",
    pkg: "QFN56（7×7）",
    note: "沒有藍牙，換來最多 GPIO／ADC／觸控腳位＋原生 USB，適合觸控面板、USB 裝置模擬等單晶片直連應用。",
  },
  {
    id: "esp32-s3",
    name: "ESP32-S3",
    short: "S3",
    accent: "#c026d3",
    cpu: "Xtensa LX7 雙核（含 AI 向量指令）",
    cpuCat: "xtensa2",
    freq: "最高 240 MHz",
    sram: "512 KB",
    ramKB: 512,
    wifi: "Wi-Fi 4（2.4G）",
    wifiCat: "wifi4",
    bt: "BLE 5",
    hasBt: true,
    proto154: "無",
    has154: false,
    flash: "模組後綴依配置而異，常見 N4R2／N8R2／N16R8（4–16 MB Flash，0–8 MB PSRAM）",
    flashMaxMB: 16,
    gpio: "45（實際可用腳位依模組封裝而定）",
    gpioMax: 45,
    adc: "2×12-bit SAR，ADC1／ADC2 各 10 通道",
    touch: "14",
    usb: "原生 USB OTG ＋ USB Serial/JTAG（共用 GPIO19 D-／GPIO20 D+）",
    pkg: "QFN56（7×7）",
    note: "S 系列旗艦，GPIO／資源最多，內建 AI 加速指令適合 TinyML、影像辨識；ADC2 同樣不建議與 Wi-Fi 同時使用。",
  },
  {
    id: "esp32-c2",
    name: "ESP32-C2",
    short: "C2",
    accent: "#0ea5e9",
    cpu: "RISC-V 單核",
    cpuCat: "riscv1",
    freq: "最高 120 MHz",
    sram: "272 KB",
    ramKB: 272,
    wifi: "Wi-Fi 4（2.4G）",
    wifiCat: "wifi4",
    bt: "BLE 5",
    hasBt: true,
    proto154: "無",
    has154: false,
    flash: "模組常見 2／4 MB（僅內嵌 Flash，無 PSRAM）",
    flashMaxMB: 4,
    gpio: "14",
    gpioMax: 14,
    adc: "1×12-bit SAR，5 通道",
    touch: "無",
    usb: "無原生 USB，需外接 USB-UART 橋接晶片",
    pkg: "QFN24（4×4，全系列最小）",
    note: "主打極低成本／最小封裝，資源最精簡，適合大量部署的入門 Wi-Fi + BLE 連網裝置。",
  },
  {
    id: "esp32-c3",
    name: "ESP32-C3",
    short: "C3",
    accent: "#2563eb",
    cpu: "RISC-V 單核",
    cpuCat: "riscv1",
    freq: "最高 160 MHz",
    sram: "400 KB",
    ramKB: 400,
    wifi: "Wi-Fi 4（2.4G）",
    wifiCat: "wifi4",
    bt: "BLE 5",
    hasBt: true,
    proto154: "無",
    has154: false,
    flash: "模組常見 4／8 MB（如 C3-MINI），無 PSRAM",
    flashMaxMB: 8,
    gpio: "22（部分精簡模組僅 16）",
    gpioMax: 22,
    adc: "2×12-bit SAR，ADC1 5 通道＋ADC2 1 通道",
    touch: "無",
    usb: "USB Serial/JTAG（GPIO18 D-／GPIO19 D+，僅供燒錄／除錯／CDC，非 USB Host）",
    pkg: "QFN32（5×5）",
    note: "取代 ESP8266 的高 CP 值首選，RISC-V 入門款，適合單純 Wi-Fi + BLE 感測／控制應用。",
  },
  {
    id: "esp32-c6",
    name: "ESP32-C6",
    short: "C6",
    accent: "#059669",
    cpu: "RISC-V 主核（HP）＋低功耗副核（LP）",
    cpuCat: "riscv1",
    freq: "HP 最高 160 MHz／LP 最高 20 MHz",
    sram: "512 KB（HP）＋16 KB（LP）",
    ramKB: 512,
    wifi: "Wi-Fi 6（2.4G, 802.11ax）",
    wifiCat: "wifi6",
    bt: "BLE 5",
    hasBt: true,
    proto154: "支援（Zigbee／Thread／Matter）",
    has154: true,
    flash: "模組常見 4／8 MB，無內嵌 PSRAM",
    flashMaxMB: 8,
    gpio: "30（QFN40）／22（QFN32）",
    gpioMax: 30,
    adc: "1×12-bit SAR，7 通道",
    touch: "無",
    usb: "USB Serial/JTAG（GPIO12 D-／GPIO13 D+，非 USB Host）",
    pkg: "QFN40（5×5）／QFN32（5×5）",
    note: "目前主流中唯一同時具備 Wi-Fi 6＋BLE 5＋802.15.4，是 Matter／Thread 智慧家庭閘道器的首選。",
  },
  {
    id: "esp32-h2",
    name: "ESP32-H2",
    short: "H2",
    accent: "#d97706",
    cpu: "RISC-V 單核",
    cpuCat: "riscv1",
    freq: "最高 96 MHz",
    sram: "320 KB（＋4 KB LP）",
    ramKB: 320,
    wifi: "無",
    wifiCat: "none",
    bt: "BLE 5",
    hasBt: true,
    proto154: "支援（Zigbee／Thread／Matter）",
    has154: true,
    flash: "模組常見 2／4 MB",
    flashMaxMB: 4,
    gpio: "19",
    gpioMax: 19,
    adc: "1×12-bit SAR，5 通道",
    touch: "無",
    usb: "USB Serial/JTAG（GPIO26 D-／GPIO27 D+，非 USB Host）",
    pkg: "QFN32（4×4）",
    note: "沒有 Wi-Fi，專攻 BLE＋802.15.4 的低功耗終端節點，常搭配具 Wi-Fi 的 C6／主機當閘道器使用。",
  },
];

const NEWER_SERIES: SeriesSpec[] = [
  {
    id: "esp32-c5",
    name: "ESP32-C5",
    short: "C5",
    accent: "#0d9488",
    cpu: "RISC-V 單核",
    cpuCat: "riscv1",
    freq: "最高 240 MHz",
    sram: "384 KB",
    ramKB: 384,
    wifi: "Wi-Fi 6（2.4G + 5G 雙頻）",
    wifiCat: "wifi6",
    bt: "BLE 5",
    hasBt: true,
    proto154: "支援（Zigbee／Thread）",
    has154: true,
    flash: "模組常見 4 MB，可選 16–32 MB PSRAM",
    flashMaxMB: 4,
    gpio: "29",
    gpioMax: 29,
    adc: "1×12-bit SAR，6 通道",
    touch: "無",
    usb: "USB Serial/JTAG（非 USB Host）",
    pkg: "QFN48／LGA48（6×6）",
    note: "少數同時支援 5 GHz Wi-Fi 6 的型號，量產時間較新，正式選型前請務必核對最新官方資料手冊。",
  },
  {
    id: "esp32-c61",
    name: "ESP32-C61",
    short: "C61",
    accent: "#0891b2",
    cpu: "RISC-V 單核",
    cpuCat: "riscv1",
    freq: "最高 160 MHz",
    sram: "320 KB",
    ramKB: 320,
    wifi: "Wi-Fi 6（2.4G）",
    wifiCat: "wifi6",
    bt: "BLE 5",
    hasBt: true,
    proto154: "無",
    has154: false,
    flash: "模組常見 4 MB，可選 2–8 MB PSRAM",
    flashMaxMB: 4,
    gpio: "30",
    gpioMax: 30,
    adc: "1×12-bit SAR，4 通道",
    touch: "無",
    usb: "USB Serial/JTAG（非 USB Host）",
    pkg: "QFN40／LGA40（5×5）",
    note: "2025 年量產的新型號，定位為 C6 的成本優化版（拿掉 802.15.4）；資料較新，請以官方資料手冊為準。",
  },
  {
    id: "esp32-p4",
    name: "ESP32-P4",
    short: "P4",
    accent: "#e11d48",
    cpu: "RISC-V 雙核",
    cpuCat: "riscv2",
    freq: "最高 400 MHz",
    sram: "768 KB",
    ramKB: 768,
    wifi: "無（需外接 C6／C5／ESP-Hosted 提供聯網）",
    wifiCat: "none",
    bt: "無",
    hasBt: false,
    proto154: "無",
    has154: false,
    flash: "僅支援外接 Flash，可選 16–32 MB PSRAM",
    flashMaxMB: 0,
    gpio: "55",
    gpioMax: 55,
    adc: "14 通道，12-bit",
    touch: "14",
    usb: "USB 2.0 OTG ＋ USB Serial/JTAG",
    pkg: "QFN104（10×10）",
    note: "無線功能，定位為高效能應用處理器（HMI／視覺／MIPI 攝影機與螢幕），需外接 Wi-Fi/BT 晶片才能連網。",
  },
];

const PINS: PinInfo[] = [
  {
    id: "esp32",
    name: "ESP32（原始版）",
    strapping: "GPIO0、GPIO2、GPIO5、MTDI（GPIO12）、MTDO（GPIO15）",
    flashReserved: "GPIO6–11、GPIO16–17（內部／外部 Flash・PSRAM 通訊用，不建議挪用）",
    usbPins: "無原生 USB",
    jtagPins: "MTDI／MTCK／MTMS／MTDO（GPIO12、13、14、15）",
    uart0: "U0TXD＝GPIO1，U0RXD＝GPIO3（燒錄／Log 用，開發時避免占用）",
    adcPins: "ADC1：GPIO32–39；ADC2：GPIO0、2、4、12–15、25–27（Wi-Fi 開啟時 ADC2 不可用）",
    touchPins: "T0–T9 對應 GPIO4、0、2、15、13、12、14、27、33、32",
    inputOnly: "GPIO34–39（無輸出、無內建上下拉電阻，只能當輸入／類比）",
    caution: "GPIO0／2／5／12／15 為開機檢測腳位，開機瞬間電位會影響開機模式，外部電路避免在重置期間拉錯電位。",
  },
  {
    id: "esp32-s2",
    name: "ESP32-S2",
    strapping: "GPIO0（開機模式）、GPIO45（VDD_SPI 電壓）、GPIO46（開機模式／Log 輸出，僅能輸入）",
    flashReserved: "GPIO26–32（SPI0/1 主要腳位）；8-line 模式下再加 GPIO33–37",
    usbPins: "USB OTG：GPIO19（D-）／GPIO20（D+）",
    jtagPins: "MTDI／MTCK／MTMS／MTDO（GPIO39–42）",
    uart0: "U0TXD＝GPIO43，U0RXD＝GPIO44",
    adcPins: "ADC1／ADC2 共用 GPIO1–20，總計最多 20 通道",
    touchPins: "GPIO1–14 均支援觸控",
    inputOnly: "GPIO46（固定僅能輸入）",
    caution: "GPIO45／46 上電時的預設電位會決定 VDD_SPI 電壓與開機訊息輸出，外接電路需留意。",
  },
  {
    id: "esp32-s3",
    name: "ESP32-S3",
    strapping: "GPIO0、GPIO3、GPIO45（VDD_SPI 電壓）、GPIO46",
    flashReserved: "GPIO26–32（Flash／PSRAM 基本腳位）；Octal Flash／PSRAM 模組再加占用 GPIO33–37",
    usbPins: "USB OTG／USB Serial-JTAG 共用：GPIO19（D-）／GPIO20（D+，上電瞬間有約 60µs 高電位毛刺，注意周邊電路）",
    jtagPins: "另有獨立 JTAG：MTDO/MTDI/MTCK/MTMS 可經由 IO MUX 或 USB Serial/JTAG 使用",
    uart0: "U0TXD＝GPIO43，U0RXD＝GPIO44",
    adcPins: "ADC1：GPIO1–10（10 通道）；ADC2：GPIO11–20（10 通道，Wi-Fi 開啟時不建議使用）",
    touchPins: "GPIO1–14 均支援觸控（GPIO3 同時是開機檢測腳位，需留意）",
    inputOnly: "無（所有 GPIO 皆可輸出）",
    caution: "GPIO35–37 若模組使用 Octal PSRAM／Flash 會被占用；選板時請核對模組型號後綴（N/R）。",
  },
  {
    id: "esp32-c3",
    name: "ESP32-C3",
    strapping: "GPIO2、GPIO8、GPIO9（開機模式）",
    flashReserved: "GPIO12–17（SPIHD／SPIWP／SPICS0／SPICLK／SPID／SPIQ，內嵌 Flash 通訊用）",
    usbPins: "USB Serial/JTAG：GPIO18（D-）／GPIO19（D+，僅供燒錄／除錯／USB-CDC，非 USB Host）",
    jtagPins: "GPIO4–7 可切換為 JTAG（MTMS/MTDI/MTCK/MTDO）",
    uart0: "U0TXD＝GPIO21，U0RXD＝GPIO20",
    adcPins: "ADC1：GPIO0–4（5 通道）；ADC2：GPIO5（1 通道，Wi-Fi 開啟時不建議使用）",
    touchPins: "不支援電容觸控",
    inputOnly: "無",
    caution: "GPIO8／9 為開機模式腳位，同時常接板載 LED／BOOT 按鈕，外接元件時留意開機瞬間電位。",
  },
  {
    id: "esp32-c6",
    name: "ESP32-C6",
    strapping: "GPIO8、GPIO9（開機模式）、GPIO15（JTAG 訊號來源選擇）、MTMS／MTDI",
    flashReserved: "GPIO24–30（SPICS0／SPIQ／SPIWP／SPIHD／SPICLK／SPID，內嵌 Flash 通訊用）",
    usbPins: "USB Serial/JTAG：GPIO12（D-）／GPIO13（D+，僅供燒錄／除錯，非 USB Host）",
    jtagPins: "GPIO4–7 可切換為 JTAG",
    uart0: "U0TXD＝GPIO16，U0RXD＝GPIO17",
    adcPins: "ADC1：GPIO0–6（7 通道）",
    touchPins: "不支援電容觸控",
    inputOnly: "無",
    caution: "GPIO27 對應 VDD_SPI，僅在有外部 Flash 供電需求時使用；GPIO12／13 預設為 USB，改當一般 GPIO 需先停用 USB Serial/JTAG。",
  },
  {
    id: "esp32-h2",
    name: "ESP32-H2",
    strapping: "GPIO8、GPIO9（開機模式）、GPIO25（JTAG 訊號來源選擇）",
    flashReserved: "GPIO0、GPIO2–5（SPI2／內嵌 Flash 通訊用）",
    usbPins: "USB Serial/JTAG：GPIO26（D-）／GPIO27（D+，與 FSPICS4／FSPICS5 共用，非 USB Host）",
    jtagPins: "GPIO2–5 可切換為 JTAG",
    uart0: "U0TXD＝GPIO24，U0RXD＝GPIO23",
    adcPins: "ADC1：5 通道（對應 GPIO1–5）",
    touchPins: "不支援電容觸控",
    inputOnly: "無",
    caution: "全系列 GPIO 數最少（19 隻），設計電路前務必先扣掉開機／Flash／USB／UART 占用的腳位，確認剩餘可用腳位是否足夠。",
  },
];

const CPU_OPTIONS: { value: CpuCat | "all"; label: string }[] = [
  { value: "all", label: "不限" },
  { value: "xtensa2", label: "Xtensa 雙核" },
  { value: "xtensa1", label: "Xtensa 單核" },
  { value: "riscv1", label: "RISC-V 單核" },
  { value: "riscv2", label: "RISC-V 雙核" },
];

const FLASH_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "2", label: "2 MB 以上" },
  { value: "4", label: "4 MB 以上" },
  { value: "8", label: "8 MB 以上" },
  { value: "16", label: "16 MB 以上" },
];

const RAM_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "250", label: "250 KB 以上" },
  { value: "320", label: "320 KB 以上" },
  { value: "400", label: "400 KB 以上" },
  { value: "500", label: "500 KB 以上" },
  { value: "700", label: "700 KB 以上" },
];

const WIFI_OPTIONS: { value: WifiCat | "all"; label: string }[] = [
  { value: "all", label: "不限" },
  { value: "none", label: "無 Wi-Fi" },
  { value: "wifi4", label: "Wi-Fi 4" },
  { value: "wifi6", label: "Wi-Fi 6" },
];

const BT_OPTIONS = [
  { value: "all", label: "不限" },
  { value: "has", label: "有藍牙" },
  { value: "none", label: "無藍牙" },
];

const PROTO154_OPTIONS = [
  { value: "all", label: "不限" },
  { value: "yes", label: "支援" },
  { value: "no", label: "不支援" },
];

const GPIO_OPTIONS = [
  { value: "0", label: "不限" },
  { value: "14", label: "14 以上" },
  { value: "20", label: "20 以上" },
  { value: "30", label: "30 以上" },
  { value: "40", label: "40 以上" },
  { value: "50", label: "50 以上" },
];

function ChipIcon({
  accent,
  label,
  size = 64,
}: {
  accent: string;
  label: string;
  size?: number;
}) {
  const pad = size * 0.24;
  const body = size - pad * 2;
  const pinLen = pad * 0.72;
  const pinW = Math.max(1.5, body / 14);
  const pinsPerSide = 5;
  const gap = body / pinsPerSide;
  const starts = Array.from(
    { length: pinsPerSide },
    (_, i) => pad + gap * i + gap / 2 - pinW / 2
  );

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0"
      aria-hidden
    >
      {starts.map((x, i) => (
        <rect key={`t${i}`} x={x} y={pad - pinLen} width={pinW} height={pinLen} fill="#94a3b8" />
      ))}
      {starts.map((x, i) => (
        <rect key={`b${i}`} x={x} y={pad + body} width={pinW} height={pinLen} fill="#94a3b8" />
      ))}
      {starts.map((y, i) => (
        <rect key={`l${i}`} x={pad - pinLen} y={y} width={pinLen} height={pinW} fill="#94a3b8" />
      ))}
      {starts.map((y, i) => (
        <rect key={`r${i}`} x={pad + body} y={y} width={pinLen} height={pinW} fill="#94a3b8" />
      ))}
      <rect x={pad} y={pad} width={body} height={body} rx={size * 0.06} fill={accent} />
      <circle
        cx={pad + body * 0.16}
        cy={pad + body * 0.16}
        r={size * 0.03}
        fill="#ffffff"
        opacity={0.85}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#ffffff"
        fontSize={size * (label.length > 3 ? 0.19 : 0.24)}
        fontWeight={800}
        fontFamily="ui-monospace, SFMono-Regular, monospace"
      >
        {label}
      </text>
    </svg>
  );
}

function norm(s: string) {
  return s.toLowerCase();
}

export default function Esp32PinoutPage() {
  const [query, setQuery] = useState("");
  const [cpuFilter, setCpuFilter] = useState<CpuCat | "all">("all");
  const [flashFilter, setFlashFilter] = useState("0");
  const [ramFilter, setRamFilter] = useState("0");
  const [wifiFilter, setWifiFilter] = useState<WifiCat | "all">("all");
  const [btFilter, setBtFilter] = useState("all");
  const [proto154Filter, setProto154Filter] = useState("all");
  const [gpioFilter, setGpioFilter] = useState("0");

  const activeFilterCount = [
    cpuFilter !== "all",
    flashFilter !== "0",
    ramFilter !== "0",
    wifiFilter !== "all",
    btFilter !== "all",
    proto154Filter !== "all",
    gpioFilter !== "0",
  ].filter(Boolean).length;

  function resetFilters() {
    setQuery("");
    setCpuFilter("all");
    setFlashFilter("0");
    setRamFilter("0");
    setWifiFilter("all");
    setBtFilter("all");
    setProto154Filter("all");
    setGpioFilter("0");
  }

  useEffect(() => {
    document.title = "ESP32 系列規格與腳位表 · Joe-tools";
  }, []);

  const q = norm(query.trim());

  function matchesFilters(s: SeriesSpec) {
    if (cpuFilter !== "all" && s.cpuCat !== cpuFilter) return false;
    if (Number(flashFilter) > 0 && s.flashMaxMB < Number(flashFilter)) return false;
    if (Number(ramFilter) > 0 && s.ramKB < Number(ramFilter)) return false;
    if (wifiFilter !== "all" && s.wifiCat !== wifiFilter) return false;
    if (btFilter === "has" && !s.hasBt) return false;
    if (btFilter === "none" && s.hasBt) return false;
    if (proto154Filter === "yes" && !s.has154) return false;
    if (proto154Filter === "no" && s.has154) return false;
    if (Number(gpioFilter) > 0 && s.gpioMax < Number(gpioFilter)) return false;
    if (
      q &&
      ![s.name, s.cpu, s.wifi, s.bt, s.proto154, s.usb, s.note]
        .join(" ")
        .toLowerCase()
        .includes(q)
    )
      return false;
    return true;
  }

  const filteredSeries = useMemo(
    () => SERIES.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, cpuFilter, flashFilter, ramFilter, wifiFilter, btFilter, proto154Filter, gpioFilter]
  );

  const filteredNewer = useMemo(
    () => NEWER_SERIES.filter(matchesFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, cpuFilter, flashFilter, ramFilter, wifiFilter, btFilter, proto154Filter, gpioFilter]
  );

  const filteredPins = useMemo(() => {
    const ids = new Set(filteredSeries.map((s) => s.id));
    return PINS.filter((p) => ids.has(p.id));
  }, [filteredSeries]);

  const totalMatches = filteredSeries.length + filteredNewer.length;

  function selectHandler(setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLSelectElement>) => setter(e.target.value);
  }

  return (
    <main
      className="relative min-h-screen px-4 py-10 text-zinc-800 dark:text-zinc-100"
      style={{
        background:
          "radial-gradient(120% 120% at 50% 0%, #ecfdf5 0%, #eff6ff 45%, #ffffff 100%)",
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              🔌 ESP32 系列規格與腳位表
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              主流 ESP32 系列的規格比較與腳位功能，選型、接線前先查一下。
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-black/10 bg-white px-4 py-1.5 text-sm font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            ← 回首頁
          </Link>
        </header>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋型號或關鍵字，例如：usb、觸控、matter…"
            className="w-full rounded-full border border-black/10 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-400 dark:border-white/15 dark:bg-white/5"
          />
          {(query || activeFilterCount > 0) && (
            <button
              onClick={resetFilters}
              className="shrink-0 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium transition hover:bg-black/[.04] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10"
            >
              清除全部
            </button>
          )}
        </div>

        {/* 篩選器 */}
        <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">🎛️ 篩選器</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              符合 {totalMatches} 個系列
              {activeFilterCount > 0 && `・已套用 ${activeFilterCount} 個條件`}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <FilterSelect
              label="CPU"
              value={cpuFilter}
              onChange={selectHandler((v) => setCpuFilter(v as CpuCat | "all"))}
              options={CPU_OPTIONS}
            />
            <FilterSelect
              label="Flash"
              value={flashFilter}
              onChange={selectHandler(setFlashFilter)}
              options={FLASH_OPTIONS}
            />
            <FilterSelect
              label="RAM"
              value={ramFilter}
              onChange={selectHandler(setRamFilter)}
              options={RAM_OPTIONS}
            />
            <FilterSelect
              label="Wi-Fi"
              value={wifiFilter}
              onChange={selectHandler((v) => setWifiFilter(v as WifiCat | "all"))}
              options={WIFI_OPTIONS}
            />
            <FilterSelect
              label="藍牙"
              value={btFilter}
              onChange={selectHandler(setBtFilter)}
              options={BT_OPTIONS}
            />
            <FilterSelect
              label="802.15.4"
              value={proto154Filter}
              onChange={selectHandler(setProto154Filter)}
              options={PROTO154_OPTIONS}
            />
            <FilterSelect
              label="GPIO"
              value={gpioFilter}
              onChange={selectHandler(setGpioFilter)}
              options={GPIO_OPTIONS}
            />
          </div>
        </section>

        {/* 規格比較表 */}
        <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h2 className="mb-3 text-lg font-bold">📋 主流系列規格比較</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1020px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                  <th className="whitespace-nowrap px-3 py-2">系列</th>
                  <th className="whitespace-nowrap px-3 py-2">CPU</th>
                  <th className="whitespace-nowrap px-3 py-2">主頻</th>
                  <th className="whitespace-nowrap px-3 py-2">SRAM</th>
                  <th className="whitespace-nowrap px-3 py-2">Wi-Fi</th>
                  <th className="whitespace-nowrap px-3 py-2">藍牙</th>
                  <th className="whitespace-nowrap px-3 py-2">802.15.4</th>
                  <th className="whitespace-nowrap px-3 py-2">GPIO</th>
                  <th className="whitespace-nowrap px-3 py-2">ADC</th>
                  <th className="whitespace-nowrap px-3 py-2">觸控</th>
                  <th className="whitespace-nowrap px-3 py-2">USB</th>
                  <th className="whitespace-nowrap px-3 py-2">封裝</th>
                </tr>
              </thead>
              <tbody>
                {filteredSeries.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-black/5 align-top hover:bg-emerald-500/5 dark:border-white/5"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <div className="flex items-center gap-2">
                        <ChipIcon accent={s.accent} label={s.short} size={40} />
                        <span className="font-semibold">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.cpu}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.freq}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.sram}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.wifi}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.bt}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.proto154}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.gpio}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.adc}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.touch}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.usb}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                      {s.pkg}
                    </td>
                  </tr>
                ))}
                {filteredSeries.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="px-3 py-6 text-center text-zinc-400"
                    >
                      沒有符合篩選條件的系列
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Flash / 備註 */}
        {filteredSeries.length > 0 && (
          <section className="rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
            <h2 className="mb-3 text-lg font-bold">💾 Flash／PSRAM 與選型建議</h2>
            <div className="flex flex-col gap-3">
              {filteredSeries.map((s) => (
                <div
                  key={s.id}
                  className="flex gap-3 rounded-xl border border-black/5 bg-black/[.02] p-3 text-sm dark:border-white/10 dark:bg-white/[.03]"
                >
                  <ChipIcon accent={s.accent} label={s.short} size={48} />
                  <div>
                    <div className="font-semibold">{s.name}</div>
                    <div className="mt-1 text-zinc-600 dark:text-zinc-300">
                      {s.flash}
                    </div>
                    <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                      💡 {s.note}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 腳位功能 */}
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">🧷 各系列腳位功能對照</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPins.map((p) => {
              const spec = SERIES.find((s) => s.id === p.id);
              return (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-white/70 p-5 text-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {spec && <ChipIcon accent={spec.accent} label={spec.short} size={40} />}
                    <div className="text-base font-bold">{p.name}</div>
                  </div>
                  <PinRow label="開機檢測（Strapping）" value={p.strapping} />
                  <PinRow label="Flash／PSRAM 保留腳位" value={p.flashReserved} />
                  <PinRow label="USB 腳位" value={p.usbPins} />
                  <PinRow label="JTAG 腳位" value={p.jtagPins} />
                  <PinRow label="預設 UART0（燒錄／Log）" value={p.uart0} />
                  <PinRow label="ADC 腳位" value={p.adcPins} />
                  <PinRow label="觸控腳位" value={p.touchPins} />
                  <PinRow label="僅能輸入" value={p.inputOnly} />
                  <div className="mt-1 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    ⚠️ {p.caution}
                  </div>
                </div>
              );
            })}
            {filteredPins.length === 0 && (
              <p className="text-sm text-zinc-400">沒有符合條件的系列。</p>
            )}
          </div>
        </section>

        {/* 較新系列 */}
        {filteredNewer.length > 0 && (
          <section className="rounded-2xl border border-dashed border-black/15 bg-white/50 p-4 backdrop-blur dark:border-white/15 dark:bg-white/[.03]">
            <h2 className="mb-1 text-lg font-bold">🆕 較新系列（簡表）</h2>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              量產時間較新，規格異動機率較高，正式選型或設計電路前請務必核對官方最新資料手冊。
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                    <th className="whitespace-nowrap px-3 py-2">系列</th>
                    <th className="whitespace-nowrap px-3 py-2">CPU</th>
                    <th className="whitespace-nowrap px-3 py-2">Wi-Fi</th>
                    <th className="whitespace-nowrap px-3 py-2">藍牙</th>
                    <th className="whitespace-nowrap px-3 py-2">802.15.4</th>
                    <th className="whitespace-nowrap px-3 py-2">GPIO</th>
                    <th className="whitespace-nowrap px-3 py-2">USB</th>
                    <th className="px-3 py-2">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNewer.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-black/5 align-top dark:border-white/5"
                    >
                      <td className="whitespace-nowrap px-3 py-2">
                        <div className="flex items-center gap-2">
                          <ChipIcon accent={s.accent} label={s.short} size={36} />
                          <span className="font-semibold">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.cpu}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.wifi}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.bt}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.proto154}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.gpio}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.usb}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">
                        {s.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {totalMatches === 0 && (
          <p className="text-center text-sm text-zinc-400">
            沒有系列符合目前的篩選條件，試著放寬一些條件看看。
          </p>
        )}

        <p className="text-xs text-zinc-400 dark:text-zinc-500">
          資料整理自 Espressif 官方資料手冊與技術文件，實際接腳與可用性請以你選用模組的官方資料手冊為準，尤其是內嵌 Flash／PSRAM 型號會佔用額外腳位。上方晶片圖為示意用途，非實際接腳圖。
        </p>
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <select
        value={value}
        onChange={onChange}
        className="rounded-lg border border-black/10 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-400 dark:border-white/15 dark:bg-black/30"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PinRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-black/5 pt-2 first:border-t-0 first:pt-0 dark:border-white/5">
      <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <span className="text-zinc-700 dark:text-zinc-200">{value}</span>
    </div>
  );
}
