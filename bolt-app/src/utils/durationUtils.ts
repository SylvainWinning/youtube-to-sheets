export function parseDuration(duration: string): { hours: number; minutes: number; seconds: number } {
  const parts = duration.split(':').map(Number);
  
  if (parts.length === 2) {
    // Format MM:SS
    return {
      hours: 0,
      minutes: parts[0],
      seconds: parts[1]
    };
  } else if (parts.length === 3) {
    // Format HH:MM:SS
    return {
      hours: parts[0],
      minutes: parts[1],
      seconds: parts[2]
    };
  }
  
  return { hours: 0, minutes: 0, seconds: 0 };
}

export function formatDuration(duration: string): string {
  const { hours, minutes, seconds } = parseDuration(duration);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDurationRange(min: number | null, max: number | null): string {
  if (min === null && max === null) {
    return 'Inconnue';
  }
  if (max === null) {
    return `${min}+ min`;
  }
  return `${min}-${max} min`;
}

export function getDurationInMinutes(duration: string): number {
  const { hours, minutes } = parseDuration(duration);
  return hours * 60 + minutes;
}
