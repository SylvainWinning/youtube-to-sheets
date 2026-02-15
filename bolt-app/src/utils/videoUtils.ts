import type { VideoData } from '../types/video.ts';
import type { SheetTab } from '../types/sheets.ts';
import { filterVideosByDuration } from './videoFilters.ts';

function extractYouTubeId(url: string): string | null {
  try {
    // Gère les formats d'URL courants de YouTube
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    console.warn('Format d\'URL YouTube non reconnu:', url);
    return null;
  } catch (error) {
    console.error('Erreur lors de l\'extraction de l\'ID YouTube:', error);
    return null;
  }
}

export function generateYouTubeThumbnail(url: string): string {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    return ''; // URL de fallback ou vide si pas d'ID valide
  }

  // On utilise maxresdefault.jpg pour la meilleure qualité
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

export function getRandomVideo(videos: VideoData[], tab: SheetTab | null): VideoData | null {
  const filteredVideos = tab ? filterVideosByDuration(videos, tab) : videos;
  if (filteredVideos.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * filteredVideos.length);
  return filteredVideos[randomIndex];
}

function shouldOpenWebInSafari(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent ?? '';
  const vendor = (navigator as any).vendor ?? '';
  const uaPlatform = (navigator as any).userAgentData?.platform ?? '';
  const maxTouchPoints = (navigator as any).maxTouchPoints ?? 0;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgA|EdgiOS/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isAppleVendor = /Apple Computer,? Inc\./i.test(vendor);
  const hints = `${userAgent} ${uaPlatform}`;
  const isLikelyVisionOS =
    /VisionOS|Vision\s?Pro|VisionPro|Apple\s?Vision|AppleVisionPro|visionos/i.test(hints) ||
    maxTouchPoints > 0;

  // Sur Safari desktop (macOS, visionOS), le schéma youtube:// affiche un message
  // d'erreur "adresse invalide" sur macOS. On garde l'URL web sur macOS,
  // mais on laisse visionOS tenter l'ouverture directe de l'app YouTube.
  return isSafari && isAppleVendor && !isIOS && !isLikelyVisionOS;
}

function isLikelyVisionOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent ?? '';
  const uaPlatform = (navigator as any).userAgentData?.platform ?? '';
  const maxTouchPoints = (navigator as any).maxTouchPoints ?? 0;
  const hints = `${userAgent} ${uaPlatform}`;

  return (
    /VisionOS|Vision\s?Pro|VisionPro|Apple\s?Vision|AppleVisionPro|visionos/i.test(hints) ||
    maxTouchPoints > 0
  );
}

function buildYouTubeAppUrls(videoId: string): string[] {
  if (isLikelyVisionOSDevice()) {
    // L'app native "YouTube for VisionOS" n'utilise pas toujours le même schéma
    // que l'application iOS classique. On essaie d'abord son schéma dédié,
    // puis on garde le schéma historique en fallback.
    return [
      `youtubeforvisionos://watch?v=${videoId}`,
      `youtube://${videoId}`
    ];
  }

  return [`youtube://${videoId}`];
}

function openUrlInSystem(webUrl: string, options?: { sameTab?: boolean }) {
  const preferSameTab = options?.sameTab ?? false;
  const cordovaBrowser = (window as any)?.cordova?.InAppBrowser;
  if (cordovaBrowser) {
    cordovaBrowser.open(webUrl, '_system');
    return;
  }

  if (!preferSameTab) {
    const openedWindow = typeof window.open === 'function'
      ? window.open(webUrl, '_blank', 'noopener,noreferrer')
      : null;
    if (openedWindow) {
      openedWindow.opener = null;
      return;
    }
  }

  window.location.href = webUrl;
}

let lastOpenedTarget = '';
let lastOpenedAt = 0;
const DUPLICATE_OPEN_GUARD_MS = 1000;

function isDuplicateOpen(target: string): boolean {
  const now = Date.now();
  const duplicated = target === lastOpenedTarget && now - lastOpenedAt < DUPLICATE_OPEN_GUARD_MS;

  if (!duplicated) {
    lastOpenedTarget = target;
    lastOpenedAt = now;
  }

  return duplicated;
}

export function playVideo(video: VideoData | null) {
  if (!video) return;

  // Essaye d'ouvrir directement l'application YouTube via son schéma d'URL.
  const videoId = extractYouTubeId(video.link);

  if (videoId) {
    const appUrls = buildYouTubeAppUrls(videoId);
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

    if (isDuplicateOpen(webUrl)) {
      return;
    }

    const isSafariNeedingWebFallback = shouldOpenWebInSafari();

    if (isSafariNeedingWebFallback) {
      openUrlInSystem(webUrl, { sameTab: true });
      return;
    }

    // Redirige vers l'app YouTube. Si elle n'est pas installée, la redirection
    // échoue et l'on ouvre l'URL web en repli après un court délai. Pour
    // éviter l'affichage d'un navigateur intégré à l'application (écran blanc
    // avec un bouton de fermeture), on privilégie l'ouverture dans le
    // navigateur système lorsque c'est possible.
    let schemeRetryTimer: ReturnType<typeof window.setTimeout> | undefined;
    let fallbackTimer: ReturnType<typeof window.setTimeout> | undefined;
    let didLeavePage = false;

    const cleanupFallbackGuards = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHideOrBlur);
      window.removeEventListener('blur', handlePageHideOrBlur);
    };

    const clearFallbackTimer = () => {
      if (schemeRetryTimer !== undefined) {
        window.clearTimeout(schemeRetryTimer);
        schemeRetryTimer = undefined;
      }

      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
    };

    const fallbackToWeb = () => {
      // Si l'utilisateur a quitté l'application pour ouvrir YouTube, on ne déclenche
      // pas le repli vers le navigateur afin d'éviter d'afficher une vue Safari vide
      // en revenant dans l'app.
      if (didLeavePage || document.visibilityState === 'hidden') {
        clearFallbackTimer();
        cleanupFallbackGuards();
        return;
      }

      cleanupFallbackGuards();
      clearFallbackTimer();
      openUrlInSystem(webUrl);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        didLeavePage = true;
        clearFallbackTimer();
        cleanupFallbackGuards();
      }
    };

    const handlePageHideOrBlur = () => {
      didLeavePage = true;
      clearFallbackTimer();
      cleanupFallbackGuards();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHideOrBlur);
    window.addEventListener('blur', handlePageHideOrBlur);

    window.location.href = appUrls[0];

    if (appUrls.length > 1) {
      schemeRetryTimer = window.setTimeout(() => {
        if (didLeavePage || document.visibilityState === 'hidden') {
          clearFallbackTimer();
          cleanupFallbackGuards();
          return;
        }

        window.location.href = appUrls[1];
      }, 350);
    }

    fallbackTimer = window.setTimeout(fallbackToWeb, 1200);
    return;
  }

  // Si l'ID de la vidéo n'est pas détecté, on applique la même logique de
  // fallback pour ouvrir le lien sans passer par un navigateur intégré.
  if (isDuplicateOpen(video.link)) {
    return;
  }

  openUrlInSystem(video.link);
}
