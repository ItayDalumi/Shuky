import { getLevelInfo, LEVELS, XP_PER_TRADE } from '../levels';

describe('getLevelInfo', () => {
  it('starts at level 1', () => {
    expect(getLevelInfo(0)).toMatchObject({ level: 1, nextLevelXp: 100, xpToNext: 100, progress: 0 });
  });
  it('switches level exactly at the threshold', () => {
    for (const l of LEVELS) {
      expect(getLevelInfo(l.minXp).level).toBe(l.level);
      if (l.minXp > 0) expect(getLevelInfo(l.minXp - 1).level).toBe(l.level - 1);
    }
  });
  it('reports progress toward the next level', () => {
    expect(getLevelInfo(340)).toMatchObject({ level: 3, nextLevelXp: 500, xpToNext: 160, progress: 0.68 });
  });
  it('caps at the top level', () => {
    expect(getLevelInfo(5000)).toMatchObject({ level: 5, nextLevelXp: null, xpToNext: 0, progress: 1 });
  });
  it('levels are increasing', () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].minXp).toBeGreaterThan(LEVELS[i - 1].minXp);
  });
  it('the next level is a whole number of trades away', () => {
    // 340 XP → level 4 at 500: 160 XP = 8 trades (what the levels screen shows)
    expect(Math.ceil(getLevelInfo(340).xpToNext / XP_PER_TRADE)).toBe(8);
  });
});
