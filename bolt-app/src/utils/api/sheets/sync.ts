import { fetchSheetData } from './fetch.ts';
import { SHEET_TABS } from '../../constants.ts';
import type { VideoData } from '../../../types/video.ts';
import { validateRow } from './validation.ts';
import { parseDate } from '../../timeUtils.ts';

interface VideoMap {
  [link: string]: VideoData;
}

const MASTER_SHEET_RANGE = "'AllVideos'!A:Z";

export function parsePlaylistPosition(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export interface MasterOrderInfo {
  orderMap: Record<string, number>;
  explicitCount: number;
}

export function buildMasterOrderMap(masterValues: any[][]): MasterOrderInfo {
  const orderMap: Record<string, number> = {};
  let explicitCount = 0;

  masterValues.slice(1).forEach((row, index) => {
    const link = String(row[2] ?? '').trim();
    if (!link || orderMap[link] !== undefined) {
      return;
    }

    const rawPosition = row.length > 14 ? row[14] : undefined;
    const parsedPosition = parsePlaylistPosition(rawPosition);

    if (parsedPosition !== null) {
      orderMap[link] = parsedPosition;
      explicitCount++;
    } else {
      orderMap[link] = index;
    }
  });

  return { orderMap, explicitCount };
}

function validateAndFormatDate(rawDate: any, videoTitle: string): string {
  if (!rawDate) {
    console.warn('Missing date for video:', videoTitle);
    return '';
  }

  try {
    const date = parseDate(String(rawDate));
    if (!date) {
      console.warn('Invalid date for video:', {
        title: videoTitle,
        date: rawDate
      });
      return String(rawDate || '');
    }
    return date.toISOString();
  } catch (error) {
    console.error('Date parsing error:', {
      title: videoTitle,
      date: rawDate,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return String(rawDate || '');
  }
}

export async function synchronizeSheets(): Promise<VideoData[]> {
  try {
    console.log('Starting sheet synchronization...');
    const videoMap: VideoMap = {};
    const insertionOrder: Record<string, number> = {};
    let nextInsertionIndex = 0;
    const errors: string[] = [];

    let masterOrderMap: Record<string, number> = {};
    let explicitMasterPositions = 0;
    const masterResult = await fetchSheetData(MASTER_SHEET_RANGE);
    const masterValues = masterResult.values ?? [];

    if (masterResult.error) {
      console.warn('Unable to load master playlist order:', masterResult.error);
    }

    if (masterValues.length > 1) {
      const masterOrderInfo = buildMasterOrderMap(masterValues);
      masterOrderMap = masterOrderInfo.orderMap;
      explicitMasterPositions = masterOrderInfo.explicitCount;
      const loadedCount = Object.keys(masterOrderMap).length;
      if (loadedCount > 0) {
        if (explicitMasterPositions > 0) {
          console.log(
            `Loaded master playlist order for ${loadedCount} videos (with ${explicitMasterPositions} explicit positions).`
          );
        } else {
          console.log(
            `Loaded master playlist order for ${loadedCount} videos using sheet row order as fallback.`
          );
        }
      }
    }

    // Process all tabs in parallel for better performance
    const tabResults = await Promise.allSettled(
      SHEET_TABS.map(tab => fetchSheetData(tab.range))
    );

    // Process results from each tab
    tabResults.forEach((result, index) => {
      const tab = SHEET_TABS[index];

      if (result.status === 'rejected') {
        const error = `Failed to fetch ${tab.name}: ${result.reason}`;
        console.error(error);
        errors.push(error);
        return;
      }

      const { values = [], error } = result.value;

      if (error) {
        console.error(`Error in ${tab.name}:`, error);
        errors.push(error);
        return;
      }

      if (!values || values.length === 0) {
        console.warn(`No data found in tab ${tab.name}`);
        return;
      }

      console.log(`Processing ${values.length} rows from ${tab.name}`);

      const validRows = values.filter(row => validateRow(row));
      console.log(`${tab.name}: ${validRows.length} valid videos found`);

      validRows.forEach(row => {
        const [
          channelAvatar,
          title,
          link,
          channel,
          publishedAt,
          duration,
          views,
          likes,
          comments,
          description,
          tags,
          category,
          thumbnail
        ] = row.map(cell => String(cell || '').trim());

        // Skip rows with no link
        if (!link) {
          console.warn('Invalid YouTube link skipped:', { link, title });
          return;
        }

        // Accept both youtube.com and youtu.be links
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i;
        if (!youtubeRegex.test(link)) {
          console.warn('Unsupported video link skipped:', { link, title });
          return;
        }

        if (!videoMap[link]) {
          const fallbackOrder = nextInsertionIndex;
          const masterOrder = masterOrderMap[link];
          const video: VideoData = {
            channelAvatar: channelAvatar || '',
            title: title || '',
            link,
            channel: channel || '',
            publishedAt: validateAndFormatDate(publishedAt, title),
            duration: duration || '00:00',
            views: views || '0',
            likes: likes || '0',
            comments: comments || '0',
            shortDescription: description || '',
            tags: tags || '',
            category: category || 'Non catégorisé',
            thumbnail: thumbnail || '',
            playlistPosition: typeof masterOrder === 'number' ? masterOrder : fallbackOrder
          };

          videoMap[link] = video;
          insertionOrder[link] = fallbackOrder;
          nextInsertionIndex++;
        }
      });
    });

    const videos = Object.values(videoMap);

    if (videos.length === 0) {
      const errorMessage = errors.length > 0
        ? `Failed to load videos:\n${errors.join('\n')}`
        : 'No videos found in any tab';
      throw new Error(errorMessage);
    }

    const hasMasterOrder = Object.keys(masterOrderMap).length > 0;

    if (hasMasterOrder) {
      videos.sort((a, b) => {
        const orderA = masterOrderMap[a.link];
        const orderB = masterOrderMap[b.link];
        const hasOrderA = typeof orderA === 'number';
        const hasOrderB = typeof orderB === 'number';

        if (hasOrderA && hasOrderB) {
          return orderA - orderB;
        }

        if (hasOrderA) return -1;
        if (hasOrderB) return 1;

        return (insertionOrder[a.link] ?? 0) - (insertionOrder[b.link] ?? 0);
      });
    }

    videos.forEach(video => {
      if (typeof video.playlistPosition !== 'number') {
        const order = masterOrderMap[video.link];
        if (typeof order === 'number') {
          video.playlistPosition = order;
        } else {
          const fallback = insertionOrder[video.link];
          video.playlistPosition = typeof fallback === 'number' ? fallback : 0;
        }
      }
    });

    console.log(`Synchronization complete. ${videos.length} unique videos found.`);
    return videos;
  } catch (error) {
    console.error('Synchronization failed:', error);
    throw error;
  }
}
