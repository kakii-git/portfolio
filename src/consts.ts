/**
 * サイト全体で使う定数・テキストの一元管理ファイル。
 * 文言・リンク・メタ情報・イースターエッグのフラグはすべてここを編集する。
 */

// ── イースターエッグ用フラグ ──
// HTML の <head> 付近にコメントとして埋め込まれる。差し替えはこの1箇所だけでよい。
// 「よく見つけたね！」のニュアンス。差し替えはこの1行だけでよい。
// イースターエッグのフラグ（1箇所で管理）。
// FLAG      … view-source（HTML head のコメント）で見つかる
// CURL_FLAG … レスポンスヘッダ X-Recon で見つかる（curl -I 用）。astro.config.mjs がビルド時に _headers へ展開。
export const FLAG = "kakii{good_eye_you_found_it}";
export const CURL_FLAG = "kakii{hello_from_the_headers}";

// ── サイトメタ情報（OGP / SEO） ──
export const SITE = {
  title: "ka.kii — Portfolio",
  description:
    "セキュリティ専攻の学生エンジニア ka.kii のポートフォリオ。CTFと制作を行き来しながら、攻撃の手法を学び守りの設計に活かす。",
  // 本名併記の有無は未確定。併記する場合はここに入れてレイアウトで使う。
  author: "ka.kii",
  lang: "ja",
  ogImage: "/og-image.png", // 静的1枚。自動生成は将来課題（README参照）。
} as const;

// ── 記事フィード（Writing セクション） ──
// ユーザー名の変更はここだけ。Zenn はアカウント作成後に1行足せば統合される。
export const FEEDS = [
  { source: "Qiita", url: "https://qiita.com/ka-kii/feed" },
  // { source: "Zenn", url: "https://zenn.dev/<username>/feed" },
] as const;

// ── 外部リンク ──
export const SOCIAL_LINKS = [
  { label: "GitHub", href: "https://github.com/kakii-git", tentative: false },
  { label: "X", href: "https://x.com/kakii_vol", tentative: false },
  { label: "Qiita", href: "https://qiita.com/ka-kii", tentative: false },
] as const;

// ── Hero / About のプロフィール文言 ──
export const PROFILE = {
  name: "ka.kii",
  role: { ja: "セキュリティ専攻の学生エンジニア", en: "Security-major student engineer" },
  lead: {
    ja: "セキュリティが好きで、CTFやバグバウンティをぼちぼちやっています。最近は低レイヤのプログラミングにも手を出し始めました。イベントの企画・運営なんかもやってます。",
    en: "I'm into security, and I casually play CTFs and do bug bounty. Lately I've also started dabbling in low-level programming. And I plan and run events, too.",
    tentative: false,
  },
  affiliation: {
    ja: "電気通信大学 情報理工学域 Ⅱ類",
    ja2: "セキュリティ情報学プログラム 3年",
    sub: "電気通信大学MMA 元部長（2025年度）",
    tentative: false,
  },
  interests: {
    ja: "ハードウェアセキュリティ／Webセキュリティ など",
    sub: "CTF／バグバウンティ",
    tentative: false,
  },
  // 自己紹介ノートは非表示（null）。表示したくなったら { ja: "...", tentative: false } を入れる。
  note: null as null | { ja: string; tentative: boolean },
  // メール（公開）。非掲載に戻す場合は null にする。
  email: { address: "contact@kakii.dev", tentative: false } as null | { address: string; tentative: boolean },
  contactNote: "イベントのお誘い・お仕事のご連絡など、お気軽にどうぞ。DMでも届きます。",
} as const;
