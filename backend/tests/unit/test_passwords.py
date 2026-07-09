"""bcrypt password hashing (TR-SEC-01L)."""

from app.core.passwords import hash_password, verify_password


def test_hash_is_not_plaintext_and_verifies() -> None:
    hashed = hash_password("correct horse battery staple")
    assert hashed != "correct horse battery staple"
    assert verify_password("correct horse battery staple", hashed) is True


def test_wrong_password_does_not_verify() -> None:
    hashed = hash_password("s3cret-password")
    assert verify_password("not-the-password", hashed) is False


def test_same_password_hashes_differently_each_time() -> None:
    # Distinct salts → distinct hashes; both still verify.
    a = hash_password("same-password")
    b = hash_password("same-password")
    assert a != b
    assert verify_password("same-password", a)
    assert verify_password("same-password", b)


def test_malformed_hash_returns_false_not_error() -> None:
    assert verify_password("anything", "not-a-valid-bcrypt-hash") is False
