"""
Example 04: AI Agent Chatbot

This example demonstrates building a conversational chatbot:
1. Create a conversation thread with an AI agent
2. Send messages and receive responses
3. Maintain conversation history

Run: python 04_agent_chatbot.py
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
API_KEY = os.getenv("FLOWMAESTRO_API_KEY")
BASE_URL = os.getenv("FLOWMAESTRO_BASE_URL")
AGENT_ID = os.getenv("AGENT_ID")


def show_history(client, thread_id: str) -> None:
    """Display conversation history."""
    try:
        response = client.threads.list_messages(thread_id)
        messages = response["data"]["messages"]

        print("\n--- Message History ---")
        if not messages:
            print("(no messages yet)")
        else:
            for msg in messages:
                role = "You" if msg["role"] == "user" else "Agent"
                time_str = datetime.fromisoformat(
                    msg["created_at"].replace("Z", "+00:00")
                ).strftime("%H:%M:%S")
                content = msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
                print(f"[{time_str}] {role}: {content}")
        print("-----------------------\n")
    except Exception:
        print("\n[Could not fetch history]\n")


def run_chat_loop(client, thread_id: str, agent_name: str) -> None:
    """Run the interactive chat loop."""
    while True:
        try:
            user_input = input("You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n")
            break

        # Handle special commands
        if user_input.lower() == "exit":
            break

        if user_input.lower() == "history":
            show_history(client, thread_id)
            continue

        if user_input.lower() == "clear":
            print("\n[Starting new conversation would require creating a new thread]")
            print("[In production, you would create a new thread here]\n")
            continue

        if not user_input:
            continue

        try:
            # Send message and get response
            print(f"{agent_name}: ", end="", flush=True)

            response = client.threads.send_message(
                thread_id,
                content=user_input
            )

            # The actual response content would come from fetching messages
            if response["data"]["status"] == "completed":
                # Fetch the latest messages to get the response
                messages_response = client.threads.list_messages(thread_id)
                messages = messages_response["data"]["messages"]

                if messages and messages[-1]["role"] == "assistant":
                    print(messages[-1]["content"])
                else:
                    print("[Response received]")
            else:
                print(f"[Message status: {response['data']['status']}]")

            print()

        except Exception as e:
            error_msg = str(e)
            if "not yet implemented" in error_msg.lower():
                print("[Agent messaging not yet available in public API]")
                print("[This example demonstrates the intended API pattern]\n")
            else:
                print(f"[Error: {error_msg}]\n")


def main():
    # Validate configuration
    if not API_KEY or API_KEY == "fm_live_your_api_key_here":
        print("Error: Please set FLOWMAESTRO_API_KEY in your .env file")
        sys.exit(1)
    if not AGENT_ID or AGENT_ID == "agent_your_agent_id":
        print("Error: Please set AGENT_ID in your .env file")
        sys.exit(1)

    from flowmaestro import FlowMaestroClient

    client = FlowMaestroClient(
        api_key=API_KEY,
        base_url=BASE_URL if BASE_URL else None
    )

    print("FlowMaestro AI Chatbot Example\n")
    print("=" * 50)

    try:
        # Step 1: Get agent details
        print("\n1. Loading agent...")
        response = client.agents.get(AGENT_ID)
        agent = response["data"]
        agent_name = agent["name"]
        print(f"   Agent: {agent_name}")
        print(f"   Model: {agent['model']}")
        if agent.get("description"):
            print(f"   Description: {agent['description']}")

        # Step 2: Create a conversation thread
        print("\n2. Creating conversation thread...")
        response = client.agents.create_thread(
            AGENT_ID,
            metadata={
                "source": "cli-example",
                "created_at": datetime.now().isoformat()
            }
        )
        thread = response["data"]
        thread_id = thread["id"]
        print(f"   Thread ID: {thread_id}")

        # Step 3: Start interactive chat
        print("\n3. Starting chat session...")
        print("   Type 'exit' to end the conversation")
        print("   Type 'history' to view message history")
        print("   Type 'clear' to start a new thread\n")
        print("-" * 50 + "\n")

        run_chat_loop(client, thread_id, agent_name)

        # Step 4: Show conversation summary
        print("-" * 50)
        print("Conversation ended. Fetching history...\n")

        try:
            response = client.threads.list_messages(thread_id)
            messages = response["data"]["messages"]
            print(f"Total messages: {len(messages)}")
        except Exception:
            pass

        # Optionally delete the thread
        # client.threads.delete(thread_id)
        # print('Thread deleted.')

    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == "__main__":
    main()
