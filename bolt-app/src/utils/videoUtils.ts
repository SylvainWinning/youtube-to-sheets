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

function isVisionOSSafariSession(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator as any).platform ?? '' : '';
  const uaPlatform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform ?? '' : '';
  const uaBrands = Array.isArray((navigator as any).userAgentData?.brands)
    ? (navigator as any).userAgentData.brands.map((brand: { brand: string }) => brand.brand).join(' ')
    : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator as any).maxTouchPoints ?? 0 : 0;
  const hints = `${userAgent} ${platform} ${uaPlatform} ${uaBrands}`;

  const mentionsVision = /VisionOS|Vision\s?Pro|VisionPro|Apple\s?Vision|AppleVisionPro/i.test(hints);
  const mentionsVisionPlatform = /visionos/i.test(uaPlatform);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgA|EdgiOS/i.test(userAgent);
  const isIOSMobile = /iPad|iPhone|iPod/i.test(userAgent);

  // Safari sur visionOS peut exposer un user‑agent proche de macOS, mais il se distingue
  // par la présence d’un support tactile. Sur macOS classique, maxTouchPoints vaut 0.
  const macLikeWithTouch =
    (/(Macintosh|MacIntel|Mac OS X|macOS)/i.test(hints) || uaPlatform === 'MacIntel') && maxTouchPoints > 0;

  // Sur visionOS, Safari peut exposer un UA proche de macOS avec support tactile
  // (maxTouchPoints > 0). Dans ce cas, la redirection vers le schéma "youtube://"
  // affiche une erreur système : on force donc l'ouverture web directe.
  const safariWithTouchOnMac =
    isSafari &&
    !isIOSMobile &&
    /Macintosh|Mac OS X/i.test(hints) &&
    maxTouchPoints > 0;

  const explicitVision =
    (mentionsVision || mentionsVisionPlatform) &&
    isSafari &&
    !isIOSMobile;
  return explicitVision || safariWithTouchOnMac || (isSafari && macLikeWithTouch && !isIOSMobile);
}

function shouldOpenWebInSafari(): boolean {
  if (typeof navigator === 'undefined') return false;

  const userAgent = navigator.userAgent ?? '';
  const vendor = (navigator as any).vendor ?? '';
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgA|EdgiOS/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);
  const isAppleVendor = /Apple Computer,? Inc\./i.test(vendor);

  // Sur Safari desktop (macOS, visionOS), le schéma youtube:// affiche un message
  // d'erreur "adresse invalide". On privilégie donc directement l'URL web.
  return isSafari && isAppleVendor && !isIOS;
}

function openUrlInSystem(webUrl: string) {
  const cordovaBrowser = (window as any)?.cordova?.InAppBrowser;
  if (cordovaBrowser) {
    cordovaBrowser.open(webUrl, '_system');
    return;
  }

  const openedWindow = typeof window.open === 'function'
    ? window.open(webUrl, '_blank', 'noopener,noreferrer')
    : null;
  if (openedWindow) {
    openedWindow.opener = null;
    return;
  }

  window.location.href = webUrl;
}

export function playVideo(video: VideoData | null) {
  if (!video) return;

  // Essaye d'ouvrir directement l'application YouTube via son schéma d'URL.
  const videoId = extractYouTubeId(video.link);

  if (videoId) {
    const appUrl = `youtube://${videoId}`;
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const isVisionOS = isVisionOSSafariSession();
    const isSafariNeedingWebFallback = shouldOpenWebInSafari();

    if (isVisionOS || isSafariNeedingWebFallback) {
      openUrlInSystem(webUrl);
      return;
    }

    // Redirige vers l'app YouTube. Si elle n'est pas installée, la redirection
    // échoue et l'on ouvre l'URL web en repli après un court délai. Pour
    // éviter l'affichage d'un navigateur intégré à l'application (écran blanc
    // avec un bouton de fermeture), on privilégie l'ouverture dans le
    // navigateur système lorsque c'est possible.
    let fallbackTimer: ReturnType<typeof window.setTimeout> | undefined;
    let didLeavePage = false;

    const cleanupFallbackGuards = () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHideOrBlur);
      window.removeEventListener('blur', handlePageHideOrBlur);
    };

    const clearFallbackTimer = () => {
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

    window.location.href = appUrl;
    fallbackTimer = window.setTimeout(fallbackToWeb, 1200);
    return;
  }

  // Si l'ID de la vidéo n'est pas détecté, on applique la même logique de
  // fallback pour ouvrir le lien sans passer par un navigateur intégré.
  openUrlInSystem(video.link);
}
