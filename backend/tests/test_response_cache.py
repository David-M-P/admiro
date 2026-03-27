import sys
import time
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from admiro_backend.services.response_cache import ResponseTtlCache, build_cache_key


class ResponseCacheTests(unittest.TestCase):
    def test_build_cache_key_is_stable_for_dict_key_order(self) -> None:
        payload_a = {"mpp": 50, "phases": ["DATA", "PDAT"]}
        payload_b = {"phases": ["DATA", "PDAT"], "mpp": 50}

        key_a = build_cache_key("/api/summ-stats-ind-data", payload_a)
        key_b = build_cache_key("/api/summ-stats-ind-data", payload_b)

        self.assertEqual(key_a, key_b)

    def test_cache_entry_expires_after_ttl(self) -> None:
        cache = ResponseTtlCache(enabled=True, ttl_seconds=1, max_entries=4)
        cache.set("k1", {"v": 1})
        self.assertTrue(cache.get("k1").hit)

        # Move expiry near real-time by monkey patching via short sleep and tiny TTL.
        quick_cache = ResponseTtlCache(enabled=True, ttl_seconds=1, max_entries=4)
        quick_cache.set("k2", {"v": 2})
        # Force expiry by waiting and then manually replacing with a tiny-TTL cache payload.
        # This asserts behavior around stale entries without adding private API coupling.
        time.sleep(1.05)
        self.assertFalse(quick_cache.get("k2").hit)

    def test_cache_eviction_uses_lru_policy(self) -> None:
        cache = ResponseTtlCache(enabled=True, ttl_seconds=600, max_entries=2)
        cache.set("k1", {"v": 1})
        cache.set("k2", {"v": 2})

        # Touch k1 so k2 becomes oldest.
        self.assertTrue(cache.get("k1").hit)
        cache.set("k3", {"v": 3})

        self.assertFalse(cache.get("k2").hit)
        self.assertTrue(cache.get("k1").hit)
        self.assertTrue(cache.get("k3").hit)

    def test_disabled_cache_never_hits(self) -> None:
        cache = ResponseTtlCache(enabled=False, ttl_seconds=600, max_entries=2)
        cache.set("k1", {"v": 1})
        result = cache.get("k1")
        self.assertFalse(result.hit)
        self.assertIsNone(result.value)


if __name__ == "__main__":
    unittest.main()
