import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import polars as pl
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from admiro_backend.main import create_app
from admiro_backend.api.routes import _fragvisreg_cache
from admiro_backend.services.filters import filter_frag_vis_reg
from admiro_backend.settings import get_settings


class FragVisRegFilterTests(unittest.TestCase):
    def test_returns_raw_change_point_payload(self) -> None:
        df = pl.DataFrame(
            {
                "chrom": ["1", "1", "2"],
                "position": [100, 200, 50],
                "n_contain": [1, 0, 2],
                "n_total": [10, 10, 20],
                "freq": [0.1, 0.0, 0.1],
                "extra": ["x", "y", "z"],
            }
        )

        with patch(
            "admiro_backend.services.filters._parq_read_parquet", return_value=df
        ) as mock_read:
            result = filter_frag_vis_reg(
                plot_type="freq",
                phase_state="DATA",
                region="AMR",
                ancestry="All",
                mpp=50,
            )

        self.assertEqual(
            result,
            {
                "f": "ct1",
                "c": ["chrom", "position", "n_contain", "n_total", "freq"],
                "v": [
                    ["1", "1", "2"],
                    [100, 200, 50],
                    [1, 0, 2],
                    [10, 10, 20],
                    [0.1, 0.0, 0.1],
                ],
            },
        )
        mock_read.assert_called_once_with(
            "fragments_reg/plot=freq/phase_state=DATA/reg=AMR/anc=All/mpp=50/0.parquet"
        )

    def test_returns_empty_when_parquet_is_missing(self) -> None:
        with patch(
            "admiro_backend.services.filters._parq_read_parquet",
            side_effect=FileNotFoundError("missing"),
        ):
            result = filter_frag_vis_reg(
                plot_type="freq",
                phase_state="DATA",
                region="AMR",
                ancestry="All",
                mpp=50,
            )
        self.assertEqual(
            result,
            {
                "f": "ct1",
                "c": ["chrom", "position", "n_contain", "n_total", "freq"],
                "v": [[], [], [], [], []],
            },
        )

    def test_returns_composition_payload(self) -> None:
        df = pl.DataFrame(
            {
                "index": [0, 1],
                "pop_combination": [["EAS"], ["EAS", "OCE"]],
                "total_sequence": [120, 95],
                "extra": ["x", "y"],
            }
        )

        with patch(
            "admiro_backend.services.filters._parq_read_parquet", return_value=df
        ) as mock_read:
            result = filter_frag_vis_reg(
                plot_type="composition",
                phase_state="PDAT",
                region=None,
                ancestry="Denisova",
                mpp=80,
            )

        self.assertEqual(
            result,
            {
                "f": "ct1",
                "c": ["index", "pop_combination", "total_sequence"],
                "v": [[0, 1], [["EAS"], ["EAS", "OCE"]], [120, 95]],
            },
        )
        mock_read.assert_called_once_with(
            "fragments_reg/plot=composition/phase_state=PDAT/anc=Denisova/mpp=80/0.parquet"
        )

    def test_returns_empty_composition_when_parquet_is_missing(self) -> None:
        with patch(
            "admiro_backend.services.filters._parq_read_parquet",
            side_effect=FileNotFoundError("missing"),
        ):
            result = filter_frag_vis_reg(
                plot_type="composition",
                phase_state="DATA",
                region=None,
                ancestry="All",
                mpp=50,
            )
        self.assertEqual(
            result,
            {
                "f": "ct1",
                "c": ["index", "pop_combination", "total_sequence"],
                "v": [[], [], []],
            },
        )

    def test_raises_when_required_columns_are_missing(self) -> None:
        df = pl.DataFrame(
            {
                "chrom": ["1"],
                "start": [100],
                "end": [200],
                "n_contain": [1],
                "n_total": [10],
                "freq": [0.1],
            }
        )

        with patch("admiro_backend.services.filters._parq_read_parquet", return_value=df):
            with self.assertRaises(ValueError) as ctx:
                filter_frag_vis_reg(
                    plot_type="freq",
                    phase_state="DATA",
                    region="AMR",
                    ancestry="All",
                    mpp=50,
                )

        self.assertIn("Missing required columns", str(ctx.exception))
        self.assertIn("position", str(ctx.exception))

    def test_raises_when_composition_columns_are_missing(self) -> None:
        df = pl.DataFrame(
            {
                "index": [0],
                "total_sequence": [10],
            }
        )

        with patch("admiro_backend.services.filters._parq_read_parquet", return_value=df):
            with self.assertRaises(ValueError) as ctx:
                filter_frag_vis_reg(
                    plot_type="composition",
                    phase_state="DATA",
                    region=None,
                    ancestry="All",
                    mpp=50,
                )

        self.assertIn("Missing required columns", str(ctx.exception))
        self.assertIn("pop_combination", str(ctx.exception))

    def test_raises_on_unsupported_plot_type(self) -> None:
        with self.assertRaises(ValueError):
            filter_frag_vis_reg(
                plot_type="joined",
                phase_state="DATA",
                region="AMR",
                ancestry="All",
                mpp=50,
            )

    def test_raises_on_invalid_mpp(self) -> None:
        with self.assertRaises(ValueError):
            filter_frag_vis_reg(
                plot_type="freq",
                phase_state="DATA",
                region="AMR",
                ancestry="All",
                mpp="fifty",
            )

    def test_raises_on_missing_region_for_freq(self) -> None:
        with self.assertRaises(ValueError):
            filter_frag_vis_reg(
                plot_type="freq",
                phase_state="DATA",
                region=None,
                ancestry="All",
                mpp=50,
            )


class FragVisRegRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["ADMIRO_CORS_ORIGINS"] = "http://localhost:8080"
        get_settings.cache_clear()
        _fragvisreg_cache.clear()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        os.environ.pop("ADMIRO_CORS_ORIGINS", None)
        get_settings.cache_clear()

    def test_fragvisreg_route_returns_raw_payload(self) -> None:
        payload = {
            "f": "ct1",
            "c": ["chrom", "position", "n_contain", "n_total", "freq"],
            "v": [["1"], [100], [1], [10], [0.1]],
        }
        with patch("admiro_backend.api.routes.filter_frag_vis_reg", return_value=payload):
            response = self.client.post(
                "/api/fragvisreg-data",
                json={
                    "plot_type": "freq",
                    "phase_state": "DATA",
                    "region": "AMR",
                    "ancestry": "All",
                    "mpp": 50,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), payload)
        self.assertEqual(response.headers.get("x-admiro-cache"), "MISS")
        self.assertIn("total;dur=", response.headers.get("server-timing", ""))
        self.assertIn("compute;dur=", response.headers.get("server-timing", ""))
        self.assertIn("serialize;dur=", response.headers.get("server-timing", ""))

    def test_fragvisreg_route_returns_composition_payload_without_region(self) -> None:
        payload = {
            "f": "ct1",
            "c": ["index", "pop_combination", "total_sequence"],
            "v": [[0], [["EAS"]], [100]],
        }
        with patch("admiro_backend.api.routes.filter_frag_vis_reg", return_value=payload):
            response = self.client.post(
                "/api/fragvisreg-data",
                json={
                    "plot_type": "composition",
                    "phase_state": "PDAT",
                    "ancestry": "All",
                    "mpp": 80,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), payload)

    def test_fragvisreg_route_returns_400_on_non_freq_plot(self) -> None:
        response = self.client.post(
            "/api/fragvisreg-data",
            json={
                "plot_type": "joined",
                "phase_state": "DATA",
                "region": "AMR",
                "ancestry": "All",
                "mpp": 50,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported plot_type", response.json()["detail"])

    def test_fragvisreg_route_returns_400_on_value_error(self) -> None:
        with patch(
            "admiro_backend.api.routes.filter_frag_vis_reg",
            side_effect=ValueError("Unsupported mpp='bad'"),
        ):
            response = self.client.post(
                "/api/fragvisreg-data",
                json={
                    "plot_type": "freq",
                    "phase_state": "DATA",
                    "region": "AMR",
                    "ancestry": "All",
                    "mpp": 50,
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported mpp", response.json()["detail"])

    def test_fragvisreg_route_returns_400_on_invalid_composition_input(self) -> None:
        response = self.client.post(
            "/api/fragvisreg-data",
            json={
                "plot_type": "composition",
                "phase_state": "DATA",
                "ancestry": "",
                "mpp": 80,
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Missing required field 'ancestry'", response.json()["detail"])

    def test_fragvisreg_route_uses_cache_for_identical_payload(self) -> None:
        payload = {
            "f": "ct1",
            "c": ["chrom", "position", "n_contain", "n_total", "freq"],
            "v": [["1"], [100], [1], [10], [0.1]],
        }
        request_payload = {
            "plot_type": "freq",
            "phase_state": "DATA",
            "region": "AMR",
            "ancestry": "All",
            "mpp": 50,
        }

        with patch("admiro_backend.api.routes.filter_frag_vis_reg", return_value=payload) as mock_filter:
            first = self.client.post("/api/fragvisreg-data", json=request_payload)
            second = self.client.post("/api/fragvisreg-data", json=request_payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.headers.get("x-admiro-cache"), "MISS")
        self.assertEqual(second.headers.get("x-admiro-cache"), "HIT")
        self.assertEqual(mock_filter.call_count, 1)


if __name__ == "__main__":
    unittest.main()
