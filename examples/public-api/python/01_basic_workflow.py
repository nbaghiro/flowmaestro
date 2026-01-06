"""
Example 01: Basic Workflow Execution

This example demonstrates the most common use case:
1. Execute a workflow with inputs
2. Wait for completion using polling
3. Retrieve the results

Run: python 01_basic_workflow.py
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")
WORKFLOW_ID = os.getenv("WORKFLOW_ID")


def main():
    # Validate configuration
    if not API_KEY or API_KEY == "fm_live_your_api_key_here":
        print("Error: Please set FLOWMAESTRO_API_KEY in your .env file")
        sys.exit(1)
    if not WORKFLOW_ID or WORKFLOW_ID == "wf_your_workflow_id":
        print("Error: Please set WORKFLOW_ID in your .env file")
        sys.exit(1)

    # Import SDK (after validation to give better error messages)
    from flowmaestro import FlowMaestroClient

    # Initialize the client
    client = FlowMaestroClient(
        api_key=API_KEY,
        base_url=BASE_URL if BASE_URL else None
    )

    print("FlowMaestro Basic Workflow Execution Example\n")
    print("=" * 50)

    try:
        # Step 1: Get workflow details
        print("\n1. Fetching workflow details...")
        response = client.workflows.get(WORKFLOW_ID)
        workflow = response["data"]
        print(f"   Workflow: {workflow['name']}")
        print(f"   Description: {workflow.get('description', 'N/A')}")

        if workflow.get("inputs"):
            print("   Required inputs:")
            for key, input_def in workflow["inputs"].items():
                required = " (required)" if input_def.get("required") else ""
                print(f"     - {key}: {input_def['type']}{required}")

        # Step 2: Execute the workflow
        print("\n2. Executing workflow...")
        response = client.workflows.execute(
            WORKFLOW_ID,
            inputs={
                # Replace these with actual inputs for your workflow
                "name": "John Doe",
                "email": "john@example.com"
            }
        )
        execution = response["data"]
        print(f"   Execution ID: {execution['execution_id']}")
        print(f"   Status: {execution['status']}")

        # Step 3: Wait for completion
        print("\n3. Waiting for completion...")
        import time
        start_time = time.time()

        result = client.executions.wait_for_completion(
            execution["execution_id"],
            poll_interval=1.0,  # Poll every 1 second
            timeout=120.0  # Timeout after 2 minutes
        )

        duration = time.time() - start_time
        print(f"   Completed in {duration:.2f}s")

        # Step 4: Display results
        print("\n4. Results:")
        print(f"   Status: {result['status']}")

        if result["status"] == "completed":
            print("   Outputs:")
            outputs = result.get("outputs", {})
            if outputs:
                for key, value in outputs.items():
                    print(f"     {key}: {value}")
            else:
                print("     (no outputs)")
        elif result["status"] == "failed":
            print(f"   Error: {result.get('error', 'Unknown error')}")

        print("\n" + "=" * 50)
        print("Example completed successfully!")

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
