import { Injectable } from '@nestjs/common';
import type { IsraelLocality } from '@app/shared/types';
import { getIsraelLocalitiesList } from '../auth/reference/israel-localities.loader';

const DEFAULT_LIMIT = 10;
const hebrewCollator = new Intl.Collator('he');

@Injectable()
export class LocalitiesService {
  /** Names starting with the text rank before names merely containing it, then Hebrew alphabetical. */
  search(search: string | undefined, limit = DEFAULT_LIMIT): IsraelLocality[] {
    const text = (search ?? '').toLocaleLowerCase();

    return getIsraelLocalitiesList()
      .map((locality) => ({ locality, rank: this.rank(locality, text) }))
      .filter(({ rank }) => rank !== null)
      .sort(
        (a, b) =>
          (a.rank as number) - (b.rank as number) ||
          hebrewCollator.compare(a.locality.hebrewName, b.locality.hebrewName),
      )
      .slice(0, limit)
      .map(({ locality }) => locality);
  }

  /** 0 = a name starts with the text, 1 = a name contains it, null = no match. */
  private rank(locality: IsraelLocality, text: string): number | null {
    if (!text) {
      return 0;
    }

    const names = [locality.hebrewName, locality.englishName.toLocaleLowerCase()];

    if (names.some((name) => name.startsWith(text))) {
      return 0;
    }

    return names.some((name) => name.includes(text)) ? 1 : null;
  }
}
