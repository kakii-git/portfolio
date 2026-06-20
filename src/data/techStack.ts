/**
 * Tech Stack セクションのデータ。
 * ジャンルごとに { name, icon } を並べる。icon は Simple Icons のスラッグ
 * （astro-icon 経由で "simple-icons:<icon>" としてインライン描画）。
 * 項目を増やすにはここに1行足すだけ。アイコンが無い技術は icon を省略可。
 *
 * 利用可能なスラッグは https://simpleicons.org で確認できる。
 */

export interface TechItem {
  name: string;
  icon?: string; // Simple Icons スラッグ
}

export interface TechGroup {
  label: string; // 日本語ラベル
  labelEn: string; // 英語ラベル（キャプション風）
  items: TechItem[];
}

export const TECH_STACK: TechGroup[] = [
  {
    label: "言語",
    labelEn: "Languages",
    items: [
      { name: "C", icon: "c" },
      { name: "Python", icon: "python" },
      { name: "PHP", icon: "php" },
      { name: "HTML/CSS", icon: "html5" },
    ],
  },
  {
    label: "フレームワーク・ライブラリ",
    labelEn: "Frameworks & Libraries",
    items: [
      { name: "Astro", icon: "astro" },
      { name: "React", icon: "react" },
      { name: "Next.js", icon: "nextdotjs" },
      { name: "scikit-learn", icon: "scikitlearn" },
      { name: "Tailwind CSS", icon: "tailwindcss" },
    ],
  },
  {
    label: "ツール・インフラ",
    labelEn: "Tools & Infra",
    items: [
      { name: "Docker", icon: "docker" },
      { name: "Git", icon: "git" },
      { name: "Linux", icon: "linux" },
      { name: "Proxmox", icon: "proxmox" },
      { name: "Cloudflare", icon: "cloudflare" },
    ],
  },
];
