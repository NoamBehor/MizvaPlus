const ua = 'MizvaPlus/1.0 (Linux; Android; OpenStreetMap consumer)';
const query = `[out:json][timeout:15];
(
  nwr["amenity"="place_of_worship"]["religion"~"^(jewish|judaism)$"](around:4000,32.17158,35.01156);
  nwr["building"="synagogue"](around:4000,32.17158,35.01156);
  nwr["amenity"="synagogue"](around:4000,32.17158,35.01156);
);
out center tags;`;

const urls = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

const results = await Promise.all(
  urls.map(async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20_000);
    const started = Date.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'User-Agent': ua,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      const payload = await response.json();
      return {
        url,
        status: response.status,
        elements: Array.isArray(payload.elements) ? payload.elements.length : 0,
        ms: Date.now() - started,
      };
    } catch (error) {
      return {
        url,
        status: 'ERR',
        message: error instanceof Error ? error.message : String(error),
        ms: Date.now() - started,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }),
);

console.log(JSON.stringify(results, null, 2));
