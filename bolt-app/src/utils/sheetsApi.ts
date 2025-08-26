import { VideoData, VideoResponse } from '../types/video';
import { SHEET_TABS, SPREADSHEET_ID, API_KEY } from './constants';

async function fetchSheetData(range: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des données');
    }

    const result = await response.json();
    return result.values || [];
  } catch (error) {
    console.error('Erreur:', error);
    return [];
  }
}

function mapRowToVideo(row: string[]): VideoData {
  return {
    thumbnail: row[0] || '',
    title: row[1] || '',
    link: row[2] || '',
    channel: row[3] || '',
    publishedAt: row[4] || '',
    duration: row[5] || '',
    views: row[6] || '0',
    likes: row[7] || '0',
    comments: row[8] || '0',
    shortDescription: row[9] || '',
    tags: row[10] || '',
    category: row[11] || ''
  };
}

export async function fetchAllVideos(): Promise<VideoResponse> {
  try {
    const allVideos: VideoData[] = [];
    
    // Fetch data from all tabs in parallel
    const tabDataPromises = SHEET_TABS.map(tab => fetchSheetData(tab.range));
    const tabsData = await Promise.all(tabDataPromises);
    
    // Process data from each tab
    tabsData.forEach((tabRows, index) => {
      const videos = tabRows.map(mapRowToVideo);
      allVideos.push(...videos);
    });

    return { data: allVideos };
  } catch (error) {
    console.error('Erreur:', error);
    return { data: [], error: 'Erreur lors de la récupération des données' };
  }
}