import { prisma } from "@/lib/prisma";

export const KYIV_BASE = { lat: 50.4501, lng: 30.5234 };

const NOMINATIM_UA = "StanKomplektService/1.0 (service@stan-komplekt.ua)";
const MAX_NEW_LOOKUPS_PER_REQUEST = 3; // поважаємо rate limit Nominatim (1 req/sec)

/**
 * Координати міста: спершу GeoCache, потім Nominatim (з кешуванням).
 * За один HTTP-запит до застосунку робимо не більше 3 нових геокодувань —
 * решта підтягнеться при наступних відкриттях сторінки.
 */
export async function resolveCities(
  pairs: Array<{ city: string; oblast: string }>
): Promise<Map<string, { lat: number; lng: number }>> {
  const result = new Map<string, { lat: number; lng: number }>();
  const unique = new Map<string, { city: string; oblast: string }>();
  for (const p of pairs) {
    const key = `${p.city}|${p.oblast}`;
    if (!unique.has(key)) unique.set(key, p);
  }

  const cached = await prisma.geoCache.findMany({
    where: {
      OR: [...unique.values()].map((p) => ({ city: p.city, oblast: p.oblast })),
    },
  });
  for (const c of cached as any[]) {
    result.set(`${c.city}|${c.oblast}`, { lat: c.lat, lng: c.lng });
  }

  const missing = [...unique.entries()].filter(([key]) => !result.has(key));
  let lookups = 0;
  for (const [key, p] of missing) {
    if (lookups >= MAX_NEW_LOOKUPS_PER_REQUEST) break;
    if (lookups > 0) await new Promise((r) => setTimeout(r, 1100));
    lookups++;
    try {
      const q = encodeURIComponent(`${p.city}, ${p.oblast} область, Україна`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=uk`,
        { headers: { "User-Agent": NOMINATIM_UA }, next: { revalidate: 0 } }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!data[0]) continue;
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      await prisma.geoCache.upsert({
        where: { city_oblast: { city: p.city, oblast: p.oblast } },
        update: { lat, lng },
        create: { city: p.city, oblast: p.oblast, lat, lng },
      });
      result.set(key, { lat, lng });
    } catch {
      // мережевий збій — пропускаємо, спробуємо наступного разу
    }
  }
  return result;
}

export function geoKey(city: string, oblast: string): string {
  return `${city}|${oblast}`;
}
