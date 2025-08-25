// Exporte la fonction parseDate pour qu'elle soit utilisable par d'autres modules
export function parseDate(dateString: string): Date | null {
  // Essaie différents formats de date
  const formats = [
    // Format ISO
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    // Format DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    // Format français (ex: 11 avril 2024)
    /^(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})/i
  ];

  try {
    // Test format ISO
    if (formats[0].test(dateString)) {
      return new Date(dateString);
    }
    
    // Test format DD/MM/YYYY
    const ddmmyyyy = formats[1].exec(dateString);
    if (ddmmyyyy) {
      const [, day, month, year] = ddmmyyyy;
      return new Date(`${year}-${month}-${day}`);
    }
    
    // Test format français
    const frenchDate = formats[2].exec(dateString);
    if (frenchDate) {
      const [, day, month, year] = frenchDate;
      const monthMap: { [key: string]: string } = {
        'janvier': '01', 'février': '02', 'mars': '03', 'avril': '04',
        'mai': '05', 'juin': '06', 'juillet': '07', 'août': '08',
        'septembre': '09', 'octobre': '10', 'novembre': '11', 'décembre': '12'
      };
      const monthNumber = monthMap[month.toLowerCase()];
      return new Date(`${year}-${monthNumber}-${day.padStart(2, '0')}`);
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
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);

  // Si moins de 24 heures, affiche le temps relatif
  if (diffInHours < 24) {
    if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''}`;
    }
    return `Il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
  }

  // Sinon utilise le format français standard
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}