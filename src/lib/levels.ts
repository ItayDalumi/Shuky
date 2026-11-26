/**
 * Level ladder. XP is earned per completed trade.
 * Phase 3: XP is awarded only when BOTH sides confirm a trade (enforced server-side).
 */
export const XP_PER_TRADE = 20;

export const LEVELS = [
  { level: 1, minXp: 0, title: 'בצק טרי', description: 'הצטרפת לשוקי. כל עסקה ראשונה מתחילה כאן.' },
  { level: 2, minXp: 100, title: 'תופח יפה', description: 'השכנים מתחילים להכיר אותך ואת המאפים.' },
  { level: 3, minXp: 250, title: 'יוצא מהתנור', description: 'שם מוכר בשכונה, עם עסקאות ודירוגים טובים.' },
  { level: 4, minXp: 500, title: 'זהוב ופריך', description: 'מהשכנים הפעילים והאמינים ביותר בשוקי.' },
  { level: 5, minXp: 900, title: 'כוכב המאפייה', description: 'הרמה הגבוהה ביותר. השכונה יודעת למי לפנות.' },
] as const;

export type LevelInfo = {
  level: number;
  title: string;
  xp: number;
  /** XP needed to reach the next level (null at max level) */
  nextLevelXp: number | null;
  /** 0..1 progress, measured as xp / nextLevelXp (as in the design) */
  progress: number;
  xpToNext: number;
};

export function getLevelInfo(xp: number): LevelInfo {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXp) current = l;
  }
  const next = LEVELS.find((l) => l.level === current.level + 1);
  return {
    level: current.level,
    title: current.title,
    xp,
    nextLevelXp: next?.minXp ?? null,
    progress: next ? Math.min(1, xp / next.minXp) : 1,
    xpToNext: next ? next.minXp - xp : 0,
  };
}
