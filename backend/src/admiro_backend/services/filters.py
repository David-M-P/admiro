import polars as pl
from functools import lru_cache
from azure.core.exceptions import ResourceNotFoundError


from admiro_backend.services.data_access import _parq_metadata, _parq_read_parquet


@lru_cache(maxsize=1)
def _meta_map():
    lin_meta = _parq_metadata()
    meta_cols = ["ind", "sex", "pop", "reg", "dat", "lat", "lon"]
    existing = [c for c in meta_cols if c in lin_meta.columns]
    # map by "ind"
    return {d["ind"]: d for d in lin_meta.select(existing).to_dicts()}


def filter_frag_vis_ind(ind_list):
    meta_map = _meta_map()

    # inds = list(dict.fromkeys(s.rsplit("_", 1)[0] for s in ind_list))
    # filtered_lin_meta = lin_meta.filter(pl.col("ind").is_in(inds))

    df_list = []

    for ind_phase in ind_list:
        individual = ind_phase.rsplit("_", 1)[0]
        phase = ind_phase.rsplit("_", 1)[1]

        rel_path = f"fragments/phase_state={phase}/ind={individual}/0.parquet"

        try:
            sub_df = _parq_read_parquet(rel_path)
        except (ResourceNotFoundError, FileNotFoundError) as e:
            print(f"Missing parquet for ind={individual}: {rel_path} ({e})")
            continue
        except Exception as e:
            print(f"Error reading parquet for ind={individual}: {rel_path} ({e})")
            continue

        row = meta_map.get(individual)
        if row is None:
            print(f"Missing metadata for ind={individual}")
            continue

        # ind = row["ind"]
        sex = row["sex"]
        pop = row["pop"]
        reg = row["reg"]
        data = row["dat"]
        # lat = row["lat"]
        # lon = row["lon"]

        sub_df = (
            sub_df.with_columns(
                [
                    pl.lit(ind_phase).alias("ind_phase"),
                    pl.lit(sex).alias("sex"),
                    pl.lit(pop).alias("pop"),
                    pl.lit(reg).alias("reg"),
                    pl.lit(data).alias("dat"),
                ]
            )
            .select(
                [
                    "chrom",
                    "start",
                    "end",
                    "length",
                    "hap",
                    "mean_prob",
                    "called_sequence",
                    "mutationrate",
                    "snps",
                    "admixpopvariants",
                    "linkDAVC",
                    "Vindija",
                    "Chagyrskaya",
                    "Altai",
                    "Denisova",
                    "private_Vindija",
                    "private_Chagyrskaya",
                    "private_Altai",
                    "private_Denisova",
                    "shared_Neanderthal",
                    "shared_archaic",
                    "ancestry",
                    "min_dist_anc",
                    "min_dist_value",
                    "z_test_anc",
                    "z_test_dist",
                    "z_test_pval",
                    "ind",
                    "phase_state",
                    "ind_phase",
                    "sex",
                    "pop",
                    "reg",
                    "dat",
                ]
            )
            .rename(
                {
                    "chrom": "Chromosome",
                    "start": "Start",
                    "end": "End",
                    "length": "Length",
                    "hap": "Haplotype",
                    "mean_prob": "Mean Post. Prob.",
                    "called_sequence": "Called Seq.",
                    "mutationrate": "Mutation Rate",
                    "snps": "SNPs",
                    "admixpopvariants": "Admixt. Pop. Variants",
                    "linkDAVC": "Link. DAVC",
                    "Vindija": "Vindija",
                    "Chagyrskaya": "Chagyrskaya",
                    "Altai": "Altai",
                    "Denisova": "Denisova",
                    "private_Vindija": "Private Vindija",
                    "private_Chagyrskaya": "Private Chagyrskaya",
                    "private_Altai": "Private Altai",
                    "private_Denisova": "Private Denisova",
                    "shared_Neanderthal": "Shared Neanderthal",
                    "shared_archaic": "Shared Archaic",
                    "ancestry": "Ancestry",
                    "min_dist_anc": "Min. Distance Ancestry",
                    "min_dist_value": "Min. Distance Value",
                    "z_test_anc": "Ancestry Z test",
                    "z_test_dist": "Distance Z test",
                    "z_test_pval": "P-val Z test",
                    "ind": "Individual",
                    "phase_state": "Phase State",
                    "ind_phase": "Individual_Phase",
                    "sex": "Sex",
                    "pop": "Population",
                    "reg": "Region",
                    "dat": "Dataset",
                }
            )
        )

        df_list.append(sub_df)
    final_df = pl.concat(df_list)
    final_df = final_df.with_columns(
        [
            pl.when(pl.col(c).is_nan()).then(None).otherwise(pl.col(c)).alias(c)
            for c, dt in zip(final_df.columns, final_df.dtypes)
            if dt in (pl.Float32, pl.Float64)
        ]
    )

    return final_df.to_dicts()
