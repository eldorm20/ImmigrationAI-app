// Lightweight client-side logger that no-ops in production
const isDev = import.meta.env.MODE !== 'production';

export function debug(...args: unknown[]) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.debug(...args);
}

export function info(...args: unknown[]) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.info(...args);
}

export function warn(...args: unknown[]) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.warn(...args);
}

export function error(...args: unknown[]) {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.error(...args);
}

export default { debug, info, warn, error };
