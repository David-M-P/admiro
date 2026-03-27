import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from admiro_backend.main import create_app
from admiro_backend.api.routes import _summ_stats_cache
from admiro_backend.settings import get_settings


class SummStatsRouteTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["ADMIRO_CORS_ORIGINS"] = "http://localhost:8080"
        get_settings.cache_clear()
        _summ_stats_cache.clear()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        os.environ.pop("ADMIRO_CORS_ORIGINS", None)
        get_settings.cache_clear()

    def test_route_returns_ct1_payload_and_observability_headers(self) -> None:
        payload = {
            "f": "ct1",
            "c": ["ind", "phase_state", "mpp"],
            "v": [["id1"], ["DATA"], [50]],
        }

        with patch("admiro_backend.api.routes.filter_summ_stats_ind", return_value=payload):
            response = self.client.post(
                "/api/summ-stats-ind-data",
                json={"phases": ["DATA"], "mpp": 50},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), payload)
        self.assertEqual(response.headers.get("x-admiro-cache"), "MISS")
        self.assertIn("total;dur=", response.headers.get("server-timing", ""))
        self.assertIn("compute;dur=", response.headers.get("server-timing", ""))
        self.assertIn("serialize;dur=", response.headers.get("server-timing", ""))

    def test_identical_request_hits_cache(self) -> None:
        payload = {
            "f": "ct1",
            "c": ["ind", "phase_state", "mpp"],
            "v": [["id1"], ["DATA"], [50]],
        }
        request_payload = {"phases": ["DATA"], "mpp": 50}

        with patch("admiro_backend.api.routes.filter_summ_stats_ind", return_value=payload) as mock_filter:
            first = self.client.post("/api/summ-stats-ind-data", json=request_payload)
            second = self.client.post("/api/summ-stats-ind-data", json=request_payload)

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.headers.get("x-admiro-cache"), "MISS")
        self.assertEqual(second.headers.get("x-admiro-cache"), "HIT")
        self.assertEqual(mock_filter.call_count, 1)

    def test_route_returns_500_on_unexpected_error(self) -> None:
        with patch(
            "admiro_backend.api.routes.filter_summ_stats_ind",
            side_effect=RuntimeError("boom"),
        ):
            response = self.client.post(
                "/api/summ-stats-ind-data",
                json={"phases": ["DATA"], "mpp": 50},
            )

        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.json()["detail"], "boom")


if __name__ == "__main__":
    unittest.main()
