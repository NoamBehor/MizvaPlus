import { fetchPublishedEpisodeForParasha } from '@/services/podcast/parashaPodcastRepository';
import { addDaysToDateKey } from '@/utils/timezone';
import type { WeeklyParasha } from '@/types/calendar';
import type { ParashaPodcastEpisode } from '@/types/podcast';

const DEV_MOCK_SAMPLE_AUDIO_URL =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';

export interface ParashaPodcastProvider {
  getEpisodeForParasha(
    parasha: WeeklyParasha,
  ): Promise<ParashaPodcastEpisode | null>;
}

export class ProductionParashaPodcastProvider implements ParashaPodcastProvider {
  async getEpisodeForParasha(
    parasha: WeeklyParasha,
  ): Promise<ParashaPodcastEpisode | null> {
    return fetchPublishedEpisodeForParasha(parasha);
  }
}

export class MockParashaPodcastProvider implements ParashaPodcastProvider {
  async getEpisodeForParasha(
    parasha: WeeklyParasha,
  ): Promise<ParashaPodcastEpisode | null> {
    const parashaKey = parasha.basename ?? 'sample';
    const weekEnd = parasha.shabbatDateKey;
    const weekStart = addDaysToDateKey(weekEnd, -6);

    return {
      id: `dev-mock-${parashaKey}-${weekEnd}`,
      parashaKey,
      hebrewTitle: parasha.hebrewDisplayName || 'כי תבוא',
      description: 'פרק לדוגמה על הרעיונות המרכזיים של פרשת השבוע.',
      audioUrl: DEV_MOCK_SAMPLE_AUDIO_URL,
      durationSeconds: 574,
      weekStart,
      weekEnd,
      version: 1,
      publishedAt: new Date().toISOString(),
      status: 'published',
      scriptVersion: 'dev-mock',
    };
  }
}

class DevParashaPodcastProvider implements ParashaPodcastProvider {
  private readonly productionProvider = new ProductionParashaPodcastProvider();
  private readonly mockProvider = new MockParashaPodcastProvider();

  async getEpisodeForParasha(
    parasha: WeeklyParasha,
  ): Promise<ParashaPodcastEpisode | null> {
    const published = await this.productionProvider.getEpisodeForParasha(parasha);
    if (published) {
      return published;
    }

    return this.mockProvider.getEpisodeForParasha(parasha);
  }
}

let activeProvider: ParashaPodcastProvider = new ProductionParashaPodcastProvider();

if (__DEV__) {
  activeProvider = new DevParashaPodcastProvider();
}

export function getParashaPodcastProvider(): ParashaPodcastProvider {
  return activeProvider;
}

export function setParashaPodcastProvider(provider: ParashaPodcastProvider): void {
  activeProvider = provider;
}
