"""
FlowMaestro Python SDK.

Official Python SDK for FlowMaestro.

Example (sync):
    from flowmaestro import FlowMaestroClient

    with FlowMaestroClient(api_key="fm_live_...") as client:
        # Execute a workflow
        response = client.workflows.execute("wf_123", inputs={"name": "John"})
        result = client.executions.wait_for_completion(response["data"]["execution_id"])
        print(f"Result: {result['outputs']}")

Example (async):
    import asyncio
    from flowmaestro import AsyncFlowMaestroClient

    async def main():
        async with AsyncFlowMaestroClient(api_key="fm_live_...") as client:
            response = await client.workflows.execute("wf_123", inputs={"name": "John"})
            result = await client.executions.wait_for_completion(response["data"]["execution_id"])
            print(f"Result: {result['outputs']}")

    asyncio.run(main())
"""

__version__ = "0.1.0"

from .client import AsyncFlowMaestroClient, FlowMaestroClient
from .errors import (
    AuthenticationError,
    AuthorizationError,
    ConnectionError,
    FlowMaestroError,
    NotFoundError,
    RateLimitError,
    ServerError,
    StreamError,
    TimeoutError,
    ValidationError,
)

__all__ = [
    # Version
    "__version__",
    # Clients
    "FlowMaestroClient",
    "AsyncFlowMaestroClient",
    # Errors
    "FlowMaestroError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ValidationError",
    "RateLimitError",
    "ServerError",
    "TimeoutError",
    "ConnectionError",
    "StreamError",
]
