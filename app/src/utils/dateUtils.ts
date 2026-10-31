interface FormatTimestampOptions {
  locale?: string;
  includeTime?: boolean;
  relative?: boolean;
}

export const formatTimestamp = (
  timeStamp: Date | string | number | undefined | null,
  options: FormatTimestampOptions = {},
): string => {
  const { locale = 'fr-FR', includeTime = true, relative = false } = options;

  if (timeStamp === undefined || timeStamp === null) return '-';

  try {
    let dateValue: number | string | Date = timeStamp as any;
    if (typeof timeStamp === 'number') {
      dateValue = timeStamp > 1e11 ? timeStamp : timeStamp * 1000;
    } else if (typeof timeStamp === 'string') {
      if (/^\d+$/.test(timeStamp)) {
        const n = Number(timeStamp);
        dateValue = n > 1e11 ? n : n * 1000;
      } else {
        dateValue = timeStamp;
      }
    }

    const date = new Date(dateValue as any);

    if (isNaN(date.getTime())) return '-';

    if (relative) {
      return formatRelativeTime(date);
    }

    const dateOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(includeTime && {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    return date.toLocaleDateString(locale, dateOptions);
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '-';
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;

  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const isValidDate = (dateString: string | undefined): boolean => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const getTimeDifference = (
  startDate: Date | string,
  endDate: Date | string = new Date(),
): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date';
  }

  const diffInMs = Math.abs(end.getTime() - start.getTime());
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 60) return `${diffInMinutes} minutes`;
  if (diffInHours < 24) return `${diffInHours} hours`;
  return `${diffInDays} days`;
};
