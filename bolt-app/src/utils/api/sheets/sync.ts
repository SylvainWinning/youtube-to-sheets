import { throwIfAborted } from '../../requestPolicy.ts';
import { fetchSheetData } from './fetch.ts';
import { SHEET_TABS } from '../../constants.ts';
import type { VideoData } from '../../../types/video.ts';
import { isVideoHeader } from './schema.ts';
import { cellText, videoUrl } from './validation.ts';
import { transformVideoRows, parsePlaylistPosition } from './transform.ts';
export { parsePlaylistPosition } from './transform.ts';

interface VideoMap {
  [link: string]: VideoData;
}

const MASTER_SHEET_RANGE = "'AllVideos'!A:Z";

export interface MasterOrderInfo {
  orderMap: Record<string, number>;
  explicitCount: number;
}

export function buildMasterOrderMap(masterValues: unknown[][]): MasterOrderInfo {
  const orderMap: Record<string, number> = {};
  let explicitCount = 0;

  const rows = masterValues[0] && isVideoHeader(masterValues[0]) ? masterValues.slice(1) : masterValues;
  rows.forEach((row, index) => {
    const link = videoUrl(row[2]) ?? cellText(row[2]);
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

export async function synchronizeSheets(signal?: AbortSignal, beforeAttempt?: () => void): Promise<VideoData[]> {
  try {
    console.log('Starting sheet synchronization...');
    const videoMap: VideoMap = {};
    const insertionOrder: Record<string, number> = {};
    let nextInsertionIndex = 0;
    const errors: string[] = [];

    let masterOrderMap: Record<string, number> = {};
    let explicitMasterPositions = 0;
    const masterResult = await fetchSheetData(MASTER_SHEET_RANGE, signal, beforeAttempt);
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

    throwIfAborted(signal);
    // Process all tabs in parallel for better performance
    const tabResults = await Promise.allSettled(
      SHEET_TABS.map(tab => fetchSheetData(tab.range, signal, beforeAttempt))
    );

    throwIfAborted(signal);
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

      const videos = transformVideoRows(values);
      videos.forEach(video => {
        const link = video.link;
        if (!videoMap[link]) {
          const fallbackOrder = nextInsertionIndex++;
          video.playlistPosition = masterOrderMap[link] ?? fallbackOrder;
          videoMap[link] = video;
          insertionOrder[link] = fallbackOrder;
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
