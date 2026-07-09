"""In-memory sliding-window rate limiter (TR-SEC-01L)."""

from app.core.rate_limit import SlidingWindowRateLimiter


def test_allows_up_to_the_limit_then_blocks() -> None:
    limiter = SlidingWindowRateLimiter(max_attempts=3, window_seconds=60)
    assert [limiter.check("1.2.3.4") for _ in range(3)] == [True, True, True]
    assert limiter.check("1.2.3.4") is False


def test_limits_are_per_key() -> None:
    limiter = SlidingWindowRateLimiter(max_attempts=1, window_seconds=60)
    assert limiter.check("ip-a") is True
    assert limiter.check("ip-a") is False
    # A different key has its own budget.
    assert limiter.check("ip-b") is True


def test_reset_clears_state() -> None:
    limiter = SlidingWindowRateLimiter(max_attempts=1, window_seconds=60)
    assert limiter.check("k") is True
    assert limiter.check("k") is False
    limiter.reset()
    assert limiter.check("k") is True
