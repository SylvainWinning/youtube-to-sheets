import type { SheetResponse } from './types.ts';
import { SPREADSHEET_ID, API_KEY } from '../../constants.ts';

const RATE_LIMIT = {
  requests: 0,
  lastReset: Date.now(),
  resetInterval: 60000, // 1 minute
  maxRequests: 60
};

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 5000
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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
      await sleep(retryAfter * 1000);
      return fetchWithRetry(url, retryCount);
    }

    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
      throw new Error(errorData.error?.message || `HTTP error ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error instanceof Error ? error.message : 'Unknown error');

    if (retryCount < RETRY_CONFIG.maxRetries) {
      const delay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(2, retryCount),
        RETRY_CONFIG.maxDelay
      );
      
      console.log(`Retrying (${retryCount + 1}/${RETRY_CONFIG.maxRetries}) in ${delay}ms`);
      await sleep(delay);
      return fetchWithRetry(url, retryCount + 1);
    }

    throw error;
  }
}

export async function fetchSheetData(range: string): Promise<SheetResponse> {
  try {
    checkRateLimit();

    // Properly encode the range parameter
    const encodedRange = encodeURIComponent(range);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodedRange}?key=${API_KEY}`;
    
    const response = await fetchWithRetry(url);
    const data = await response.json();
    
    if (!data.values) {
      console.warn(`No data found for tab: ${range}`);
      return { values: [] };
    }

    return { values: data.values };
  } catch (error) {
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