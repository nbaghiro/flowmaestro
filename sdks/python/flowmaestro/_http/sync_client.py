"""
Synchronous HTTP client with retry logic.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from ..errors import (
    ConnectionError,
    FlowMaestroError,
    TimeoutError,
    parse_api_error,
)

DEFAULT_BASE_URL = "https://api.flowmaestro.io"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 3
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


class SyncHttpClient:
    """Synchronous HTTP client for the FlowMaestro API."""

    def __init__(
        self,
        api_key: str,
        base_url: str | None = None,
        timeout: float | None = None,
        max_retries: int | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout or DEFAULT_TIMEOUT
        self.max_retries = max_retries if max_retries is not None else DEFAULT_MAX_RETRIES
        self.custom_headers = headers or {}

        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            headers=self._build_headers(),
        )

    def _build_headers(self) -> dict[str, str]:
        """Build default headers for requests."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "flowmaestro-sdk-python/0.1.0",
            **self.custom_headers,
        }

    def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make a GET request."""
        return self._request("GET", path, params=params)

    def post(
        self,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make a POST request."""
        return self._request("POST", path, json=json)

    def put(
        self,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make a PUT request."""
        return self._request("PUT", path, json=json)

    def patch(
        self,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Make a PATCH request."""
        return self._request("PATCH", path, json=json)

    def delete(self, path: str) -> dict[str, Any]:
        """Make a DELETE request."""
        return self._request("DELETE", path)

    def _request(
        self,
        method: str,
        path: str,
        params: dict[str, Any] | None = None,
        json: dict[str, Any] | None = None,
        attempt: int = 0,
    ) -> dict[str, Any]:
        """Make a request with retry logic."""
        # Filter out None values from params
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        try:
            response = self._client.request(
                method=method,
                url=path,
                params=params,
                json=json,
            )

            request_id = response.headers.get("x-request-id")

            # Handle successful response
            if response.is_success:
                return response.json()

            # Handle error response
            try:
                error_body = response.json()
            except Exception:
                error_body = {}

            # Check if we should retry
            if response.status_code in RETRYABLE_STATUS_CODES and attempt < self.max_retries:
                delay = self._calculate_retry_delay(response, attempt)
                time.sleep(delay)
                return self._request(method, path, params, json, attempt + 1)

            # Raise appropriate error
            raise parse_api_error(response.status_code, error_body, request_id)

        except httpx.TimeoutException as e:
            raise TimeoutError(f"Request timed out after {self.timeout}s") from e

        except httpx.ConnectError as e:
            # Retry on connection errors
            if attempt < self.max_retries:
                delay = self._calculate_backoff(attempt)
                time.sleep(delay)
                return self._request(method, path, params, json, attempt + 1)
            raise ConnectionError(str(e)) from e

        except FlowMaestroError:
            raise

        except Exception as e:
            raise ConnectionError(f"Unexpected error: {e}") from e

    def _calculate_retry_delay(self, response: httpx.Response, attempt: int) -> float:
        """Calculate retry delay based on response headers or exponential backoff."""
        # Check for Retry-After header
        retry_after = response.headers.get("retry-after")
        if retry_after:
            try:
                return float(retry_after)
            except ValueError:
                pass

        # Fall back to exponential backoff
        return self._calculate_backoff(attempt)

    def _calculate_backoff(self, attempt: int) -> float:
        """Calculate exponential backoff delay with jitter."""
        import random

        base_delay = (2**attempt) * 1.0
        jitter = random.uniform(0, 0.5)
        return base_delay + jitter

    def close(self) -> None:
        """Close the HTTP client."""
        self._client.close()

    def __enter__(self) -> SyncHttpClient:
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
