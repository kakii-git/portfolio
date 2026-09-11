export interface NavItem {
  /** アンカー先のセクション id（例: "about"） */
  id: string;
  /** 目次に表示する番号（例: "01"） */
  num: string;
  /** 目次ラベル（例: "自己紹介"） */
  label: string;
}

/** ブログ一覧に並ぶ記事。自サイト記事と外部記事の両方をこの形に揃える。 */
export interface Article {
  /** 記事タイトル */
  title: string;
  /** 外部記事は絶対URL、自サイト記事は "/blog/<slug>/" */
  url: string;
  /** 日付降順ソートの基準。一覧では YYYY.MM に整形して表示する */
  date: Date;
  /** 出典ラベル（外部記事は FEEDS[].source、自サイト記事は POST_SOURCE） */
  source: string;
  /** サムネイル。外部記事は og:image のURL、自サイト記事は最適化後のパス */
  image?: string;
  /** true なら別タブで開き ↗ を添える（= 外部記事） */
  external: boolean;
}
