import { describe, expect, it } from 'vitest';
import {
  toBeijingTime,
  fromBeijingTime,
  getTodayRange,
  getTomorrowRange,
  getThisWeekendRange,
  getNext7DaysRange,
  getNext30DaysRange,
  isInBeijingWeekend,
  getActiveQuickType,
} from './date';

describe('Date Utils', () => {
  describe('toBeijingTime / fromBeijingTime', () => {
    it('should convert UTC to Beijing time (+8 hours)', () => {
      const utc = new Date('2026-05-20T12:00:00Z'); // UTC 12:00
      const beijing = toBeijingTime(utc);
      expect(beijing.getUTCHours()).toBe(20); // Beijing 20:00
      expect(beijing.getUTCDate()).toBe(20);
    });

    it('should convert Beijing time back to UTC', () => {
      const beijing = new Date('2026-05-20T20:00:00Z'); // Beijing 20:00 (stored as UTC)
      const utc = fromBeijingTime(beijing);
      expect(utc.getUTCHours()).toBe(12); // UTC 12:00
    });

    it('should handle day boundary crossing', () => {
      const utc = new Date('2026-05-20T20:00:00Z'); // UTC 20:00
      const beijing = toBeijingTime(utc); // Beijing 次日 04:00
      expect(beijing.getUTCDate()).toBe(21);
    });
  });

  describe('getTodayRange', () => {
    it('should return correct range for Wednesday', () => {
      // 2026-05-20 is Wednesday, Beijing time
      const now = new Date('2026-05-20T12:00:00Z'); // UTC 12:00 = Beijing 20:00
      const range = getTodayRange(now);

      // Today in Beijing: 2026-05-20 00:00 - 23:59:59
      // UTC: 2026-05-19 16:00 - 2026-05-20 15:59:59
      expect(range.label).toBe('今天');
      expect(range.start.toISOString()).toBe('2026-05-19T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-20T15:59:59.999Z');
    });

    it('should handle early morning UTC correctly', () => {
      // 2026-05-20 02:00 UTC = Beijing 2026-05-20 10:00 (still today)
      const now = new Date('2026-05-20T02:00:00Z');
      const range = getTodayRange(now);

      expect(range.start.toISOString()).toBe('2026-05-19T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-20T15:59:59.999Z');
    });

    it('should handle late night UTC correctly', () => {
      // 2026-05-20 22:00 UTC = Beijing 2026-05-21 06:00 (next day in Beijing)
      const now = new Date('2026-05-20T22:00:00Z');
      const range = getTodayRange(now);

      // "Today" should be Beijing 2026-05-21
      expect(range.start.toISOString()).toBe('2026-05-20T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-21T15:59:59.999Z');
    });
  });

  describe('getTomorrowRange', () => {
    it('should return tomorrow range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const range = getTomorrowRange(now);

      expect(range.label).toBe('明天');
      expect(range.start.toISOString()).toBe('2026-05-20T16:00:00.000Z'); // Beijing 05-21 00:00
      expect(range.end.toISOString()).toBe('2026-05-21T15:59:59.999Z');   // Beijing 05-21 23:59:59
    });
  });

  describe('getThisWeekendRange', () => {
    it('should return correct weekend from Wednesday', () => {
      // 2026-05-20 is Wednesday
      const now = new Date('2026-05-20T12:00:00Z');
      const range = getThisWeekendRange(now);

      expect(range.label).toBe('本周末');
      // Weekend: Saturday 2026-05-23 00:00 - Sunday 2026-05-24 23:59:59 (Beijing)
      // UTC: 2026-05-22 16:00 - 2026-05-24 15:59:59
      expect(range.start.toISOString()).toBe('2026-05-22T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-24T15:59:59.999Z');
    });

    it('should return correct weekend from Friday', () => {
      // 2026-05-22 is Friday
      const now = new Date('2026-05-22T12:00:00Z');
      const range = getThisWeekendRange(now);

      expect(range.start.toISOString()).toBe('2026-05-22T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-24T15:59:59.999Z');
    });

    it('should return current weekend from Saturday', () => {
      // 2026-05-23 is Saturday
      const now = new Date('2026-05-23T12:00:00Z');
      const range = getThisWeekendRange(now);

      expect(range.start.toISOString()).toBe('2026-05-22T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-24T15:59:59.999Z');
    });

    it('should return next weekend from Sunday evening', () => {
      // 2026-05-24 is Sunday, 22:00 Beijing = 14:00 UTC
      const now = new Date('2026-05-24T14:00:00Z');
      const range = getThisWeekendRange(now);

      // Still this weekend (until Sunday 23:59:59 Beijing)
      expect(range.start.toISOString()).toBe('2026-05-22T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-24T15:59:59.999Z');
    });

    it('should return next weekend from Sunday late night', () => {
      // 2026-05-24 Sunday, 23:00 Beijing = 15:00 UTC (still Sunday in Beijing)
      // Wait, 23:00 Beijing = 15:00 UTC, yes
      const now = new Date('2026-05-24T15:00:00Z');
      const range = getThisWeekendRange(now);

      // Still this weekend
      expect(range.start.toISOString()).toBe('2026-05-22T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-24T15:59:59.999Z');
    });

    it('should return next weekend from Monday early morning', () => {
      // 2026-05-25 Monday, 01:00 Beijing = 2026-05-24 17:00 UTC (previous day in UTC!)
      // Beijing Monday 01:00 = UTC Sunday 17:00 (previous day)
      const now = new Date('2026-05-24T17:00:00Z');
      const range = getThisWeekendRange(now);

      // "This weekend" from Beijing Monday should be next Saturday/Sunday
      // Next Saturday: 2026-05-30, Beijing 00:00 = UTC 2026-05-29 16:00
      // Next Sunday: 2026-05-31, Beijing 23:59:59 = UTC 2026-05-31 15:59:59
      expect(range.start.toISOString()).toBe('2026-05-29T16:00:00.000Z');
      expect(range.end.toISOString()).toBe('2026-05-31T15:59:59.999Z');
    });
  });

  describe('getNext7DaysRange', () => {
    it('should return correct 7-day range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const range = getNext7DaysRange(now);

      expect(range.label).toBe('未来7天');
      expect(range.start.toISOString()).toBe('2026-05-19T16:00:00.000Z'); // Today start
      expect(range.end.toISOString()).toBe('2026-05-26T15:59:59.999Z');   // Day 7 end (today + 6 days)
    });
  });

  describe('getNext30DaysRange', () => {
    it('should return correct 30-day range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const range = getNext30DaysRange(now);

      expect(range.label).toBe('未来30天');
      expect(range.start.toISOString()).toBe('2026-05-19T16:00:00.000Z'); // Today start
      expect(range.end.toISOString()).toBe('2026-06-18T15:59:59.999Z');   // Day 30 end
    });
  });

  describe('isInBeijingWeekend', () => {
    // 2026-05-22 Friday Beijing, 2026-05-23 Saturday Beijing, 2026-05-24 Sunday Beijing

    it('should return false for Friday 23:00 Beijing', () => {
      // Beijing Friday 23:00 = UTC Friday 15:00
      const utc = new Date('2026-05-22T15:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(false);
    });

    it('should return true for Saturday 01:00 Beijing', () => {
      // Beijing Saturday 01:00 = UTC Friday 17:00
      const utc = new Date('2026-05-22T17:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(true);
    });

    it('should return true for Sunday 22:00 Beijing', () => {
      // Beijing Sunday 22:00 = UTC Sunday 14:00
      const utc = new Date('2026-05-24T14:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(true);
    });

    it('should return false for Monday 01:00 Beijing', () => {
      // Beijing Monday 01:00 = UTC Sunday 17:00
      const utc = new Date('2026-05-24T17:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(false);
    });
  });

  describe('getActiveQuickType', () => {
    it('should match today range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const today = getTodayRange(now);

      expect(getActiveQuickType(today.start, today.end, now)).toBe('today');
    });

    it('should match tomorrow range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const tomorrow = getTomorrowRange(now);

      expect(getActiveQuickType(tomorrow.start, tomorrow.end, now)).toBe('tomorrow');
    });

    it('should match weekend range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const weekend = getThisWeekendRange(now);

      expect(getActiveQuickType(weekend.start, weekend.end, now)).toBe('weekend');
    });

    it('should match next7 range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const next7 = getNext7DaysRange(now);

      expect(getActiveQuickType(next7.start, next7.end, now)).toBe('next7');
    });

    it('should match next30 range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const next30 = getNext30DaysRange(now);

      expect(getActiveQuickType(next30.start, next30.end, now)).toBe('next30');
    });

    it('should return custom for non-matching range', () => {
      const now = new Date('2026-05-20T12:00:00Z');
      const customStart = new Date('2026-05-25T16:00:00.000Z');
      const customEnd = new Date('2026-05-26T15:59:59.999Z');

      expect(getActiveQuickType(customStart, customEnd, now)).toBe('custom');
    });
  });

  describe('Boundary cases (关键边界)', () => {
    it('Friday 23:00 Beijing should be Friday (not weekend)', () => {
      // Beijing Friday 23:00 = UTC Friday 15:00
      const utc = new Date('2026-05-22T15:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(false);
    });

    it('Saturday 01:00 Beijing should be weekend', () => {
      // Beijing Saturday 01:00 = UTC Friday 17:00
      const utc = new Date('2026-05-22T17:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(true);
    });

    it('Sunday 22:00 Beijing should be weekend', () => {
      // Beijing Sunday 22:00 = UTC Sunday 14:00
      const utc = new Date('2026-05-24T14:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(true);
    });

    it('Monday 01:00 Beijing should not be weekend', () => {
      // Beijing Monday 01:00 = UTC Sunday 17:00
      const utc = new Date('2026-05-24T17:00:00Z');
      expect(isInBeijingWeekend(utc)).toBe(false);
    });
  });
});
