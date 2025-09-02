import React from 'react';

interface DataTableProps {
  data: any[][] | null;
  isLoading: boolean;
  error: string | null;
}

// Libellés en français pour chaque colonne
const headerLabels: Record<string, string> = {
  channelAvatar: 'Avatar',
  title: 'Titre',
  link: 'Vidéo',
  channel: 'Chaîne',
  publishedAt: 'Date',
  duration: 'Durée',
  views: 'Vues',
  likes: 'J’aime',
  comments: 'Commentaires',
  shortDescription: 'Description',
  tags: 'Tags',
  category: 'Catégorie',
  thumbnail: 'Miniature',
};

export function DataTable({ data, isLoading, error }: DataTableProps) {
  // Affichage d’un indicateur de chargement lorsque les données arrivent
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // En cas d’erreur, on affiche le message d’erreur
  if (error) {
    return (
      <div className="p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  // Si aucune donnée n’est disponible, on l’indique simplement
  if (!data || data.length === 0) {
    return (
      <div className="text-gray-500 p-4 bg-gray-50 rounded-lg">
        <p>Aucune donnée disponible</p>
      </div>
    );
  }

  // On extrait les en-têtes et les lignes du tableau
  const headers = data[0];
  const rows = data.slice(1);

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header: string, index: number) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {headerLabels[header] ?? header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row: any[], rowIndex: number) => (
            <tr key={rowIndex}>
              {row.map((cell: any, cellIndex: number) => {
                const header = headers[cellIndex] as string;

                // Afficher les images pour l’avatar et la miniature
                if ((header === 'channelAvatar' || header === 'thumbnail') && typeof cell === 'string' && cell !== '') {
                  return (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                      <img
                        src={cell}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </td>
                  );
                }

                // Rendre le lien cliquable
                if (header === 'link' && typeof cell === 'string') {
                  return (
                    <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={cell}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Voir
                      </a>
                    </td>
                  );
                }

                // Affichage par défaut pour les autres colonnes
                return (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
