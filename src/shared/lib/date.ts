export const nowIso = (): string => new Date().toISOString();

export const toDateKey = (isoDate: string): string => isoDate.slice(0, 10);

export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds || seconds <= 0) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, '0')}`;
};
