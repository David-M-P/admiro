const COMPACT_TABLE_FORMAT = "ct1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type CompactTablePayload = {
  f: string;
  c: string[];
  v: unknown[][];
};

const parseCompactTable = (payload: Record<string, unknown>): CompactTablePayload | null => {
  if (payload.f !== COMPACT_TABLE_FORMAT) return null;
  if (!Array.isArray(payload.c) || !payload.c.every((column) => typeof column === "string")) {
    throw new Error("Invalid compact table: expected string columns in 'c'.");
  }
  if (!Array.isArray(payload.v) || !payload.v.every((columnValues) => Array.isArray(columnValues))) {
    throw new Error("Invalid compact table: expected column arrays in 'v'.");
  }
  if (payload.c.length !== payload.v.length) {
    throw new Error("Invalid compact table: 'c' and 'v' length mismatch.");
  }

  return { f: payload.f, c: payload.c as string[], v: payload.v as unknown[][] };
};

const compactColumnsToRows = ({ c: columns, v: valuesByColumn }: CompactTablePayload) => {
  const rowCount = valuesByColumn.length > 0 ? valuesByColumn[0].length : 0;
  for (const columnValues of valuesByColumn) {
    if (columnValues.length !== rowCount) {
      throw new Error("Invalid compact table: column arrays do not have equal length.");
    }
  }

  const rows: Record<string, unknown>[] = Array.from({ length: rowCount }, () => ({}));
  columns.forEach((column, columnIndex) => {
    const columnValues = valuesByColumn[columnIndex];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      rows[rowIndex][column] = columnValues[rowIndex];
    }
  });
  return rows;
};

const columnsObjectToRows = (payload: Record<string, unknown>) => {
  const columns = Object.keys(payload).filter((key) => Array.isArray(payload[key]));
  if (columns.length === 0) return null;

  const rowCount = (payload[columns[0]] as unknown[]).length;
  for (const column of columns) {
    if ((payload[column] as unknown[]).length !== rowCount) {
      throw new Error("Invalid columnar payload: columns do not have equal length.");
    }
  }

  const rows: Record<string, unknown>[] = Array.from({ length: rowCount }, () => ({}));
  for (const column of columns) {
    const columnValues = payload[column] as unknown[];
    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      rows[rowIndex][column] = columnValues[rowIndex];
    }
  }
  return rows;
};

export const decodeRowsPayload = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) {
    throw new Error("Unexpected response format: expected array or object payload.");
  }

  const nestedRows = payload.rows;
  if (Array.isArray(nestedRows)) return nestedRows;

  const compactTable = parseCompactTable(payload);
  if (compactTable) return compactColumnsToRows(compactTable);

  const rows = columnsObjectToRows(payload);
  if (rows) return rows;

  throw new Error("Unexpected response format: object payload did not contain row data.");
};

export const decodeObjectRowsPayload = <TRow = Record<string, unknown>>(
  payload: unknown
): TRow[] => {
  const rows = decodeRowsPayload(payload);
  if (
    rows.every(
      (row) =>
        typeof row === "object" &&
        row !== null &&
        !Array.isArray(row)
    )
  ) {
    return rows as TRow[];
  }
  throw new Error("Unexpected response format: expected object rows.");
};
