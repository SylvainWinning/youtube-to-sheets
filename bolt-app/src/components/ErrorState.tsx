

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-6 text-center text-youtube-black dark:text-white">
      <p role="alert">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="neu-button px-4 py-2 rounded-xl">Réessayer</button>}
    </div>
  );
}
