export type AdOutcome = 'disabled' | 'unavailable' | 'completed' | 'canceled';
// Production ad serving intentionally has no implementation until provider approval and consent setup.
export async function adBreak(mode: string, pause: () => void, resume: () => void): Promise<AdOutcome> {
  if (mode !== 'mock-no-fill') return 'disabled';
  pause();
  try { await new Promise(resolve => setTimeout(resolve, 100)); return 'unavailable'; }
  finally { resume(); }
}
export function tracker(domain: string) {
  if (domain) {
    const script = document.createElement('script');
    script.defer = true; script.dataset.domain = domain; script.src = 'https://plausible.io/js/script.js'; document.head.append(script);
  }
  return (name: string) => {
    if (!domain) return;
    const target = window as Window & { plausible?: (name: string) => void };
    target.plausible?.(name);
  };
}
