export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${exponent === 0 ? value : value.toFixed(1)} ${units[exponent]}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Delete-confirmation copy for a folder-shaped item (a folder or a dataroom) given its top-level contents. */
export function folderWarning(name: string, fileCount: number, folderCount: number): string {
  if (fileCount === 0 && folderCount === 0) {
    return `"${name}" and everything inside it will be permanently deleted. This can't be undone.`;
  }
  const parts = [
    fileCount > 0 ? `${fileCount} file${fileCount === 1 ? '' : 's'}` : null,
    folderCount > 0 ? `${folderCount} folder${folderCount === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  return `"${name}" contains ${parts.join(' and ')} at the top level. Everything inside — including anything nested deeper — will be permanently deleted. This can't be undone.`;
}
