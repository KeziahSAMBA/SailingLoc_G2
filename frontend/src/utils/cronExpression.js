// Traduction entre une expression cron à 5 champs et un choix de fréquence
// lisible. Une expression qui ne rentre dans aucun moule reste éditable telle
// quelle en mode « personnalisé » : on n'empêche jamais un planning valide.

const pad = (n) => String(n).padStart(2, '0');

export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export function parseCron(expression) {
  const fields = String(expression ?? '')
    .trim()
    .split(/\s+/);
  if (fields.length !== 5) return { mode: 'custom', minute: 0, hour: 3, weekday: 1 };

  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  const isNumber = (v) => /^\d+$/.test(v);

  if (
    isNumber(minute) &&
    hour === '*' &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return { mode: 'hourly', minute: Number(minute), hour: 3, weekday: 1 };
  }
  if (
    isNumber(minute) &&
    isNumber(hour) &&
    dayOfMonth === '*' &&
    month === '*' &&
    dayOfWeek === '*'
  ) {
    return { mode: 'daily', minute: Number(minute), hour: Number(hour), weekday: 1 };
  }
  if (
    isNumber(minute) &&
    isNumber(hour) &&
    dayOfMonth === '*' &&
    month === '*' &&
    isNumber(dayOfWeek)
  ) {
    return {
      mode: 'weekly',
      minute: Number(minute),
      hour: Number(hour),
      weekday: Number(dayOfWeek),
    };
  }
  return { mode: 'custom', minute: 0, hour: 3, weekday: 1 };
}

export function buildCron({ mode, minute = 0, hour = 3, weekday = 1 }) {
  const m = Math.min(59, Math.max(0, Number(minute) || 0));
  const h = Math.min(23, Math.max(0, Number(hour) || 0));
  if (mode === 'hourly') return `${m} * * * *`;
  if (mode === 'daily') return `${m} ${h} * * *`;
  if (mode === 'weekly') return `${m} ${h} * * ${Number(weekday) || 0}`;
  return null;
}

// Libellé lisible, avec repli sur l'expression brute pour tout ce qui sort des
// trois fréquences assistées.
export function describeCron(expression, t) {
  const parsed = parseCron(expression);
  const time = `${pad(parsed.hour)}:${pad(parsed.minute)}`;

  if (parsed.mode === 'hourly') {
    return t('adminCron.freq.hourlyAt', { minute: pad(parsed.minute) });
  }
  if (parsed.mode === 'daily') return t('adminCron.freq.dailyAt', { time });
  if (parsed.mode === 'weekly') {
    return t('adminCron.freq.weeklyAt', {
      day: t(`adminCron.weekdays.${parsed.weekday}`),
      time,
    });
  }
  return expression;
}
