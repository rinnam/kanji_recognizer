type Versioned = { id: string; updatedAt: string };

export function overlayPending<T extends Versioned>(server: T[], pending: T[]): T[] {
  const rows = new Map(server.map(row => [row.id, row]));
  for (const row of pending) {
    const existing = rows.get(row.id);
    if (!existing || Date.parse(row.updatedAt) > Date.parse(existing.updatedAt)) rows.set(row.id, row);
  }
  return Array.from(rows.values());
}

export function stillPending<T extends Versioned>(current: T[], sent: T[], server: T[]): T[] {
  const sentTimes = new Map(sent.map(row => [row.id, row.updatedAt]));
  const serverTimes = new Map(server.map(row => [row.id, Date.parse(row.updatedAt)]));
  return current.filter(row => sentTimes.get(row.id) !== row.updatedAt ||
    (serverTimes.get(row.id) ?? -Infinity) < Date.parse(row.updatedAt));
}
