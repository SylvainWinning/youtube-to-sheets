import type { VideoData } from '../../../types/video.ts';
import type { ApiResponse } from './types.ts';
import { validateRow } from './validation.ts';
import { mapRowToVideo } from './transform.ts';

/**
 * Fetches a local JSON file containing video rows and converts it into an array
 * of `VideoData`. This is used as a fallback when the application cannot
 * contact the Google Sheets API because of missing or invalid configuration.
 *
 * The original implementation requested `/data/videos.json` which broke when
 * the application was deployed to a subpath (e.g. GitHub Pages) because the
 * leading slash causes an absolute request to the domain root. Here we
 * construct the URL relative to the Vite `BASE_URL` so the file is served
 * correctly regardless of the deployment path.
 */
export async function fetchLocalVideos(): Promise<ApiResponse<VideoData[]>> {
  try {
    // Build a relative path using import.meta.env.BASE_URL. This ensures
    // requests work both in development (where BASE_URL is '/') and in
    // production when the app is served from a subdirectory. Without this
    // prefix, the fetch would point to the domain root and fail to find
    // the JSON file, resulting in an empty video grid.
    const baseUrl: string = (import.meta as any).env?.BASE_URL ?? '';
    const res = await fetch(`${baseUrl}data/videos.json`);
    const json = await res.json();
    const [, ...rows] = json as any[][]; // skip header row
    const videos = rows
      .filter(validateRow)
      .map(mapRowToVideo);

    return { data: videos };
  } catch (err) {
    console.error('Erreur lors du chargement des vidéos locales:', err);
    return {
      data: [],
      error:
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des vidéos locales'
    };
  }
}