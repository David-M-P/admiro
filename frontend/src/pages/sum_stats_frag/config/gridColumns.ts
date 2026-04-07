import { ColDef, ValueFormatterParams } from "ag-grid-community";

const textFilterParams = {
  defaultOption: "contains",
  textFormatter: (raw: string) => raw.trim().toLowerCase(),
} as const;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
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
  if (raw == null) return params.value == null ? "" : String(params.value);

  const abs = Math.abs(raw);
  const useScientificNotation = abs !== 0 && (abs >= 1e6 || abs < 1e-4);
  return useScientificNotation ? raw.toExponential(4) : raw.toFixed(4);
};

const createTranslateFormatter =
  (mappingToLong: Record<string, string>) => (params: ValueFormatterParams) => {
    const raw = params.value;
    if (raw == null) return "";
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

export const createSummStatFragGridColumns = (
  mappingToLong: Record<string, string>,
): ColDef[] => {
  const translate = createTranslateFormatter(mappingToLong);

  return [
    textColumn("Chromosome", "chrom", translate),
    numberColumn("Start", "start"),
    numberColumn("End", "end"),
    numberColumn("Length", "len"),
    textColumn("Haplotype", "hap", translate),
    numberColumn("Mean Post. Prob.", "mpp"),
    numberColumn("Called Seq.", "called_seq"),
    numberColumn("Mutation Rate", "mut_rate", true),
    numberColumn("SNPs", "snps", true),
    numberColumn("Admixt. Pop. Variants", "admx_pop_variants", true),
    numberColumn("Link. DAVC", "link_davc", true),
    numberColumn("Vindija", "vin", true),
    numberColumn("Chagyrskaya", "cha", true),
    numberColumn("Altai", "alt", true),
    numberColumn("Denisova", "den", true),
    numberColumn("Private Vindija", "private_vin", true),
    numberColumn("Private Chagyrskaya", "private_cha", true),
    numberColumn("Private Altai", "private_alt", true),
    numberColumn("Private Denisova", "private_den", true),
    numberColumn("Shared Neanderthal", "shared_nea", true),
    numberColumn("Shared Archaic", "shared_arch", true),
    textColumn("Ancestry", "anc", translate),
    textColumn("Min. Distance Ancestry", "min_dist_anc", translate, true),
    numberColumn("Min. Distance Value", "min_dist_val", true),
    textColumn("Ancestry Z test", "anc_z_test", translate, true),
    numberColumn("Distance Z test", "dist_z_test", true),
    numberColumn("P-val Z test", "pval_z_test", true),
    textColumn("Individual", "ind", translate),
    textColumn("Phase State", "phase_state", translate),
    textColumn("Individual Phase", "ind_phase", translate, true),
    textColumn("Sex", "sex", translate),
    textColumn("Population", "pop", translate),
    textColumn("Region", "reg", translate),
    textColumn("Dataset", "dat", translate),
  ];
};
