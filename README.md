# ka.kii — portfolio

余白を生かした個人ポートフォリオサイト。Astro + TypeScript で構築し、Cloudflare Pages にデプロイ。

- **2ページ構成**: Home（Hero / 自己紹介 / 技術スタック / これまでの活動 / 連絡先）、Works（制作物 / 記事）
- **データ駆動・追記型**: YAML を1つ足して push すれば項目が増える
- **クライアントJSは最小**（フェードイン・スクロールスパイ・メニュー開閉のみ）

## 開発

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ へ静的出力
npm run preview  # ビルド結果を確認
npm run check    # 型チェック（astro check）
```

Node は `.nvmrc`（20）に固定。Astro 5 の要件は Node 18.20.8 / 20.3.0 / 22 以上。

## 構成

```
src/
  consts.ts          サイトメタ・プロフィール文言・SNSリンク・フィード設定
  content.config.ts  Content Collections スキーマ
  content/
    timeline/*.yaml        活動 1件 = 1ファイル
    certifications/*.yaml  資格 1件 = 1ファイル
    works/*.yaml           制作物 1件 = 1ファイル（スクショ画像も同階層に）
  data/techStack.ts  技術スタック（ジャンル別）
  lib/writing.ts     記事フィード取得（RSS/Atom ＋ OGP画像）
  layouts/Base.astro <head>・メタ・背景・軽量スクリプト
  components/*.astro  各セクション
  pages/
    index.astro        Home
    works.astro        /works
    robots.txt.ts      robots.txt を site 設定から生成
  styles/global.css  デザイン仕様
public/              favicon / og-image などの静的アセット
astro.config.mjs     site 設定・ビルド時のヘッダ生成
```

## よくある編集

### 活動・資格・制作物を足す

`src/content/<collection>/` に YAML を1つ置くだけ。並び順・年グルーピングは自動。

```yaml
# timeline 例
date: 2026-07-20          # 表示は YYYY.MM。期間表示は dateLabel で上書き可
category: ctf             # ctf | camp | talk | internship | award | event | competition | other
title:
  ja: ◯◯ CTF 2026 出場
description:              # 任意（サブ行）
  ja: チーム◯◯ — 国内5位
link: "https://..."       # 任意（linkLabel で表示名）
```

```yaml
# works 例（スクショは同じ src/content/works/ に置く）
no: 5
title: something
year: 2026
tech: [Astro, TypeScript]
description:
  ja: 説明文
image: ./something.png    # 任意。Astro が WebP に最適化
links:
  - { label: GitHub, href: "https://github.com/..." }
```

### 記事フィードを変える

`src/consts.ts` の `FEEDS` を編集。各フィードをビルド時に取得し、日付降順で統合、サムネ（OGP画像）も自動取得する。取得に失敗してもビルドは落ちない（そのフィードを空としてスキップ）。

```ts
export const FEEDS = [
  { source: "Qiita", url: "https://qiita.com/ka-kii/feed" },
  // { source: "Zenn", url: "https://zenn.dev/<username>/feed" },
];
```

## デプロイ（Cloudflare Pages）

1. GitHub に push
2. Cloudflare Pages → Connect to Git → リポジトリを選択
3. ビルド設定: preset **Astro** / build `npm run build` / output `dist`
4. `main` への push で自動デプロイ
5. Custom domains で独自ドメインを追加
6. 記事の自動更新: Deploy Hook を作成し、その URL を GitHub の Secrets `CF_DEPLOY_HOOK_URL` に登録。`.github/workflows/rebuild.yml` が毎日1回叩いて新着記事を反映する。

canonical / OGP / sitemap / robots は `astro.config.mjs` の `site` から導出される。ドメインを変える場合はここ1箇所を更新するだけでよい。

## 設計メモ

- スタイリングは素の CSS（デザイン仕様をピクセル単位で再現するため Tailwind は不採用）
- Content Collections は glob ローダー（1ファイル = 1エントリ＝追記型）
- 日付は実 `Date` 型で保持し、表示時に `YYYY.MM` へ整形
- 背景はインラインSVG（feTurbulence）でベクター・追加リクエストなし。画面比率で表示方式を出し分け
- 画像は Astro の `<Image>` で最適化（WebP）
