function localDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function teamDefaultSchedule(now: Date) {
  const start = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return {
    minDate: localDateInput(now),
    startDateInput: localDateInput(start),
    startClockInput: `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`,
  };
}
