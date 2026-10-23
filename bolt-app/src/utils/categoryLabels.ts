/** Presentation aliases keep saved category URLs and editorial rules compatible. */
export function getCategoryLabel(category: string): string {
  if (category === 'Pause dej') return 'Pause déjeuner';
  if (category === 'Youtuber pref') return 'Créateurs favoris';
  return category;
}
