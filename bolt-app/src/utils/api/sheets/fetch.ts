import type { SheetResponse } from './types.ts';
import { fetchJsonWithRetry, throwIfAborted } from '../../requestPolicy.ts';
import { SPREADSHEET_ID, YOUTUBE_API_KEY } from './config.ts';

const RATE_LIMIT = {
  requests: 0,
  lastReset: Date.now(),
  resetInterval: 60000, // 1 minute
  maxRequests: 60
};

function checkRateLimit() {
  const now = Date.now();
  if (now - RATE_LIMIT.lastReset >= RATE_LIMIT.resetInterval) {
    RATE_LIMIT.requests = 0;
    RATE_LIMIT.lastReset = now;
  }
  
  if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  RATE_LIMIT.requests++;
}

export async function fetchSheetData(range: string, signal?: AbortSignal, beforeAttempt?: () => void): Promise<SheetResponse> {
  try {

    // Properly encode the range parameter
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${YOUTUBE_API_KEY}`;
    
    const data = await fetchJsonWithRetry<{ values?: any[][] }>(url, {
      signal, onAttempt: () => { beforeAttempt?.(); checkRateLimit(); },
      init: { method: 'GET', headers: { Accept: 'application/json' } },
    });
    
    if (!data.values) {
      console.warn(`No data found for tab: ${range}`);
      return { values: [] };
    }

    return { values: data.values };
  } catch (error) {
    throwIfAborted(signal);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sheet data fetch error:', {
      range,
      error: errorMessage
    });
    
    return { 
      error: `Error fetching data for tab ${range}: ${errorMessage}`,
      values: []
    };
  }
}
