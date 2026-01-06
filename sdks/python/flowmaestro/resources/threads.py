"""
Threads resource.
"""
from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sse_client import AsyncSSEClient, SyncSSEClient
from .._http.sync_client import SyncHttpClient
from ..types import ThreadEvent


class SyncThreads:
    """Synchronous threads resource."""

    def __init__(self, http: SyncHttpClient, sse: SyncSSEClient) -> None:
        self._http = http
        self._sse = sse

    def get(self, thread_id: str) -> dict[str, Any]:
        """
        Get a thread by ID.

        Args:
            thread_id: The thread ID.

        Returns:
            Response containing the thread.

        Example:
            response = client.threads.get("thread_123")
            thread = response["data"]
            print(f"Thread status: {thread['status']}")
        """
        return self._http.get(f"/api/v1/threads/{thread_id}")

    def delete(self, thread_id: str) -> dict[str, Any]:
        """
        Delete a thread.

        Args:
            thread_id: The thread ID.

        Returns:
            Empty response on success.

        Example:
            client.threads.delete("thread_123")
            print("Thread deleted")
        """
        return self._http.delete(f"/api/v1/threads/{thread_id}")

    def list_messages(
        self,
        thread_id: str,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List messages in a thread.

        Args:
            thread_id: The thread ID.
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with messages.

        Example:
            response = client.threads.list_messages("thread_123")
            for msg in response["data"]:
                print(f"[{msg['role']}]: {msg['content']}")
        """
        return self._http.get(
            f"/api/v1/threads/{thread_id}/messages",
            params={"page": page, "per_page": per_page},
        )

    def send_message(
        self,
        thread_id: str,
        content: str,
        *,
        stream: bool = False,
    ) -> dict[str, Any]:
        """
        Send a message to a thread.

        Args:
            thread_id: The thread ID.
            content: The message content.
            stream: Whether to enable streaming response.

        Returns:
            Response containing message details.

        Example:
            response = client.threads.send_message(
                "thread_123",
                "What is the weather like today?"
            )
            print(f"Message sent: {response['data']['message_id']}")
        """
        return self._http.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"content": content, "stream": stream},
        )

    def send_message_stream(
        self,
        thread_id: str,
        content: str,
    ) -> Iterator[ThreadEvent]:
        """
        Send a message and stream the response.

        Args:
            thread_id: The thread ID.
            content: The message content.

        Yields:
            Thread events including tokens.

        Example:
            for event in client.threads.send_message_stream("thread_123", "Tell me a story"):
                if event["type"] == "message:token":
                    print(event.get("token", ""), end="", flush=True)
                elif event["type"] == "message:completed":
                    print("\\n\\nDone!")
                    break
        """
        # Send message with streaming enabled
        self._http.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"content": content, "stream": True},
        )

        # Stream events
        yield from self._sse.stream(f"/api/v1/threads/{thread_id}/events")

    def stream(self, thread_id: str) -> Iterator[ThreadEvent]:
        """
        Stream thread events via Server-Sent Events.

        Args:
            thread_id: The thread ID.

        Yields:
            Thread events.

        Example:
            for event in client.threads.stream("thread_123"):
                print(f"Event: {event['type']}")
        """
        yield from self._sse.stream(f"/api/v1/threads/{thread_id}/events")


class AsyncThreads:
    """Asynchronous threads resource."""

    def __init__(self, http: AsyncHttpClient, sse: AsyncSSEClient) -> None:
        self._http = http
        self._sse = sse

    async def get(self, thread_id: str) -> dict[str, Any]:
        """
        Get a thread by ID.

        Args:
            thread_id: The thread ID.

        Returns:
            Response containing the thread.

        Example:
            response = await client.threads.get("thread_123")
            thread = response["data"]
            print(f"Thread status: {thread['status']}")
        """
        return await self._http.get(f"/api/v1/threads/{thread_id}")

    async def delete(self, thread_id: str) -> dict[str, Any]:
        """
        Delete a thread.

        Args:
            thread_id: The thread ID.

        Returns:
            Empty response on success.

        Example:
            await client.threads.delete("thread_123")
            print("Thread deleted")
        """
        return await self._http.delete(f"/api/v1/threads/{thread_id}")

    async def list_messages(
        self,
        thread_id: str,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List messages in a thread.

        Args:
            thread_id: The thread ID.
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with messages.

        Example:
            response = await client.threads.list_messages("thread_123")
            for msg in response["data"]:
                print(f"[{msg['role']}]: {msg['content']}")
        """
        return await self._http.get(
            f"/api/v1/threads/{thread_id}/messages",
            params={"page": page, "per_page": per_page},
        )

    async def send_message(
        self,
        thread_id: str,
        content: str,
        *,
        stream: bool = False,
    ) -> dict[str, Any]:
        """
        Send a message to a thread.

        Args:
            thread_id: The thread ID.
            content: The message content.
            stream: Whether to enable streaming response.

        Returns:
            Response containing message details.

        Example:
            response = await client.threads.send_message(
                "thread_123",
                "What is the weather like today?"
            )
            print(f"Message sent: {response['data']['message_id']}")
        """
        return await self._http.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"content": content, "stream": stream},
        )

    async def send_message_stream(
        self,
        thread_id: str,
        content: str,
    ) -> AsyncIterator[ThreadEvent]:
        """
        Send a message and stream the response.

        Args:
            thread_id: The thread ID.
            content: The message content.

        Yields:
            Thread events including tokens.

        Example:
            async for event in client.threads.send_message_stream("thread_123", "Tell me a story"):
                if event["type"] == "message:token":
                    print(event.get("token", ""), end="", flush=True)
                elif event["type"] == "message:completed":
                    print("\\n\\nDone!")
                    break
        """
        # Send message with streaming enabled
        await self._http.post(
            f"/api/v1/threads/{thread_id}/messages",
            json={"content": content, "stream": True},
        )

        # Stream events
        async for event in self._sse.stream(f"/api/v1/threads/{thread_id}/events"):
            yield event

    async def stream(self, thread_id: str) -> AsyncIterator[ThreadEvent]:
        """
        Stream thread events via Server-Sent Events.

        Args:
            thread_id: The thread ID.

        Yields:
            Thread events.

        Example:
            async for event in client.threads.stream("thread_123"):
                print(f"Event: {event['type']}")
        """
        async for event in self._sse.stream(f"/api/v1/threads/{thread_id}/events"):
            yield event
