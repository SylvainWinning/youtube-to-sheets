import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="bg-red-50 text-red-500 p-4 rounded-lg flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <p>{message}</p>
      </div>
    </div>
  );
}