/**
 * Date Utilities - IST Support (Asia/Kolkata)
 */

export const formatLocalDate = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const dateOnly = dateStr.split('T')[0];
  const [year, month, day] = dateOnly.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Standard Display Format: 22 Apr 2026
 */
export const formatDisplayDate = (dateOrStr: Date | string) => {
  if (!dateOrStr) return '-';
  const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

/**
 * Standard Multi-line / Detailed Format: 22 Apr 2026 • 01:28 PM
 */
export const formatDateTimeIST = (dateOrStr: Date | string) => {
  if (!dateOrStr) return '-';
  const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  
  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  return `${dateStr} • ${timeStr.toUpperCase()}`;
};

export const formatDisplayShort = (dateOrStr: Date | string) => {
  if (!dateOrStr) return '-';
  const d = typeof dateOrStr === 'string' ? new Date(dateOrStr) : dateOrStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Kolkata'
  });
};
