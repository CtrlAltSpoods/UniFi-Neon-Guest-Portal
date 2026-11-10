'use strict';
/**
 * South Australian holiday themes.
 *
 * Public holidays follow the SafeWork SA list (Holidays Act 1910), plus
 * Remembrance Day. Each theme shows for a short window around the day
 * (e.g. the long weekend), in the portal's local time zone.
 *
 * To add a theme: add an entry to themeWindows() and a matching visual
 * in public/index.html (THEMES map).
 */

const DAY = 86400000;

// Day number (days since epoch) for a calendar date, timezone-free.
const dn = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const dow = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun

function nthMonday(y, month, n) {
  const first = dow(y, month, 1);
  return 1 + ((8 - first) % 7) + 7 * (n - 1);
}

// Anonymous Gregorian algorithm -> [month, day] of Easter Sunday
function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return [month, day];
}

/** All theme windows touching calendar year y. Earlier entries win when windows overlap. */
function themeWindows(y) {
  const w = [];

  // New Year's Eve (part-day) + New Year's Day (+ Monday when it falls on a weekend)
  const ny = (yr) => {
    const wd = dow(yr, 1, 1);
    const extra = wd === 6 ? 2 : wd === 0 ? 1 : 0;
    return { id: 'newyear', start: dn(yr - 1, 12, 31), end: dn(yr, 1, 1) + extra, year: yr };
  };
  w.push(ny(y), ny(y + 1));

  // Australia Day — 26 Jan, moved to the following Monday when on a weekend
  {
    const wd = dow(y, 1, 26);
    const end = dn(y, 1, 26) + (wd === 6 ? 2 : wd === 0 ? 1 : 0);
    w.push({ id: 'australiaday', start: dn(y, 1, 24), end });
  }

  // Adelaide Cup Day — second Monday in March (from the Thursday before)
  { const d = nthMonday(y, 3, 2); w.push({ id: 'adelaidecup', start: dn(y, 3, d) - 4, end: dn(y, 3, d) }); }

  // Easter — Good Friday, Easter Saturday, Easter Sunday, Easter Monday (from Thursday)
  { const [m, d] = easterSunday(y); const e = dn(y, m, d); w.push({ id: 'easter', start: e - 3, end: e + 1 }); }

  // Anzac Day — 25 April (no substitute day in SA)
  w.push({ id: 'anzac', start: dn(y, 4, 24), end: dn(y, 4, 25) });

  // King's Birthday — second Monday in June (long weekend)
  { const d = nthMonday(y, 6, 2); w.push({ id: 'kings', start: dn(y, 6, d) - 3, end: dn(y, 6, d) }); }

  // Labour Day — first Monday in October (long weekend)
  { const d = nthMonday(y, 10, 1); w.push({ id: 'labour', start: dn(y, 10, d) - 3, end: dn(y, 10, d) }); }

  // Remembrance Day — 11 November (not a public holiday)
  w.push({ id: 'remembrance', start: dn(y, 11, 9), end: dn(y, 11, 11) });

  // Christmas season — covers Christmas Eve, Christmas Day, Proclamation Day and substitute days
  w.push({ id: 'christmas', start: dn(y, 12, 1), end: dn(y, 12, 30) });

  return w;
}

function bannerFor(id, y, m, d, extra = {}) {
  switch (id) {
    case 'newyear':
      return m === 12 ? `Happy New Year's Eve — ${y + 1} is coming!` : `Happy New Year ${extra.year || y}!`;
    case 'australiaday': return 'Happy Australia Day';
    case 'adelaidecup': return 'Adelaide Cup Day — they’re racing!';
    case 'easter': return 'Happy Easter! Find the hidden eggs';
    case 'anzac': return 'Anzac Day · Lest We Forget';
    case 'kings': return 'Happy King’s Birthday long weekend';
    case 'labour': return 'Happy Labour Day long weekend';
    case 'remembrance': return 'Remembrance Day · Lest We Forget';
    case 'christmas': {
      if (m !== 12) return 'Merry Christmas!';
      if (d < 24) { const n = 25 - d; return `${n} sleep${n === 1 ? '' : 's'} till Christmas!`; }
      if (d === 24) return 'It’s Christmas Eve!';
      if (d === 25) return 'Merry Christmas!';
      if (d === 26) return 'Happy Proclamation Day!';
      return 'Happy holidays — see you in the New Year!';
    }
    default: return '';
  }
}

const THEME_IDS = ['newyear', 'australiaday', 'adelaidecup', 'easter', 'anzac', 'kings', 'labour', 'remembrance', 'christmas'];

/** Local calendar date in the given IANA time zone. */
function localDate(timeZone, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (t) => parseInt(parts.find((p) => p.type === t).value, 10);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** Active theme for a date: { id, banner } or { id: 'none' }. */
function themeFor(y, m, d) {
  const today = dn(y, m, d);
  for (const win of themeWindows(y)) {
    if (today >= win.start && today <= win.end) return { id: win.id, banner: bannerFor(win.id, y, m, d, win) };
  }
  return { id: 'none', banner: '' };
}

/** A sample of a theme for previews (?theme=christmas or THEME=christmas). */
function previewTheme(id, y, m, d) {
  if (id === 'none' || !THEME_IDS.includes(id)) return { id: 'none', banner: '' };
  const sample = { christmas: [12, 25], newyear: [1, 1] }[id];
  return { id, banner: sample ? bannerFor(id, y, sample[0], sample[1], { year: y }) : bannerFor(id, y, m, d) };
}

module.exports = { themeFor, previewTheme, localDate, themeWindows, THEME_IDS };
