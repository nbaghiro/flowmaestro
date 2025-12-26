---
sidebar_position: 2
title: OAuth & Authentication
---

# OAuth & Authentication

FlowMaestro securely manages authentication for all your integrations.

## OAuth Flow

1. Click "Connect" on the integration
2. Log in and grant permissions in the service's interface
3. FlowMaestro securely stores your access and refresh tokens
4. Tokens are automatically refreshed before expiry

## Credential Security

- **Encryption at rest** — All tokens encrypted with AES-256
- **Secure storage** — Stored in Google Cloud Secret Manager
- **Access control** — Only your workflows can use your connections
- **Audit logging** — All credential access is logged

## Reconnecting

OAuth tokens may expire or be revoked. To reconnect:

1. Go to **Connections**
2. Find the connection with the warning icon
3. Click **Reconnect**
4. Re-authorize with the service

## Multiple Accounts

Connect multiple accounts from the same service:

- Add connections with different names
- Select which connection to use in each node
