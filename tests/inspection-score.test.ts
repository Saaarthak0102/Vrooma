import { describe, it, expect } from "vitest";
import {
  INSPECTION_CATEGORIES,
  isScorecardComplete,
  readScorecard,
  scoreFromScorecard,
  type Scorecard,
} from "@/lib/inspection-score";

const all = (n: number): Scorecard => Object.fromEntries(INSPECTION_CATEGORIES.map((c) => [c, n]));

describe("scoreFromScorecard", () => {
  it("is null until every category is rated, never a made-up number", () => {
    expect(scoreFromScorecard({})).toBeNull();
    expect(scoreFromScorecard({ Engine: 5 })).toBeNull();
  });

  it("maps all-5 to 100 and all-1 to 20", () => {
    expect(scoreFromScorecard(all(5))).toBe(100);
    expect(scoreFromScorecard(all(1))).toBe(20);
  });

  it("averages mixed ratings", () => {
    const card = all(4);
    card.Engine = 5;
    card.Tyres = 3;
    expect(scoreFromScorecard(card)).toBe(80);
  });

  it("rejects out-of-range or fractional ratings", () => {
    expect(isScorecardComplete({ ...all(5), Engine: 6 })).toBe(false);
    expect(isScorecardComplete({ ...all(5), Engine: 0 })).toBe(false);
    expect(isScorecardComplete({ ...all(5), Engine: 4.5 })).toBe(false);
  });
});

describe("readScorecard", () => {
  it("returns only valid saved ratings", () => {
    expect(readScorecard({ scorecard: { Engine: 4, Tyres: 9, Bogus: 3 } })).toEqual({ Engine: 4 });
  });

  it("returns an empty card for missing or malformed data", () => {
    expect(readScorecard(null)).toEqual({});
    expect(readScorecard({ scorecard: "x" })).toEqual({});
  });
});
