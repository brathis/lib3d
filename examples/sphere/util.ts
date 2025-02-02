export function rotationToHours(rotationAngleRad: number): string {
  const minutesTotal = ((12 * 60) / Math.PI) * rotationAngleRad;
  const hours = Math.floor(minutesTotal / 60);
  const minutes = Math.round(minutesTotal - hours * 60);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}
