import type { BrowserSpeechRecognition } from '../types/speech.ts';

export type VoiceState = { active: boolean; message: string };
export const unsupportedVoice = 'La dictée n’est pas disponible dans ce navigateur. Utilisez la saisie au clavier.';

export function startSpeechSession(
  Recognition: new () => BrowserSpeechRecognition,
  onState: (state: VoiceState) => void,
  onTranscript: (text: string) => void,
): () => void {
  let recognition: BrowserSpeechRecognition | undefined;
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (message: string, notify = true) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
      try { recognition.stop(); } catch { /* Already stopped or not started. */ }
    }
    if (notify) onState({ active: false, message });
  };
  onState({ active: true, message: 'Démarrage du micro… Autorisez son accès si le navigateur le demande.' });
  try {
    recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => { if (!finished) onState({ active: true, message: 'Écoute en cours… Parlez pour rechercher.' }); };
    recognition.onresult = event => {
      if (finished) return;
      const text = event.results[0]?.[0]?.transcript?.trim();
      finish(text ? 'Dictée terminée. Vous pouvez modifier votre recherche.' : 'Aucune parole reconnue. Réessayez ou utilisez le clavier.');
      if (text) onTranscript(text);
    };
    recognition.onerror = event => {
      const messages: Record<string, string> = {
        'not-allowed': 'Accès au micro refusé. Autorisez-le dans les réglages du navigateur ou utilisez le clavier.',
        'service-not-allowed': 'Le navigateur bloque la dictée. Utilisez le clavier.',
        'audio-capture': 'Aucun micro accessible. Vérifiez votre micro ou utilisez le clavier.',
        'no-speech': 'Aucune parole reconnue. Réessayez ou utilisez le clavier.',
        network: 'La dictée a rencontré un problème réseau. Réessayez ou utilisez le clavier.',
        aborted: 'Dictée arrêtée. Vous pouvez utiliser le clavier.',
      };
      finish(messages[event.error] ?? 'La dictée a échoué. Réessayez ou utilisez le clavier.');
    };
    recognition.onend = () => finish('Aucune parole reconnue. Réessayez ou utilisez le clavier.');
    timer = setTimeout(() => finish('Délai de dictée dépassé. Réessayez ou utilisez le clavier.'), 10_000);
    recognition.start();
  } catch {
    finish('Impossible de démarrer la dictée. Vérifiez l’accès au micro ou utilisez le clavier.');
  }
  return () => finish('', false);
}
