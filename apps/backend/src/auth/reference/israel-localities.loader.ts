import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IsraelLocality } from '@app/shared/types';

let cachedById: Map<number, IsraelLocality> | null = null;

/**
 * The source data was exported from an RTL spreadsheet: 55 names have mirrored parentheses
 * (`אבו ג'ווייעד )שבט(`) and some have stray spaces. Normalized on load; the JSON stays as published.
 */
function normalizeHebrewName(name: string): string {
  return name
    .replace(/\)([^()]*)\(/g, '($1)')
    .replace(/\s+/g, ' ')
    .trim();
}

function candidatePaths(): string[] {
  return [
    join(__dirname, 'src', 'assets', 'data', 'israel-localities.json'),
    join(__dirname, 'assets', 'data', 'israel-localities.json'),
    join(process.cwd(), 'apps', 'backend', 'src', 'assets', 'data', 'israel-localities.json'),
    join(process.cwd(), 'dist', 'apps', 'backend', 'src', 'assets', 'data', 'israel-localities.json'),
  ];
}

function loadRaw(): IsraelLocality[] {
  for (const filePath of candidatePaths()) {
    if (existsSync(filePath)) {
      const raw = readFileSync(filePath, 'utf8');
      return (JSON.parse(raw) as IsraelLocality[]).map((row) => ({
        ...row,
        hebrewName: normalizeHebrewName(row.hebrewName),
      }));
    }
  }

  // eslint-disable-next-line no-console -- no Nest logger in static loader
  console.warn(
    '[israel-localities] JSON not found; cityId validation will reject all ids until the file exists under apps/backend/src/assets/data/.',
  );

  return [];
}

export function getIsraelLocalitiesMap(): Map<number, IsraelLocality> {
  if (cachedById) {
    return cachedById;
  }

  const list = loadRaw();
  cachedById = new Map(list.map((row) => [row.cityId, row]));

  return cachedById;
}

export function getIsraelLocalitiesList(): IsraelLocality[] {
  return [...getIsraelLocalitiesMap().values()];
}

export function getIsraelLocalityById(
  cityId: number | null | undefined,
): IsraelLocality | null {
  if (cityId === undefined || cityId === null) {
    return null;
  }

  return getIsraelLocalitiesMap().get(cityId) ?? null;
}

export function isKnownIsraelLocalityId(cityId: number): boolean {
  return getIsraelLocalitiesMap().has(cityId);
}
