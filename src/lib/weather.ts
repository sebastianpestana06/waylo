export async function fetchWeatherSnapshot(
  place: string,
  startDate: string | null,
  endDate: string | null,
): Promise<{ summary: string; tempMax?: number; tempMin?: number } | null> {
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`,
      { next: { revalidate: 86400 } },
    );
    const geo = await geoRes.json();
    const loc = geo?.results?.[0];
    if (!loc) return { summary: `No weather data found for ${place}.` };

    const start = startDate ?? new Date().toISOString().slice(0, 10);
    const end = endDate ?? start;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date=${start}&end_date=${end}`;
    const wRes = await fetch(url, { next: { revalidate: 3600 } });
    if (!wRes.ok) {
      return {
        summary: `Seasonal check recommended for ${place} around your dates.`,
      };
    }
    const data = await wRes.json();
    const maxes: number[] = data?.daily?.temperature_2m_max ?? [];
    const mins: number[] = data?.daily?.temperature_2m_min ?? [];
    if (!maxes.length) {
      return {
        summary: `Forecast window unavailable; check seasonal norms for ${place}.`,
      };
    }
    const tempMax = Math.max(...maxes);
    const tempMin = Math.min(...mins);
    return {
      summary: `${place}: about ${tempMin}°–${tempMax}°C over your dates (Open-Meteo).`,
      tempMax,
      tempMin,
    };
  } catch {
    return null;
  }
}
