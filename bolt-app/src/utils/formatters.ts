export const formatNumber = (num: string): string => {
  const number = parseInt(num, 10);
  if (isNaN(number)) return num;
  
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }
  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }
  return number.toString();
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