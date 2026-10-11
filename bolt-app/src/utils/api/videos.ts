import { fetchLocalVideos } from './sheets/local.ts';

// CI publishes the snapshot; refreshing in the browser only rereads it.
// Keep private Sheets configuration and API modules outside this import graph.
export const fetchAllVideos = fetchLocalVideos;
