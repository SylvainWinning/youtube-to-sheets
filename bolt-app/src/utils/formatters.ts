export const formatNumber = (num: string): string => {
  const number = parseInt(num, 10);
  if (isNaN(number)) return num;
  
  return new Intl.NumberFormat('fr-FR', {
    notation: 'compact', maximumFractionDigits: 1,
  }).format(number);
};

export const formatDuration = (duration: string): string => {
  if (!duration.includes(':')) return duration;
  const [minutes, seconds] = duration.split(':');
  return `${minutes}:${seconds.padStart(2, '0')}`;
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
};
