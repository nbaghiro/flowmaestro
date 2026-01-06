"""
FlowMaestro SDK Error Classes
"""
from __future__ import annotations

from typing import Any


class FlowMaestroError(Exception):
    """Base error class for all FlowMaestro SDK errors."""

    def __init__(
        self,
        message: str,
        code: str = "unknown_error",
        status_code: int | None = None,
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.request_id = request_id
        self.details = details

    def __str__(self) -> str:
        parts = [self.message]
        if self.code:
            parts.insert(0, f"[{self.code}]")
        if self.request_id:
            parts.append(f"(request_id: {self.request_id})")
        return " ".join(parts)

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}("
            f"message={self.message!r}, "
            f"code={self.code!r}, "
            f"status_code={self.status_code!r})"
        )


class AuthenticationError(FlowMaestroError):
    """
    Authentication error (401).

    Raised when API key is invalid, expired, or revoked.
    """

    def __init__(
        self,
        message: str = "Authentication failed",
        code: str = "authentication_error",
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=401,
            request_id=request_id,
            details=details,
        )


class AuthorizationError(FlowMaestroError):
    """
    Authorization error (403).

    Raised when API key lacks required scopes.
    """

    def __init__(
        self,
        message: str = "Authorization failed",
        code: str = "authorization_error",
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=403,
            request_id=request_id,
            details=details,
        )


class NotFoundError(FlowMaestroError):
    """
    Resource not found error (404).

    Raised when the requested resource does not exist.
    """

    def __init__(
        self,
        message: str = "Resource not found",
        code: str = "not_found",
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=404,
            request_id=request_id,
            details=details,
        )


class ValidationError(FlowMaestroError):
    """
    Validation error (400).

    Raised when request body or parameters are invalid.
    """

    def __init__(
        self,
        message: str = "Validation failed",
        code: str = "validation_error",
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=400,
            request_id=request_id,
            details=details,
        )


class RateLimitError(FlowMaestroError):
    """
    Rate limit error (429).

    Raised when API rate limit is exceeded.
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded",
        code: str = "rate_limit_exceeded",
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
        retry_after: int | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=429,
            request_id=request_id,
            details=details,
        )
        self.retry_after = retry_after


class ServerError(FlowMaestroError):
    """
    Server error (5xx).

    Raised when the server encounters an error.
    """

    def __init__(
        self,
        message: str = "Server error",
        code: str = "server_error",
        status_code: int = 500,
        request_id: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            request_id=request_id,
            details=details,
        )


class TimeoutError(FlowMaestroError):
    """
    Timeout error.

    Raised when a request or operation times out.
    """

    def __init__(self, message: str = "Request timed out") -> None:
        super().__init__(message=message, code="timeout")


class ConnectionError(FlowMaestroError):
    """
    Connection error.

    Raised when unable to connect to the API.
    """

    def __init__(self, message: str = "Unable to connect to FlowMaestro API") -> None:
        super().__init__(message=message, code="connection_error")


class StreamError(FlowMaestroError):
    """
    Stream error.

    Raised when SSE stream encounters an error.
    """

    def __init__(
        self,
        message: str = "Stream error",
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message=message, code="stream_error", details=details)


def parse_api_error(
    status_code: int,
    body: dict[str, Any],
    request_id: str | None = None,
) -> FlowMaestroError:
    """Parse an API error response and return the appropriate error class."""
    error_info = body.get("error", {})
    code = error_info.get("code", "unknown_error")
    message = error_info.get("message", "An unknown error occurred")
    details = error_info.get("details")

    if status_code == 400:
        return ValidationError(
            message=message, code=code, request_id=request_id, details=details
        )
    elif status_code == 401:
        return AuthenticationError(
            message=message, code=code, request_id=request_id, details=details
        )
    elif status_code == 403:
        return AuthorizationError(
            message=message, code=code, request_id=request_id, details=details
        )
    elif status_code == 404:
        return NotFoundError(
            message=message, code=code, request_id=request_id, details=details
        )
    elif status_code == 429:
        return RateLimitError(
            message=message, code=code, request_id=request_id, details=details
        )
    elif status_code >= 500:
        return ServerError(
            message=message,
            code=code,
            status_code=status_code,
            request_id=request_id,
            details=details,
        )
    else:
        return FlowMaestroError(
            message=message,
            code=code,
            status_code=status_code,
            request_id=request_id,
            details=details,
        )


__all__ = [
    "FlowMaestroError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ValidationError",
    "RateLimitError",
    "ServerError",
    "TimeoutError",
    "ConnectionError",
    "StreamError",
    "parse_api_error",
]
