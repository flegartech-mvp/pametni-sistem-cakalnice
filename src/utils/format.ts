export const formatTime = (value?: string | Date) => {
  if (!value) {
    return "Ni določeno";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("sl-SI", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDate = (value: Date = new Date()) =>
  new Intl.DateTimeFormat("sl-SI", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);

export const minutesBetween = (start?: string, end?: string) => {
  if (!start) {
    return 0;
  }

  const startMs = new Date(start).getTime();
  const endMs = end ? new Date(end).getTime() : Date.now();
  return Math.max(0, Math.round((endMs - startMs) / 60000));
};

export const humanMinutes = (minutes: number) => {
  if (minutes < 1) {
    return "< 1 min";
  }

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
