export const DEFAULT_TIME_ZONE = "America/Bogota";

// deno-lint-ignore no-explicit-any
type Db = { from: (table: string) => any };

function offsetMs(instant: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).formatToParts(new Date(instant)).map(p => [p.type, p.value])
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(instant / 1000) * 1000;
}

function zonedMidnightToUtc(year: number, month: number, day: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day);
  const first = guess - offsetMs(guess, timeZone);
  return guess - offsetMs(first, timeZone);
}

/** Calendar day (YYYY-MM-DD) of a date in the given time zone. A plain YYYY-MM-DD string is taken as-is. */
export function localDay(date: Date | string, timeZone: string): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(typeof date === "string" ? new Date(date) : date);
}

/** UTC bounds [start, end] of the restaurant's local calendar day containing `date`. */
export function localDayRange(date: Date | string, timeZone: string): { start: string; end: string } {
  const [y, m, d] = localDay(date, timeZone).split("-").map(Number);
  const start = zonedMidnightToUtc(y, m, d, timeZone);
  const next = zonedMidnightToUtc(y, m, d + 1, timeZone);
  return { start: new Date(start).toISOString(), end: new Date(next - 1).toISOString() };
}

export async function getRestaurantTimeZone(supabase: Db, restaurantId: string | null): Promise<string> {
  if (!restaurantId) return DEFAULT_TIME_ZONE;
  const { data } = await supabase.from("restaurants").select("timezone").eq("id", restaurantId).maybeSingle();
  const tz = data?.timezone;
  try {
    if (tz) new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz || DEFAULT_TIME_ZONE;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
