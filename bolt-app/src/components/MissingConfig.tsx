import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function MissingConfig({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <p>{message ?? 'Google Sheets API key or spreadsheet ID not configured.'}</p>
      </div>
    </div>
  );
}
