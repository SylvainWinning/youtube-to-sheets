import React from 'react';

interface SearchStatsProps {
  totalCount: number;
  filteredCount: number;
  searchQuery: string;
}

export function SearchStats({ totalCount, filteredCount, searchQuery }: SearchStatsProps) {
  if (!searchQuery) {
    return (
      <p className="text-sm text-gray-600 mb-4">
        {totalCount} vidéo{totalCount > 1 ? 's' : ''}
      </p>
    );
  }

  return (
    <p className="text-sm text-gray-600 mb-4">
      {filteredCount} résultat{filteredCount > 1 ? 's' : ''} sur {totalCount} vidéo{totalCount > 1 ? 's' : ''}
    </p>
  );
}