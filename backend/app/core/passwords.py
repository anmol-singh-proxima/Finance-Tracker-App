"""Password hashing for the local auth provider (TR-SEC-01L).

bcrypt with a per-password salt; the cost factor is bcrypt's default. Never
store or log the plaintext password.
"""

import bcrypt


def hash_password(plain: str) -> str:
    # bcrypt operates on bytes and has a 72-byte input limit; encode explicitly.
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        # Malformed/invalid stored hash — treat as a non-match rather than raising.
        return False
