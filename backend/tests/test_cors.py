import os
import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from admiro_backend.main import create_app
from admiro_backend.settings import get_settings


class CorsPreflightTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["ADMIRO_CORS_ORIGINS"] = (
            "https://blue-sky-06a872703.4.azurestaticapps.net,http://localhost:8080"
        )
        get_settings.cache_clear()
        self.client = TestClient(create_app())

    def tearDown(self) -> None:
        os.environ.pop("ADMIRO_CORS_ORIGINS", None)
        get_settings.cache_clear()

    def test_preflight_allows_configured_static_web_app_origin(self) -> None:
        response = self.client.options(
            "/api/summ-stats-ind-data",
            headers={
                "Origin": "https://blue-sky-06a872703.4.azurestaticapps.net",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "https://blue-sky-06a872703.4.azurestaticapps.net",
        )
        self.assertIn(
            "POST",
            response.headers.get("access-control-allow-methods", ""),
        )


if __name__ == "__main__":
    unittest.main()
