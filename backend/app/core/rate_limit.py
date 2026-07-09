"""A minimal in-memory, per-key sliding-window rate limiter for the open
(unauthenticated) auth endpoints (TR-SEC-01L: throttle brute-force/DDoS).

Scope: single process only — adequate for the local profile, which runs one
backend instance. In staging/production the auth endpoints don't exist (Cognito
owns auth) and the edge WAF provides rate limiting (TR-SEC-08).
"""

import time
from collections import defaultdict, deque


class SlidingWindowRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self._max = max_attempts
        self._window = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str) -> bool:
        """Record an attempt for `key`; return True if it is allowed, False if
        the key has exceeded `max_attempts` within the window."""
        now = time.monotonic()
        window_start = now - self._window
        hits = self._hits[key]
        while hits and hits[0] < window_start:
            hits.popleft()
        if len(hits) >= self._max:
            return False
        hits.append(now)
        return True

    def reset(self) -> None:
        """Clear all state (used by tests)."""
        self._hits.clear()
