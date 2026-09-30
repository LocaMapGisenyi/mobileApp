export interface StaySummaryInput {
  property_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
}

const DAY_MS = 86_400_000;

export function dateDay(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Date attendue : AAAA-MM-JJ');
  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== value) throw new Error('Date invalide');
  return parsed / DAY_MS;
}

export function summarizeStayPeriod(stays: StaySummaryInput[], propertyIds: string[], start: string, end: string) {
  const first = dateDay(start);
  const last = dateDay(end);
  if (last <= first) throw new Error('La date de fin doit suivre la date de début');
  const properties = new Set(propertyIds);
  const occupied = new Set<string>();
  let revenue = 0;
  for (const stay of stays) {
    if (!properties.has(stay.property_id) || !['approved', 'completed'].includes(stay.status)) continue;
    const arrival = dateDay(stay.start_date);
    const departure = dateDay(stay.end_date);
    if (departure <= arrival) continue;
    const from = Math.max(first, arrival);
    const to = Math.min(last, departure);
    for (let day = from; day < to; day++) occupied.add(`${stay.property_id}:${day}`);
    revenue += Math.max(0, to - from) / (departure - arrival) * stay.total_price;
  }
  const availableDays = properties.size * (last - first);
  return {
    occupiedDays: occupied.size,
    availableDays,
    occupancyRate: availableDays ? occupied.size / availableDays * 100 : 0,
    revenue: Math.round(revenue * 100) / 100,
  };
}
