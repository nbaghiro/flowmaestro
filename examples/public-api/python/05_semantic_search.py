"""
Example 05: Semantic Search (RAG)

This example demonstrates using knowledge bases for semantic search:
1. List available knowledge bases
2. Perform semantic queries
3. Display ranked results with similarity scores

Run: python 05_semantic_search.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")
KNOWLEDGE_BASE_ID = os.getenv("KNOWLEDGE_BASE_ID")


def create_score_bar(score: float, width: int = 20) -> str:
    """Create a visual score bar."""
    filled = int(score * width)
    empty = width - filled
    return f"[{'#' * filled}{'-' * empty}]"


def display_result(rank: int, result: dict) -> None:
    """Display a single search result."""
    score_percent = result["score"] * 100
    score_bar = create_score_bar(result["score"])

    print(f"{rank}. [{score_percent:.1f}%] {score_bar}")
    print(f"   Source: {result.get('document_name', result['document_id'])}")

    # Truncate content for display
    content = result["content"].replace("\n", " ").replace("\r", "").strip()
    if len(content) > 200:
        content = content[:200] + "..."
    print(f'   Content: "{content}"')

    # Show metadata if present
    metadata = result.get("metadata", {})
    if metadata:
        meta_str = ", ".join(f"{k}={v}" for k, v in metadata.items())
        print(f"   Metadata: {meta_str}")

    print()


def run_search_loop(client, kb_id: str) -> None:
    """Run the interactive search loop."""
    import time

    while True:
        try:
            query = input("Search: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nGoodbye!")
            break

        if query.lower() == "exit":
            print("Goodbye!")
            break

        if not query:
            continue

        try:
            print("\nSearching...\n")
            start_time = time.time()

            response = client.knowledge_bases.query(
                kb_id,
                query=query,
                top_k=5
            )
            results = response["data"]["results"]

            elapsed = (time.time() - start_time) * 1000
            print(f"Found {len(results)} results in {elapsed:.0f}ms:\n")

            if not results:
                print("No results found. Try a different query.\n")
            else:
                for i, result in enumerate(results):
                    display_result(i + 1, result)

            print("-" * 50 + "\n")

        except Exception as e:
            print(f"\nError: {e}\n")


def main():
    # Validate configuration
    if not API_KEY or API_KEY == "fm_live_your_api_key_here":
        print("Error: Please set FLOWMAESTRO_API_KEY in your .env file")
        sys.exit(1)

    from flowmaestro import FlowMaestroClient

    client = FlowMaestroClient(
        api_key=API_KEY,
        base_url=BASE_URL if BASE_URL else None
    )

    print("FlowMaestro Semantic Search Example\n")
    print("=" * 50)

    try:
        # Step 1: List available knowledge bases
        print("\n1. Available knowledge bases:")
        response = client.knowledge_bases.list()
        knowledge_bases = response["data"]

        if not knowledge_bases:
            print("   No knowledge bases found. Create one in the FlowMaestro dashboard.")
            sys.exit(0)

        for kb in knowledge_bases:
            is_selected = " <-- selected" if kb["id"] == KNOWLEDGE_BASE_ID else ""
            print(f"   - {kb['name']} ({kb['id']}){is_selected}")
            print(f"     Documents: {kb['document_count']}, Chunks: {kb['chunk_count']}")

        # Step 2: Get selected knowledge base details
        kb_id = KNOWLEDGE_BASE_ID
        if not kb_id or kb_id == "kb_your_knowledge_base_id":
            kb_id = knowledge_bases[0]["id"]
            print(f"\n   Using first knowledge base: {kb_id}")

        print("\n2. Knowledge base details:")
        response = client.knowledge_bases.get(kb_id)
        kb = response["data"]
        print(f"   Name: {kb['name']}")
        print(f"   Description: {kb.get('description', 'N/A')}")
        print(f"   Embedding model: {kb['embedding_model']}")
        print(f"   Chunk size: {kb['chunk_size']} tokens")
        print(f"   Total documents: {kb['document_count']}")
        print(f"   Total chunks: {kb['chunk_count']}")

        # Step 3: Interactive search
        print("\n3. Semantic Search Interface")
        print("   Enter your queries below. Type 'exit' to quit.\n")
        print("-" * 50 + "\n")

        run_search_loop(client, kb_id)

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
