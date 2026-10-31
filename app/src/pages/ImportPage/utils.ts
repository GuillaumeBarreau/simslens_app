export type Row = string[];

export function parseCSV(text: string, delimiter = ','): Row[] {
  const rows: Row[] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        cur.push(field);
        field = '';
      } else if (ch === '\r') {
        // ignore
      } else if (ch === '\n') {
        cur.push(field);
        rows.push(cur);
        cur = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field !== '' || inQuotes) cur.push(field);
  if (cur.length > 0) rows.push(cur);
  return rows;
}

export function detectDelimiter(sample: string) {
  const counts: Record<string, number> = {
    ',': (sample.match(/,/g) || []).length,
    '\t': (sample.match(/\t/g) || []).length,
    ';': (sample.match(/;/g) || []).length,
  };
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries[0][1] === 0) return ',';
  return entries[0][0] === '\t' ? '\t' : entries[0][0];
}

export function parseRCLCText(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return [];

  let headerLine = lines[0];
  if (headerLine.startsWith('"') && headerLine.endsWith('"')) {
    headerLine = headerLine.slice(1, -1);
  }

  const headers = headerLine.split(',').map((h) => h.trim());
  const isRCLC =
    headers.length >= 20 &&
    headers.includes('player') &&
    headers.includes('itemID') &&
    headers.includes('gear1');
  if (!isRCLC) return parseCSV(text, ',');

  const rows: Row[] = [headers];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    if (!line.trim()) continue;
    if (line.startsWith('"') && line.endsWith('"')) line = line.slice(1, -1);
    const parts = line.split(',');

    const row: string[] = [];
    for (let j = 0; j < 15 && j < parts.length; j++) row.push(parts[j]);

    if (parts.length === 23) {
      for (let j = 15; j < 23; j++) row.push(parts[j]);
    } else if (parts.length > 23) {
      const lastFields: string[] = [];
      for (let j = 6; j > 0; j--) {
        lastFields.unshift(parts[parts.length - j]);
      }
      const gearSection = parts.slice(15, parts.length - 6);
      let gear1 = '';
      let gear2 = '';
      let gear1End = -1;
      for (let j = 0; j < gearSection.length; j++) {
        if (gearSection[j].includes('|h|r')) {
          gear1End = j;
          break;
        }
      }
      if (gear1End >= 0) {
        gear1 = gearSection.slice(0, gear1End + 1).join(',');
        if (gear1End + 1 < gearSection.length) gear2 = gearSection.slice(gear1End + 1).join(',');
      } else {
        gear1 = gearSection.join(',');
      }
      row.push(gear1);
      row.push(gear2);
      row.push(...lastFields);
    } else {
      while (row.length < 23) row.push('');
    }

    rows.push(row);
  }

  return rows;
}

export type SlimRow = {
  player: string;
  date: string;
  time: string;
  itemID: number | null;
  response: string;
  instance: string;
  owner: string;
};

export function rowsToSlim(rows: Row[]): SlimRow[] {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0].map((h) => h.trim());
  const mapToSlim = (rowArr: Row): SlimRow => {
    const raw: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) raw[headers[i]] = rowArr[i] != null ? rowArr[i] : '';

    const get = (cands: string[]) => {
      for (const c of cands) {
        if (raw[c] != null && raw[c] !== '') return raw[c];
        const lower = Object.keys(raw).find((k) => k.toLowerCase() === c.toLowerCase());
        if (lower) return raw[lower];
      }
      return '';
    };

    const itemIDraw = get(['itemID', 'itemId', 'itemid', 'item_id']) || '';
    const itemIDnum = (() => {
      const m = String(itemIDraw).match(/(\d{5,})/);
      if (m) return Number(m[1]);
      const is = get(['itemString', 'itemstring', 'item']) || '';
      const m2 = String(is).match(/(\d{5,})/);
      return m2 ? Number(m2[1]) : null;
    })();

    return {
      player: get(['player', 'name']),
      date: get(['date']),
      time: get(['time']),
      itemID: itemIDnum,
      response: get(['response']),
      instance: get(['instance']),
      owner: get(['owner']),
    };
  };

  return rows.slice(1).map(mapToSlim);
}
