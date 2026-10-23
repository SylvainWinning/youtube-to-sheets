/** Reject impossible calendars and trailing input; legacy sheet timestamps are UTC. */
export function parseDate(dateString: string): Date | null {
  if (typeof dateString !== 'string') return null;
  const value = dateString.trim().replace(/^'+/, '');
  const valid = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0) => {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1]
      && hour >= 0 && hour < 24 && minute >= 0 && minute < 60 && second >= 0 && second < 60;
  };
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (iso) {
    const [, year, month, day, hour, minute, second, zone] = iso;
    if (!valid(+year, +month, +day, +hour, +minute, +second)) return null;
    const date = new Date(zone ? value : `${value}Z`);
    return Number.isFinite(date.getTime()) ? date : null;
  }
  const sheet = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (sheet) {
    const [, day, month, year, hour, minute, second = '0'] = sheet;
    if (!valid(+year, +month, +day, +hour, +minute, +second)) return null;
    const date = new Date(0);
    date.setUTCFullYear(+year, +month - 1, +day); date.setUTCHours(+hour, +minute, +second, 0);
    return date;
  }
  const french = value.match(/^(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})$/i);
  const dayFirst = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const parts = french ? [+french[3], months.indexOf(french[2].toLowerCase()) + 1, +french[1]]
    : dayFirst ? [+dayFirst[3], +dayFirst[2], +dayFirst[1]]
    : dateOnly ? [+dateOnly[1], +dateOnly[2], +dateOnly[3]] : null;
  if (!parts || !valid(parts[0], parts[1], parts[2])) return null;
  const date = new Date(0);
  date.setFullYear(parts[0], parts[1] - 1, parts[2]); date.setHours(0, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatPublishDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) {
    return 'Date inconnue';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  // Si la date est dans le futur, retourne la date formatée
  if (diffMs < 0) {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  }

  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}
