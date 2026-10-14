/**
 * `HH:MM` ↔ minutes since midnight, used by the backend's free-time calculation and the settings
 * screen alike (ADR-0008: shared rules live once). No validation: inputs match TIME_OF_DAY_PATTERN.
 */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTimeOfDay(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  return `${String(hours).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
