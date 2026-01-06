"""
Example 02: Streaming Workflow Execution

This example demonstrates real-time execution tracking using Server-Sent Events (SSE):
1. Execute a workflow
2. Stream execution events in real-time
3. Display progress as nodes complete

Run: python 02_streaming_execution.py
"""

import os
import sys
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")
WORKFLOW_ID = os.getenv("WORKFLOW_ID")

# Event icons for display
EVENT_ICONS = {
    "connected": "[*]",
    "execution:started": "[>]",
    "execution:progress": "[~]",
    "node:started": "[+]",
    "node:completed": "[v]",
    "node:failed": "[x]",
    "execution:completed": "[V]",
    "execution:failed": "[X]",
    "execution:cancelled": "[-]",
}

TERMINAL_EVENTS = {
    "execution:completed",
    "execution:failed",
    "execution:cancelled",
}


def progress_bar(current: int, total: int, width: int = 30) -> str:
    """Create a simple progress bar."""
    if total == 0:
        return f"[{' ' * width}] 0/0"
    filled = int((current / total) * width)
    empty = width - filled
    return f"[{'=' * filled}{' ' * empty}] {current}/{total}"


def format_timestamp() -> str:
    """Get current timestamp for display."""
    from datetime import datetime
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]


def display_event(event: dict) -> None:
    """Display an event in a formatted way."""
    event_type = event.get("type", "unknown")
    icon = EVENT_ICONS.get(event_type, "[?]")
    timestamp = format_timestamp()

    if event_type == "connected":
        print(f"   {timestamp} {icon} Connected to execution stream")
    elif event_type == "execution:started":
        print(f"   {timestamp} {icon} Execution started")
    elif event_type == "execution:progress":
        progress = event.get("progress", 0)
        print(f"   {timestamp} {icon} Progress: {progress}%")
    elif event_type == "node:started":
        node_id = event.get("node_id", "unknown")
        node_type = event.get("node_type", "unknown")
        print(f"   {timestamp} {icon} Node started: {node_id} ({node_type})")
    elif event_type == "node:completed":
        node_id = event.get("node_id", "unknown")
        print(f"   {timestamp} {icon} Node completed: {node_id}")
    elif event_type == "node:failed":
        node_id = event.get("node_id", "unknown")
        error = event.get("error", "unknown")
        print(f"   {timestamp} {icon} Node failed: {node_id} - {error}")
    elif event_type == "execution:completed":
        print(f"   {timestamp} {icon} Execution completed successfully")
    elif event_type == "execution:failed":
        error = event.get("error", "unknown")
        print(f"   {timestamp} {icon} Execution failed: {error}")
    elif event_type == "execution:cancelled":
        print(f"   {timestamp} {icon} Execution cancelled")
    else:
        print(f"   {timestamp} {icon} {event_type}")


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

    print("FlowMaestro Streaming Execution Example\n")
    print("=" * 50)

    try:
        # Step 1: Execute the workflow
        print("\n1. Starting workflow execution...")
        response = client.workflows.execute(
            WORKFLOW_ID,
            inputs={
                "name": "Jane Smith",
                "email": "jane@example.com"
            }
        )
        execution = response["data"]
        execution_id = execution["execution_id"]
        print(f"   Execution ID: {execution_id}")

        # Step 2: Stream execution events
        print("\n2. Streaming events (real-time):\n")

        node_count = 0
        completed_nodes = 0
        start_time = time.time()

        for event in client.executions.stream(execution_id):
            display_event(event)

            # Track node progress
            event_type = event.get("type", "")
            if event_type == "node:started":
                node_count += 1
            elif event_type == "node:completed":
                completed_nodes += 1
                if node_count > 0:
                    print(f"   Progress: {progress_bar(completed_nodes, node_count)}")

            # Check for terminal events
            if event_type in TERMINAL_EVENTS:
                break

        duration = time.time() - start_time
        print(f"\n   Total time: {duration:.2f}s")

        # Step 3: Fetch final execution state
        print("\n3. Final execution state:")
        response = client.executions.get(execution_id)
        final_state = response["data"]
        print(f"   Status: {final_state['status']}")

        if final_state.get("outputs"):
            import json
            print(f"   Outputs: {json.dumps(final_state['outputs'], indent=2)}")

        print("\n" + "=" * 50)
        print("Streaming example completed!")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
