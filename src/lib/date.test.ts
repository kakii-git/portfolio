import { describe, expect, it } from "vitest";
import { formatDate, formatYearMonth, toIsoDate } from "./date";

describe("formatYearMonth", () => {
  it("YYYY.MM に整形する", () => {
    expect(formatYearMonth(new Date("2026-09-04T00:00:00Z"))).toBe("2026.09");
  });

  it("月を2桁にゼロ埋めする", () => {
    expect(formatYearMonth(new Date("2026-01-15T00:00:00Z"))).toBe("2026.01");
    expect(formatYearMonth(new Date("2026-12-15T00:00:00Z"))).toBe("2026.12");
  });
});

describe("formatDate", () => {
  it("YYYY.MM.DD に整形する", () => {
    expect(formatDate(new Date("2026-09-04T00:00:00Z"))).toBe("2026.09.04");
  });

  it("日を2桁にゼロ埋めする", () => {
    expect(formatDate(new Date("2026-09-25T00:00:00Z"))).toBe("2026.09.25");
  });
});

describe("toIsoDate", () => {
  it("<time datetime> 用の YYYY-MM-DD を返す", () => {
    expect(toIsoDate(new Date("2026-09-04T00:00:00Z"))).toBe("2026-09-04");
  });
});

// z.coerce.date() は "2026-09-04" を UTC 0時として解釈する。
// ローカル getter を使うと UTC より西のタイムゾーンで前日に化けるため、
// 3関数とも UTC getter で実装されていることをここで固定する。
// TZ=America/Los_Angeles でも TZ=Asia/Tokyo でも同じ結果になること。
describe("タイムゾーン非依存（UTC 基準）", () => {
  const utcMidnight = new Date("2026-09-01T00:00:00Z");

  it("UTC 0時の日付が実行環境のTZでずれない", () => {
    expect(formatYearMonth(utcMidnight)).toBe("2026.09");
    expect(formatDate(utcMidnight)).toBe("2026.09.01");
    expect(toIsoDate(utcMidnight)).toBe("2026-09-01");
  });

  it("月をまたぐ境界（月末23:59 UTC）でも UTC の日付を返す", () => {
    const endOfMonth = new Date("2026-08-31T23:59:59Z");
    expect(formatYearMonth(endOfMonth)).toBe("2026.08");
    expect(formatDate(endOfMonth)).toBe("2026.08.31");
    expect(toIsoDate(endOfMonth)).toBe("2026-08-31");
  });

  it("年をまたぐ境界（大晦日23:59 UTC）でも UTC の日付を返す", () => {
    const endOfYear = new Date("2026-12-31T23:59:59Z");
    expect(formatYearMonth(endOfYear)).toBe("2026.12");
    expect(formatDate(endOfYear)).toBe("2026.12.31");
    expect(toIsoDate(endOfYear)).toBe("2026-12-31");
  });
});
