import {
  ColDef,
  ColGroupDef,
  ValueFormatterParams,
} from "ag-grid-community";

const textFilterParams = {
  defaultOption: "contains",
  textFormatter: (raw: string) => raw.trim().toLowerCase(),
} as const;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const scientificFormatter = (params: ValueFormatterParams) => {
  const raw = toFiniteNumber(params.value);
  if (raw == null) {
    return params.value == null ? "" : String(params.value);
  }

  const abs = Math.abs(raw);
  const useScientificNotation = abs !== 0 && (abs >= 1e6 || abs < 1e-4);

  return useScientificNotation ? raw.toExponential(4) : raw.toFixed(4);
};

const createTranslateFormatter =
  (mappingToLong: Record<string, string>) => (params: ValueFormatterParams) => {
    const raw = params.value;
    if (raw == null) return "0";
    const key = String(raw);
    return mappingToLong[key] ?? key;
  };

const textColumn = (
  headerName: string,
  field: string,
  translate: (params: ValueFormatterParams) => string,
  hide = false,
): ColDef => ({
  headerName,
  field,
  flex: 1,
  valueFormatter: translate,
  hide,
  filter: "agTextColumnFilter",
  filterParams: textFilterParams,
});

const numberColumn = (headerName: string, field: string, hide = false): ColDef => ({
  headerName,
  field,
  flex: 1,
  hide,
  filter: "agNumberColumnFilter",
  valueFormatter: scientificFormatter,
});

export const createSummStatGridColumns = (
  mappingToLong: Record<string, string>,
): Array<ColDef | ColGroupDef> => {
  const translate = createTranslateFormatter(mappingToLong);

  return [
    textColumn("Individual", "ind", translate),
    textColumn("Dataset", "dat", translate),
    textColumn("Region", "reg", translate),
    textColumn("Population", "pop", translate),
    textColumn("Haplotype", "hap", translate),
    textColumn("Sex", "sex", translate),
    numberColumn("Mean Length (bp)", "len_mea"),
    numberColumn("Median Length (bp)", "len_med"),
    {
      headerName: "Ancestry Details",
      children: [
        textColumn("Ancestry", "anc", translate, true),
        numberColumn("Anc Africa", "ancAFR", true),
        numberColumn("Anc America", "ancAMR", true),
        numberColumn("Anc East Asia", "ancEAS", true),
        numberColumn("Anc Europe", "ancEUR", true),
        numberColumn("Anc Oceania", "ancOCE", true),
        numberColumn("Anc Oceania 2", "ancOCE2", true),
        numberColumn("Anc South Asia", "ancSAS", true),
        numberColumn("Anc Middle East", "ancMID", true),
      ],
    },
    textColumn("Chromosome", "chrom", translate, true),
    numberColumn("Latitude", "lat", true),
    numberColumn("Longitude", "lon", true),
    numberColumn("Max Length (bp)", "len_max", true),
    numberColumn("Min Length (bp)", "len_min", true),
    numberColumn("N Fragments", "nfr", true),
    numberColumn("Sequence", "seq", true),
  ];
};
