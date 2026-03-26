from __future__ import annotations

from typing import Any

import polars as pl

COMPACT_TABLE_FORMAT = "ct1"


def _nullify_float_nans(df: pl.DataFrame) -> pl.DataFrame:
    float_exprs = [
        pl.when(pl.col(column).is_nan())
        .then(None)
        .otherwise(pl.col(column))
        .alias(column)
        for column, dtype in zip(df.columns, df.dtypes)
        if dtype in (pl.Float32, pl.Float64)
    ]
    if not float_exprs:
        return df
    return df.with_columns(float_exprs)


def to_compact_table(df: pl.DataFrame) -> dict[str, Any]:
    normalized_df = _nullify_float_nans(df)
    return {
        "f": COMPACT_TABLE_FORMAT,
        "c": normalized_df.columns,
        "v": [series.to_list() for series in normalized_df.iter_columns()],
    }


def empty_compact_table(columns: list[str]) -> dict[str, Any]:
    return {"f": COMPACT_TABLE_FORMAT, "c": columns, "v": [[] for _ in columns]}
