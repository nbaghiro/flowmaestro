#!/usr/bin/env python3
"""
Example 07: CLI Tool

This example demonstrates building a command-line workflow runner:
1. List available workflows
2. Select and configure a workflow
3. Execute with custom inputs
4. Display results

Run: python 07_cli_tool.py [command] [options]

Commands:
  list                    List all workflows
  get <workflow_id>       Get workflow details
  run <workflow_id>       Execute a workflow
  status <execution_id>   Get execution status
  cancel <execution_id>   Cancel an execution
"""

import argparse
import json
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")

# ANSI color codes
COLORS = {
    "reset": "\033[0m",
    "bold": "\033[1m",
    "dim": "\033[2m",
    "red": "\033[31m",
    "green": "\033[32m",
    "yellow": "\033[33m",
    "blue": "\033[34m",
    "cyan": "\033[36m",
}


def color(text: str, c: str) -> str:
    """Apply color to text."""
    return f"{COLORS.get(c, '')}{text}{COLORS['reset']}"


def format_date(iso_string: str) -> str:
    """Format ISO date string for display."""
    try:
        dt = datetime.fromisoformat(iso_string.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return iso_string


def format_status(status: str) -> str:
    """Format status with color."""
    status_colors = {
        "pending": "yellow",
        "running": "blue",
        "completed": "green",
        "failed": "red",
        "cancelled": "dim",
    }
    return color(status, status_colors.get(status, "reset"))


def cmd_list(client) -> None:
    """List all workflows."""
    print(color("Workflows:", "cyan"))
    print("-" * 60)

    response = client.workflows.list(per_page=50)
    workflows = response["data"]
    pagination = response["pagination"]

    if not workflows:
        print("No workflows found.")
        return

    for wf in workflows:
        wf_id_display = f"({wf['id']})"
        print(f"\n{color(wf['name'], 'bold')} {color(wf_id_display, 'dim')}")
        if wf.get("description"):
            print(f"  {wf['description']}")
        print(f"  Version: {wf['version']} | Updated: {format_date(wf['updated_at'])}")

    print(f"\n{'-' * 60}")
    print(f"Total: {pagination['total_count']} workflows")


def cmd_get(client, workflow_id: str) -> None:
    """Get workflow details."""
    response = client.workflows.get(workflow_id)
    wf = response["data"]

    print(color("Workflow Details:", "cyan"))
    print("-" * 60)
    print(f"Name:        {color(wf['name'], 'bold')}")
    print(f"ID:          {wf['id']}")
    print(f"Version:     {wf['version']}")
    print(f"Description: {wf.get('description', 'N/A')}")
    print(f"Created:     {format_date(wf['created_at'])}")
    print(f"Updated:     {format_date(wf['updated_at'])}")

    inputs = wf.get("inputs", {})
    if inputs:
        print(f"\n{color('Inputs:', 'cyan')}")
        for key, input_def in inputs.items():
            required = color("*", "red") if input_def.get("required") else ""
            print(f"  {key}{required}: {input_def['type']}")
            if input_def.get("description"):
                print(f"    {color(input_def['description'], 'dim')}")
        print(f"\n  {color('*', 'red')} = required")


def cmd_run(client, workflow_id: str) -> None:
    """Run a workflow interactively."""
    # Get workflow to understand inputs
    response = client.workflows.get(workflow_id)
    wf = response["data"]

    print(f"Running: {color(wf['name'], 'bold')}\n")

    # Collect inputs interactively
    inputs = {}
    wf_inputs = wf.get("inputs", {})

    if wf_inputs:
        print(color("Enter inputs (press Enter for default):", "cyan"))

        for key, input_def in wf_inputs.items():
            required = " (required)" if input_def.get("required") else ""
            prompt = f"  {key}{required}: "

            value = input(prompt).strip()

            if value:
                # Try to parse as JSON for complex types
                try:
                    inputs[key] = json.loads(value)
                except json.JSONDecodeError:
                    inputs[key] = value
            elif input_def.get("required"):
                print(color(f"Error: {key} is required", "red"))
                sys.exit(1)

    # Execute
    print(color("\nStarting execution...", "yellow"))
    response = client.workflows.execute(workflow_id, inputs=inputs)
    execution = response["data"]
    execution_id = execution["execution_id"]
    print(f"Execution ID: {execution_id}")

    # Stream progress
    print(color("\nProgress:", "cyan"))

    for event in client.executions.stream(execution_id):
        event_type = event.get("type", "")
        time_str = datetime.now().strftime("%H:%M:%S")

        if event_type == "execution:started":
            print(f"  [{time_str}] {color('Started', 'green')}")
        elif event_type == "node:started":
            print(f"  [{time_str}] Running: {event.get('node_id')}")
        elif event_type == "node:completed":
            print(f"  [{time_str}] {color('Done', 'green')}: {event.get('node_id')}")
        elif event_type == "node:failed":
            print(f"  [{time_str}] {color('Failed', 'red')}: {event.get('node_id')}")
        elif event_type == "execution:completed":
            print(f"  [{time_str}] {color('Completed!', 'green')}")
            break
        elif event_type == "execution:failed":
            print(f"  [{time_str}] {color('Failed!', 'red')}")
            break
        elif event_type == "execution:cancelled":
            print(f"  [{time_str}] {color('Cancelled', 'dim')}")
            break

    # Get final result
    response = client.executions.get(execution_id)
    result = response["data"]

    print(color("\nResult:", "cyan"))
    print(f"  Status: {format_status(result['status'])}")

    outputs = result.get("outputs", {})
    if outputs:
        print("  Outputs:")
        for key, value in outputs.items():
            display_value = json.dumps(value) if isinstance(value, (dict, list)) else value
            print(f"    {key}: {display_value}")

    if result.get("error"):
        print(f"  {color('Error:', 'red')} {result['error']}")


def cmd_status(client, execution_id: str) -> None:
    """Get execution status."""
    response = client.executions.get(execution_id)
    exec_data = response["data"]

    print(color("Execution Status:", "cyan"))
    print("-" * 60)
    print(f"ID:       {exec_data['id']}")
    print(f"Workflow: {exec_data['workflow_id']}")
    print(f"Status:   {format_status(exec_data['status'])}")
    print(f"Created:  {format_date(exec_data['created_at'])}")

    if exec_data.get("started_at"):
        print(f"Started:  {format_date(exec_data['started_at'])}")
    if exec_data.get("completed_at"):
        print(f"Completed: {format_date(exec_data['completed_at'])}")

    inputs = exec_data.get("inputs", {})
    if inputs:
        print(f"\n{color('Inputs:', 'dim')}")
        print(json.dumps(inputs, indent=2))

    outputs = exec_data.get("outputs", {})
    if outputs:
        print(f"\n{color('Outputs:', 'dim')}")
        print(json.dumps(outputs, indent=2))

    if exec_data.get("error"):
        print(f"\n{color('Error:', 'red')} {exec_data['error']}")


def cmd_cancel(client, execution_id: str) -> None:
    """Cancel an execution."""
    print(f"Cancelling execution {execution_id}...")
    response = client.executions.cancel(execution_id)
    exec_data = response["data"]
    print(f"Status: {format_status(exec_data['status'])}")


def main():
    parser = argparse.ArgumentParser(
        description="FlowMaestro CLI Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python 07_cli_tool.py list
  python 07_cli_tool.py get wf_abc123
  python 07_cli_tool.py run wf_abc123
  python 07_cli_tool.py status exec_xyz789
  python 07_cli_tool.py cancel exec_xyz789
"""
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # list command
    subparsers.add_parser("list", help="List all workflows")

    # get command
    get_parser = subparsers.add_parser("get", help="Get workflow details")
    get_parser.add_argument("workflow_id", help="Workflow ID")

    # run command
    run_parser = subparsers.add_parser("run", help="Execute a workflow")
    run_parser.add_argument("workflow_id", help="Workflow ID")

    # status command
    status_parser = subparsers.add_parser("status", help="Get execution status")
    status_parser.add_argument("execution_id", help="Execution ID")

    # cancel command
    cancel_parser = subparsers.add_parser("cancel", help="Cancel an execution")
    cancel_parser.add_argument("execution_id", help="Execution ID")

    args = parser.parse_args()

    # Validate configuration
    if not API_KEY or API_KEY == "fm_live_your_api_key_here":
        print(color("Error: Please set FLOWMAESTRO_API_KEY in your .env file", "red"))
        sys.exit(1)

    # Show help if no command
    if not args.command:
        parser.print_help()
        sys.exit(0)

    print(color("\nFlowMaestro CLI\n", "bold"))

    from flowmaestro import FlowMaestroClient, NotFoundError

    client = FlowMaestroClient(
        api_key=API_KEY,
        base_url=BASE_URL if BASE_URL else None
    )

    try:
        if args.command == "list":
            cmd_list(client)
        elif args.command == "get":
            cmd_get(client, args.workflow_id)
        elif args.command == "run":
            cmd_run(client, args.workflow_id)
        elif args.command == "status":
            cmd_status(client, args.execution_id)
        elif args.command == "cancel":
            cmd_cancel(client, args.execution_id)

    except NotFoundError as e:
        print(color(f"Not found: {e}", "red"))
        sys.exit(1)
    except Exception as e:
        print(color(f"Error: {e}", "red"))
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
