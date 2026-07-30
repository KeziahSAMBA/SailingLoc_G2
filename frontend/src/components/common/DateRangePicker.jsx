import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseISO(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isBeforeDay(a, b) {
  return startOfDay(a).getTime() < startOfDay(b).getTime();
}

function isSameDay(a, b) {
  return !!a && !!b && startOfDay(a).getTime() === startOfDay(b).getTime();
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

// Grille du mois, semaine commençant le lundi ; null = case vide avant le 1er du mois.
function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(year, month, d));
  return cells;
}

function DateField({ label, displayValue, placeholder, onClick, light }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`mx-0.5 flex w-full flex-col justify-center rounded-xl px-3 py-2 text-center transition-colors cursor-pointer sm:w-auto sm:rounded-full sm:px-5 sm:py-0.5 ${light ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
    >
      <span
        className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${light ? 'text-white' : 'text-black'}`}
      >
        {label}
      </span>
      <span
        className={`text-xs whitespace-nowrap ${light ? (displayValue ? 'text-white/80' : 'text-white/50') : displayValue ? 'text-black/80' : 'text-black/50'}`}
      >
        {displayValue || placeholder}
      </span>
    </button>
  );
}

function DateRangePicker({
  start,
  end,
  onChangeStart,
  onChangeEnd,
  isDateAvailable,
  onOpen,
  light,
  panelPlacement = 'bottom-left',
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const parsed = parseISO(start);
    const base = parsed && !isBeforeDay(parsed, new Date()) ? parsed : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const startDate = parseISO(start);
  const endDate = parseISO(end);
  const today = startOfDay(new Date());
  const locale = i18n.language === 'en' ? 'en-GB' : 'fr-FR';
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const monthFormatter = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const weekdayFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    weekdayFormatter.format(new Date(2023, 0, 2 + i))
  );

  function openAt(monthAnchor) {
    if (monthAnchor && !isBeforeDay(monthAnchor, today)) {
      setMonth(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1));
    }
    if (!open) onOpen?.();
    setOpen(true);
  }

  function handleDayClick(day) {
    if (isBeforeDay(day, today) || !isDateAvailable(day)) return;
    if (!startDate || (startDate && endDate) || isBeforeDay(day, startDate)) {
      onChangeStart(toISO(day));
      onChangeEnd('');
    } else if (isSameDay(day, startDate)) {
      // no-op, garde juste la date de début
    } else {
      onChangeEnd(toISO(day));
      setOpen(false);
    }
  }

  const cells = buildMonthGrid(month);
  const canGoPrev = isBeforeDay(today, month) || month.getMonth() === today.getMonth();

  const displayValue = startDate
    ? `${dateFormatter.format(startDate)}${endDate ? ` - ${dateFormatter.format(endDate)}` : ''}`
    : '';

  return (
    <div ref={containerRef} className="relative flex w-full items-stretch sm:w-auto">
      <DateField
        label={t('searchBar.dates')}
        displayValue={displayValue}
        placeholder={t('searchBar.addDate')}
        onClick={() => openAt(startDate)}
        light={light}
      />

      {startDate && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChangeStart('');
            onChangeEnd('');
          }}
          title={t('searchBar.resetDatesTitle')}
          className={`flex items-center justify-center w-5 h-5 rounded-full transition-colors self-center mr-1.5 ${light ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'}`}
        >
          <FiX size={12} />
        </button>
      )}

      {open && (
        <div
          className={`absolute w-[min(18rem,calc(100vw-2rem))] rounded-xl bg-white shadow-xl border border-gray-100 p-3 z-50 text-left ${
            panelPlacement === 'top-right' ? 'right-0 bottom-full mb-2' : 'left-0 top-full mt-2'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              disabled={!canGoPrev}
              onClick={() => setMonth((m) => addMonths(m, -1))}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            <span className="text-xs font-semibold text-gray-700 capitalize">
              {monthFormatter.format(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => addMonths(m, 1))}
              className="w-6 h-6 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-y-1 text-center">
            {weekdays.map((wd) => (
              <span key={wd} className="text-[10px] uppercase text-gray-400">
                {wd}
              </span>
            ))}
            {cells.map((day, i) => {
              if (!day) return <span key={`empty-${i}`} />;
              const disabled = isBeforeDay(day, today) || !isDateAvailable(day);
              const isStart = isSameDay(day, startDate);
              const isEnd = isSameDay(day, endDate);
              const inRange = startDate && endDate && day > startDate && day < endDate;

              let cellClass = 'text-gray-300 cursor-not-allowed';
              if (isStart || isEnd) {
                cellClass = 'bg-sky-600 text-white font-semibold';
              } else if (inRange) {
                cellClass = 'bg-sky-100 text-sky-800';
              } else if (!disabled) {
                cellClass = 'bg-green-200 text-green-800 hover:bg-green-300 cursor-pointer';
              }

              return (
                <button
                  key={toISO(day)}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(day)}
                  className={`w-8 h-8 mx-auto flex items-center justify-center rounded-full text-xs transition-colors ${cellClass}`}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full bg-green-200 border border-green-400 inline-block" />
            {t('searchBar.datesAvailable')}
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
