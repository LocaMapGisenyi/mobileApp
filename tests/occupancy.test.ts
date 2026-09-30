import { expect, it } from 'vitest';
import { summarizeStayPeriod } from '../src/utils/stays';

it('clips stays to the reporting month and counts occupied property days once', () => {
  const result = summarizeStayPeriod([
    { property_id: 'a', start_date: '2026-09-29', end_date: '2026-10-03', status: 'approved', total_price: 400 },
    { property_id: 'a', start_date: '2026-10-02', end_date: '2026-10-04', status: 'completed', total_price: 200 },
    { property_id: 'b', start_date: '2026-10-01', end_date: '2026-10-10', status: 'cancelled', total_price: 900 },
  ], ['a', 'b'], '2026-10-01', '2026-11-01');
  expect(result.occupiedDays).toBe(3);
  expect(result.availableDays).toBe(62);
  expect(result.revenue).toBe(400);
});

it('handles an empty inventory without inventing an occupancy percentage', () => {
  expect(summarizeStayPeriod([], [], '2026-10-01', '2026-11-01').occupancyRate).toBe(0);
});
