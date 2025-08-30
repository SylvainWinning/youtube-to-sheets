import { fetchSheetData, type SheetsConfig } from './fetch.ts';
import { SHEET_TABS, getConfig } from '../../constants.ts';
import type { VideoData } from '../../../types/video.ts';
import { validateRow } from './validation.ts';
import { processVideoData } from '../../youtube.ts';

interface VideoMap {
  [link: string]: VideoData;
}

function validateAndFormatDate(rawDate: any, videoTitle: string): string {
  if (!rawDate) {
    console.warn('Missing date for video:', videoTitle);
    return new Date().toISOString();
  }

  try {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      console.warn('Invalid date for video:', {
        title: videoTitle,
        date: rawDate
      });
      return new Date().toISOString();
    }
    return date.toISOString();
  } catch (error) {
    console.error('Date parsing error:', {
      title: videoTitle,
      date: rawDate,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return new Date().toISOString();
  }
}

export async function synchronizeSheets(): Promise<VideoData[]> {
  try {
    console.log('Starting sheet synchronization...');
    const { SPREADSHEET_ID, API_KEY, error } = getConfig();
    if (error) {
      throw new Error(error);
    }
    const config: SheetsConfig = { SPREADSHEET_ID, API_KEY };
    const videoMap: VideoMap = {};
    const errors: string[] = [];

    // Process all tabs in parallel for better performance
    const tabResults = await Promise.allSettled(
      SHEET_TABS.map(tab => fetchSheetData(tab.range, config))
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
          thumbnail,
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
          channelAvatar
        ] = row.map(cell => String(cell || '').trim());

        if (!link || !link.includes('youtube.com')) {
          console.warn('Invalid YouTube link skipped:', { link, title });
          return;
        }

        if (!videoMap[link]) {
          const video: VideoData = {
            thumbnail: thumbnail || '',
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
            channelAvatar: channelAvatar || ''
          };

          videoMap[link] = processVideoData(video);
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

    console.log(`Synchronization complete. ${videos.length} unique videos found.`);
    return videos;
  } catch (error) {
    console.error('Synchronization failed:', error);
    throw error;
  }
}