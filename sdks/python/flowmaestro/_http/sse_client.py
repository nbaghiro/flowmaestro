"""
Server-Sent Events (SSE) client for streaming.
"""
from __future__ import annotations

import json
from collections.abc import AsyncIterator, Iterator
from typing import Any, TypeVar

import httpx
from httpx_sse import aconnect_sse, connect_sse

from ..errors import ConnectionError, StreamError

T = TypeVar("T")


class SyncSSEClient:
    """Synchronous SSE client for streaming events."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.custom_headers = headers or {}

    def _build_headers(self) -> dict[str, str]:
        """Build headers for SSE connection."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache",
            **self.custom_headers,
        }

    def stream(self, path: str) -> Iterator[dict[str, Any]]:
        """
        Stream events from an SSE endpoint.

        Yields:
            Parsed JSON events from the stream.

        Example:
            for event in client.stream("/api/v1/executions/123/events"):
                print(event["type"])
        """
        url = f"{self.base_url}{path}"
        headers = self._build_headers()

        try:
            with httpx.Client() as client:
                with connect_sse(client, "GET", url, headers=headers) as event_source:
                    for sse in event_source.iter_sse():
                        if sse.data:
                            try:
                                yield json.loads(sse.data)
                            except json.JSONDecodeError:
                                # Skip malformed JSON
                                pass

        except httpx.ConnectError as e:
            raise ConnectionError(f"Failed to connect to SSE stream: {e}") from e
        except httpx.TimeoutException as e:
            raise StreamError(f"SSE stream timed out: {e}") from e
        except Exception as e:
            raise StreamError(f"SSE stream error: {e}") from e


class AsyncSSEClient:
    """Asynchronous SSE client for streaming events."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        headers: dict[str, str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.custom_headers = headers or {}

    def _build_headers(self) -> dict[str, str]:
        """Build headers for SSE connection."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "text/event-stream",
            "Cache-Control": "no-cache",
            **self.custom_headers,
        }

    async def stream(self, path: str) -> AsyncIterator[dict[str, Any]]:
        """
        Stream events from an SSE endpoint.

        Yields:
            Parsed JSON events from the stream.

        Example:
            async for event in client.stream("/api/v1/executions/123/events"):
                print(event["type"])
        """
        url = f"{self.base_url}{path}"
        headers = self._build_headers()

        try:
            async with httpx.AsyncClient() as client:
                async with aconnect_sse(client, "GET", url, headers=headers) as event_source:
                    async for sse in event_source.aiter_sse():
                        if sse.data:
                            try:
                                yield json.loads(sse.data)
                            except json.JSONDecodeError:
                                # Skip malformed JSON
                                pass

        except httpx.ConnectError as e:
            raise ConnectionError(f"Failed to connect to SSE stream: {e}") from e
        except httpx.TimeoutException as e:
            raise StreamError(f"SSE stream timed out: {e}") from e
        except Exception as e:
            raise StreamError(f"SSE stream error: {e}") from e
