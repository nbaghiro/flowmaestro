"""
Example 03: Batch Processing

This example demonstrates how to process multiple items through a workflow:
1. Read data from a list (or CSV file)
2. Execute workflows concurrently with rate limiting
3. Track progress and collect results

Run: python 03_batch_processing.py
"""

import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")
WORKFLOW_ID = os.getenv("WORKFLOW_ID")

# Batch processing configuration
CONCURRENCY = 5  # Max concurrent executions
RETRY_DELAY = 1.0  # Delay before retry on rate limit (seconds)
MAX_RETRIES = 3  # Max retries per item

# Sample data (replace with CSV parsing in production)
SAMPLE_DATA = [
    {"name": "Alice Johnson", "email": "alice@example.com", "department": "Engineering"},
    {"name": "Bob Smith", "email": "bob@example.com", "department": "Marketing"},
    {"name": "Carol Williams", "email": "carol@example.com", "department": "Sales"},
    {"name": "David Brown", "email": "david@example.com", "department": "Engineering"},
    {"name": "Eva Martinez", "email": "eva@example.com", "department": "Support"},
    {"name": "Frank Lee", "email": "frank@example.com", "department": "Marketing"},
    {"name": "Grace Chen", "email": "grace@example.com", "department": "Engineering"},
    {"name": "Henry Davis", "email": "henry@example.com", "department": "Sales"},
]


@dataclass
class BatchItem:
    """Represents an item in the batch processing queue."""
    index: int
    data: dict[str, Any]
    execution_id: str | None = None
    status: str = "pending"
    result: dict[str, Any] | None = None
    error: str | None = None
    retries: int = 0


def process_item(client, item: BatchItem, workflow_id: str) -> BatchItem:
    """Process a single item through the workflow."""
    from flowmaestro import RateLimitError

    try:
        # Execute workflow
        response = client.workflows.execute(workflow_id, inputs=item.data)
        item.execution_id = response["data"]["execution_id"]
        item.status = "running"

        # Wait for completion
        result = client.executions.wait_for_completion(
            item.execution_id,
            poll_interval=1.0,
            timeout=60.0  # 1 minute per item
        )

        if result["status"] == "completed":
            item.status = "completed"
            item.result = result.get("outputs")
        else:
            item.status = "failed"
            item.error = result.get("error", "Unknown error")

    except RateLimitError:
        # Handle rate limiting with retry
        if item.retries < MAX_RETRIES:
            item.retries += 1
            delay = RETRY_DELAY * (2 ** (item.retries - 1))  # Exponential backoff
            time.sleep(delay)
            return process_item(client, item, workflow_id)  # Retry
        item.status = "failed"
        item.error = f"Rate limited after {MAX_RETRIES} retries"

    except Exception as e:
        item.status = "failed"
        item.error = str(e)

    return item


def update_progress(items: list[BatchItem], start_time: float) -> None:
    """Display progress bar."""
    completed = sum(1 for i in items if i.status == "completed")
    failed = sum(1 for i in items if i.status == "failed")
    running = sum(1 for i in items if i.status == "running")
    pending = sum(1 for i in items if i.status == "pending")
    elapsed = time.time() - start_time

    sys.stdout.write(
        f"\rProgress: {completed + failed}/{len(items)} | "
        f"Running: {running} | Pending: {pending} | "
        f"Elapsed: {elapsed:.1f}s    "
    )
    sys.stdout.flush()


def main():
    # Validate configuration
    if not API_KEY or API_KEY == "fm_live_your_api_key_here":
        print("Error: Please set FLOWMAESTRO_API_KEY in your .env file")
        sys.exit(1)
    if not WORKFLOW_ID or WORKFLOW_ID == "wf_your_workflow_id":
        print("Error: Please set WORKFLOW_ID in your .env file")
        sys.exit(1)

    from flowmaestro import FlowMaestroClient

    client = FlowMaestroClient(
        api_key=API_KEY,
        base_url=BASE_URL if BASE_URL else None
    )

    print("FlowMaestro Batch Processing Example\n")
    print("=" * 50)
    print(f"Processing {len(SAMPLE_DATA)} items with concurrency of {CONCURRENCY}\n")

    try:
        # Initialize batch items
        items = [
            BatchItem(index=i, data=data)
            for i, data in enumerate(SAMPLE_DATA)
        ]

        start_time = time.time()

        # Process items with thread pool
        with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
            futures = {
                executor.submit(process_item, client, item, WORKFLOW_ID): item
                for item in items
            }

            for future in as_completed(futures):
                item = futures[future]
                try:
                    result = future.result()
                    # Update the item in our list
                    items[result.index] = result
                except Exception as e:
                    item.status = "failed"
                    item.error = str(e)

                update_progress(items, start_time)

        print("\n")  # New line after progress

        # Summary
        print("=" * 50)
        print("BATCH PROCESSING SUMMARY\n")

        completed = [i for i in items if i.status == "completed"]
        failed = [i for i in items if i.status == "failed"]

        print(f"Total items:  {len(items)}")
        print(f"Completed:    {len(completed)}")
        print(f"Failed:       {len(failed)}")
        print(f"Success rate: {(len(completed) / len(items)) * 100:.1f}%")

        # Show failed items
        if failed:
            print("\nFailed items:")
            for item in failed:
                print(f"  - Item {item.index}: {item.error}")

        # Show sample results
        if completed:
            print("\nSample results (first 3):")
            for item in completed[:3]:
                print(f"  - Item {item.index}: {item.result}")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
