"""
Example 06: Webhook Receiver

This example demonstrates how to receive and verify webhook notifications:
1. Set up a Flask server to receive webhooks
2. Verify webhook signatures for security
3. Handle different event types

Run: python 06_webhook_receiver.py

Note: For local testing, use a tunnel service like ngrok:
  ngrok http 3456
Then create a webhook in FlowMaestro pointing to your ngrok URL.
"""

import hashlib
import hmac
import json
import os
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify

# Load environment variables
load_dotenv()

# Configuration
PORT = int(os.getenv("WEBHOOK_PORT", "3456"))
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET", "your_webhook_secret_here")

app = Flask(__name__)


def verify_signature(payload: bytes, signature: str) -> bool:
    """Verify the webhook signature."""
    if not signature or WEBHOOK_SECRET == "your_webhook_secret_here":
        print("Note: Signature verification skipped (no secret configured)")
        return True

    expected = hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return signature == f"v1={expected}"


def handle_execution_started(payload: dict) -> None:
    """Handle execution.started event."""
    data = payload["data"]
    print("\n[EXECUTION STARTED]")
    print(f"  Execution ID: {data.get('execution_id')}")
    print(f"  Workflow ID: {data.get('workflow_id')}")
    print(f"  Started at: {payload.get('created_at')}")


def handle_execution_completed(payload: dict) -> None:
    """Handle execution.completed event."""
    data = payload["data"]
    print("\n[EXECUTION COMPLETED]")
    print(f"  Execution ID: {data.get('execution_id')}")
    print(f"  Workflow ID: {data.get('workflow_id')}")
    print(f"  Status: {data.get('status')}")
    if data.get("outputs"):
        print(f"  Outputs: {json.dumps(data['outputs'], indent=2)}")

    # Example: Trigger downstream actions
    # notify_user(data['execution_id'], data.get('outputs'))
    # update_database(data)


def handle_execution_failed(payload: dict) -> None:
    """Handle execution.failed event."""
    data = payload["data"]
    print("\n[EXECUTION FAILED]")
    print(f"  Execution ID: {data.get('execution_id')}")
    print(f"  Workflow ID: {data.get('workflow_id')}")
    print(f"  Error: {data.get('error')}")

    # Example: Alert on failures
    # send_alert(f"Execution {data['execution_id']} failed: {data.get('error')}")


def handle_message_created(payload: dict) -> None:
    """Handle thread.message.created event."""
    data = payload["data"]
    print("\n[MESSAGE CREATED]")
    print(f"  Thread ID: {data.get('thread_id')}")
    print(f"  Message ID: {data.get('message_id')}")
    print(f"  Role: {data.get('role')}")


def handle_message_completed(payload: dict) -> None:
    """Handle thread.message.completed event."""
    data = payload["data"]
    print("\n[MESSAGE COMPLETED]")
    print(f"  Thread ID: {data.get('thread_id')}")
    print(f"  Message ID: {data.get('message_id')}")
    content = str(data.get("content", ""))[:100]
    print(f"  Content preview: {content}...")


def handle_test_event(payload: dict) -> None:
    """Handle test event."""
    data = payload["data"]
    print("\n[TEST EVENT]")
    print(f"  Message: {data.get('message')}")
    print(f"  Webhook ID: {data.get('webhook_id')}")
    print("\n  Test event received successfully!")


# Event handlers mapping
EVENT_HANDLERS = {
    "execution.started": handle_execution_started,
    "execution.completed": handle_execution_completed,
    "execution.failed": handle_execution_failed,
    "thread.message.created": handle_message_created,
    "thread.message.completed": handle_message_completed,
    "test": handle_test_event,
}


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/webhook", methods=["POST"])
def webhook():
    """Webhook receiver endpoint."""
    signature = request.headers.get("X-FlowMaestro-Signature", "")
    delivery_id = request.headers.get("X-FlowMaestro-Delivery-ID", "")

    print(f"\n{'=' * 50}")
    print(f"Received webhook: {delivery_id}")
    print(f"Timestamp: {datetime.now().isoformat()}")

    # Verify signature
    raw_body = request.get_data()
    if verify_signature(raw_body, signature):
        print("Signature: Valid")
    else:
        print("WARNING: Invalid signature!")
        # In production, reject invalid signatures
        # return jsonify({"error": "Invalid signature"}), 401

    # Parse payload
    try:
        payload = request.get_json()
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return jsonify({"error": "Invalid JSON"}), 400

    event_type = payload.get("event", "unknown")
    print(f"Event: {event_type}")

    # Route to appropriate handler
    handler = EVENT_HANDLERS.get(event_type)
    if handler:
        try:
            handler(payload)
        except Exception as e:
            print(f"Handler error: {e}")
    else:
        print(f"Unknown event type: {event_type}")
        print(f"Payload: {json.dumps(payload, indent=2)}")

    # Always respond quickly (within 10 seconds)
    return jsonify({"received": True}), 200


def main():
    print("FlowMaestro Webhook Receiver Example\n")
    print("=" * 50)
    print(f"\nWebhook server listening on port {PORT}")
    print("\nEndpoints:")
    print(f"  POST http://localhost:{PORT}/webhook - Receive webhooks")
    print(f"  GET  http://localhost:{PORT}/health  - Health check")
    print("\nFor local testing, use ngrok:")
    print(f"  ngrok http {PORT}")
    print("\nThen create a webhook in FlowMaestro pointing to:")
    print("  https://your-ngrok-url.ngrok.io/webhook")
    print("\nWaiting for webhooks...\n")

    app.run(host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()
