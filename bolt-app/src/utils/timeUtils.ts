// Exporte la fonction parseDate pour qu'elle soit utilisable par d'autres modules
export function parseDate(dateString: string): Date | null {
  // Essaie différents formats de date
  const formats = [
    // Format ISO
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    // Format DD/MM/YYYY HH:MM
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/,
    // Format DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    // Format français (ex: 11 avril 2024)
    /^(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i
  ];

  try {
    // Test format ISO
    if (formats[0].test(dateString)) {
      // Certaines dates ISO provenant de l'API peuvent ne pas spécifier explicitement le fuseau horaire
      // Ajoute "Z" par défaut pour les interpréter comme UTC
      const hasTimeZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateString);
      return new Date(hasTimeZone ? dateString : `${dateString}Z`);
    }
    
    // Test format DD/MM/YYYY HH:MM
    const ddmmyyyyTime = formats[1].exec(dateString);
    if (ddmmyyyyTime) {
      const [, day, month, year, hour, minute] = ddmmyyyyTime;
      return new Date(
        Date.UTC(
          Number(year),
          Number(month) - 1,
          Number(day),
          Number(hour),
          Number(minute)
        )
      );
    }

    // Test format DD/MM/YYYY
    const ddmmyyyy = formats[2].exec(dateString);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    }
    
    // Test format français
    const frenchDate = formats[3].exec(dateString);
    if (frenchDate) {
      const [, day, month, year] = frenchDate;
      const monthMap: { [key: string]: string } = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
      };
      const monthNumber = Number(monthMap[month.toLowerCase()]);
      return new Date(Date.UTC(Number(year), monthNumber - 1, Number(day)));
    }

    // Si aucun format ne correspond, essaie le parsing natif
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

export function formatPublishDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) {
    console.warn('Date invalide:', dateString);
    return dateString;
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
