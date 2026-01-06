"""
Knowledge Bases resource.
"""
from __future__ import annotations

from typing import Any

from .._http.async_client import AsyncHttpClient
from .._http.sync_client import SyncHttpClient


class SyncKnowledgeBases:
    """Synchronous knowledge bases resource."""

    def __init__(self, http: SyncHttpClient) -> None:
        self._http = http

    def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all knowledge bases.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with knowledge bases.

        Example:
            response = client.knowledge_bases.list()
            for kb in response["data"]:
                print(f"- {kb['name']}")
                print(f"  Documents: {kb['document_count']}")
                print(f"  Chunks: {kb['chunk_count']}")
        """
        return self._http.get(
            "/api/v1/knowledge-bases",
            params={"page": page, "per_page": per_page},
        )

    def get(self, knowledge_base_id: str) -> dict[str, Any]:
        """
        Get a knowledge base by ID.

        Args:
            knowledge_base_id: The knowledge base ID.

        Returns:
            Response containing the knowledge base.

        Example:
            response = client.knowledge_bases.get("kb_123")
            kb = response["data"]
            print(f"Knowledge Base: {kb['name']}")
            print(f"Embedding Model: {kb['embedding_model']}")
        """
        return self._http.get(f"/api/v1/knowledge-bases/{knowledge_base_id}")

    def query(
        self,
        knowledge_base_id: str,
        query: str,
        *,
        top_k: int | None = None,
    ) -> dict[str, Any]:
        """
        Query a knowledge base with semantic search.

        Args:
            knowledge_base_id: The knowledge base ID.
            query: The search query.
            top_k: Number of results to return (default: 10, max: 20).

        Returns:
            Response containing search results.

        Example:
            response = client.knowledge_bases.query(
                "kb_123",
                "How do I reset my password?",
                top_k=5
            )
            for result in response["data"]["results"]:
                print(f"[Score: {result['similarity']:.3f}]")
                print(result["content"])
                print()
        """
        return self._http.post(
            f"/api/v1/knowledge-bases/{knowledge_base_id}/query",
            json={"query": query, "top_k": top_k},
        )


class AsyncKnowledgeBases:
    """Asynchronous knowledge bases resource."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(
        self,
        *,
        page: int | None = None,
        per_page: int | None = None,
    ) -> dict[str, Any]:
        """
        List all knowledge bases.

        Args:
            page: Page number (1-indexed).
            per_page: Number of items per page.

        Returns:
            Paginated response with knowledge bases.

        Example:
            response = await client.knowledge_bases.list()
            for kb in response["data"]:
                print(f"- {kb['name']}")
                print(f"  Documents: {kb['document_count']}")
                print(f"  Chunks: {kb['chunk_count']}")
        """
        return await self._http.get(
            "/api/v1/knowledge-bases",
            params={"page": page, "per_page": per_page},
        )

    async def get(self, knowledge_base_id: str) -> dict[str, Any]:
        """
        Get a knowledge base by ID.

        Args:
            knowledge_base_id: The knowledge base ID.

        Returns:
            Response containing the knowledge base.

        Example:
            response = await client.knowledge_bases.get("kb_123")
            kb = response["data"]
            print(f"Knowledge Base: {kb['name']}")
            print(f"Embedding Model: {kb['embedding_model']}")
        """
        return await self._http.get(f"/api/v1/knowledge-bases/{knowledge_base_id}")

    async def query(
        self,
        knowledge_base_id: str,
        query: str,
        *,
        top_k: int | None = None,
    ) -> dict[str, Any]:
        """
        Query a knowledge base with semantic search.

        Args:
            knowledge_base_id: The knowledge base ID.
            query: The search query.
            top_k: Number of results to return (default: 10, max: 20).

        Returns:
            Response containing search results.

        Example:
            response = await client.knowledge_bases.query(
                "kb_123",
                "How do I reset my password?",
                top_k=5
            )
            for result in response["data"]["results"]:
                print(f"[Score: {result['similarity']:.3f}]")
                print(result["content"])
                print()
        """
        return await self._http.post(
            f"/api/v1/knowledge-bases/{knowledge_base_id}/query",
            json={"query": query, "top_k": top_k},
        )
