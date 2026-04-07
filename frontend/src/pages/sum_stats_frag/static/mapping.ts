type StrMap = Record<string, string>;

const invert = (mapping: StrMap): StrMap =>
  Object.fromEntries(Object.entries(mapping).map(([key, value]) => [value, key])) as StrMap;

const toShort: StrMap = {
  "Chromosome": "chrom",
  "Start": "start",
  "End": "end",
  "Length": "len",
  "Haplotype": "hap",
  "Mean Post. Prob.": "mpp",
  "Called Seq.": "called_seq",
  "Mutation Rate": "mut_rate",
  "SNPs": "snps",
  "Admixt. Pop. Variants": "admx_pop_variants",
  "Link. DAVC": "link_davc",
  "Vindija": "vin",
  "Chagyrskaya": "cha",
  "Altai": "alt",
  "Denisova": "den",
  "Private Vindija": "private_vin",
  "Private Chagyrskaya": "private_cha",
  "Private Altai": "private_alt",
  "Private Denisova": "private_den",
  "Shared Neanderthal": "shared_nea",
  "Shared Archaic": "shared_arch",
  "Ancestry": "anc",
  "Min. Distance Ancestry": "min_dist_anc",
  "Min. Distance Value": "min_dist_val",
  "Ancestry Z test": "anc_z_test",
  "Distance Z test": "dist_z_test",
  "P-val Z test": "pval_z_test",
  "Individual": "ind",
  "Phase State": "phase_state",
  "Individual Phase": "ind_phase",
  "Sex": "sex",
  "Population": "pop",
  "Region": "reg",
  "Dataset": "dat",
};

const toLong: StrMap = invert(toShort);

const ancToShort: StrMap = {
  Vindija: "Vindija",
  Chagyrskaya: "Chagyrskaya",
  Altai: "Altai",
  Denisova: "Denisova",
  Ambiguous: "Ambiguous",
  AmbigNean: "AmbigNean",
  nonDAVC: "nonDAVC",
  Neanderthal: "Neanderthal",
};
const ancToLong = invert(ancToShort);

const regToShort: StrMap = {
  Europe: "EUR",
  "Middle East": "MID",
  "South Asia": "SAS",
  Africa: "AFR",
  "East Asia": "EAS",
  America: "AMR",
  Oceania: "OCE",
  "Central Asia": "CAS",
};
const regToLong = invert(regToShort);

const phaseToShort: StrMap = {
  Unphased: "unphased",
  Phased: "phased",
};
const phaseToLong = invert(phaseToShort);

const sexToShort: StrMap = {
  Female: "F",
  Male: "M",
};
const sexToLong = invert(sexToShort);

export const mapping = {
  toShort,
  toLong,
  values: {
    anc: { toShort: ancToShort, toLong: ancToLong },
    reg: { toShort: regToShort, toLong: regToLong },
    phase_state: { toShort: phaseToShort, toLong: phaseToLong },
    sex: { toShort: sexToShort, toLong: sexToLong },
  },
} as const;
