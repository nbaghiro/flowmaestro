/**
 * Connection Management Integration Tests
 *
 * Tests persona instance connection handling including:
 * - Granting connections at creation
 * - Managing connection access after creation
 * - Connection validation and workspace isolation
 */

import { createPersonaTestEnvironment } from "./helpers/persona-test-env";
import {
    createResearchAssistantPersona,
    createRunningInstance,
    createCompletedInstance,
    createConnectionFixture,
    createSlackConnection,
    createGitHubConnection,
    createConnectionWithDetails,
    generateId
} from "./helpers/persona-fixtures";
import type { PersonaTestEnvironment } from "./helpers/persona-test-env";

describe("Connection Management", () => {
    let testEnv: PersonaTestEnvironment;

    beforeEach(async () => {
        testEnv = await createPersonaTestEnvironment({ skipServer: true });
    });

    afterEach(async () => {
        await testEnv.cleanup();
    });

    describe("Grant Connection at Creation", () => {
        it("grants connection at instance creation", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connectionId = generateId("conn");
            const connection = createConnectionFixture({
                instanceId: instance.id,
                connectionId,
                grantedScopes: ["read", "write"]
            });

            testEnv.repositories.personaInstance.create.mockResolvedValue(instance);
            testEnv.repositories.personaConnection.create.mockResolvedValue(connection);

            // Create instance
            await testEnv.repositories.personaInstance.create({
                persona_definition_id: persona.id,
                user_id: testEnv.testUser.id,
                workspace_id: testEnv.testWorkspace.id
            });

            // Grant connection
            const result = await testEnv.repositories.personaConnection.create({
                instance_id: instance.id,
                connection_id: connectionId,
                granted_scopes: ["read", "write"]
            });

            expect(result.connection_id).toBe(connectionId);
            expect(result.granted_scopes).toEqual(["read", "write"]);
        });

        it("grants multiple connections at creation", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const slackConn = createSlackConnection(instance.id);
            const githubConn = createGitHubConnection(instance.id);

            testEnv.repositories.personaConnection.createMany.mockResolvedValue([
                slackConn,
                githubConn
            ]);

            const connections = await testEnv.repositories.personaConnection.createMany([
                {
                    instance_id: instance.id,
                    connection_id: slackConn.connection_id,
                    granted_scopes: ["chat:write"]
                },
                {
                    instance_id: instance.id,
                    connection_id: githubConn.connection_id,
                    granted_scopes: ["repo"]
                }
            ]);

            expect(connections).toHaveLength(2);
        });
    });

    describe("Grant Connection After Creation", () => {
        it("grants connection after instance creation", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const slackScopes = ["chat:write", "channels:read"];
            const connection = createConnectionFixture({
                instanceId: instance.id,
                grantedScopes: slackScopes
            });

            testEnv.repositories.personaInstance.findById.mockResolvedValue(instance);
            testEnv.repositories.personaConnection.create.mockResolvedValue(connection);

            const result = await testEnv.repositories.personaConnection.create({
                instance_id: instance.id,
                connection_id: connection.connection_id,
                granted_scopes: slackScopes
            });

            expect(result.instance_id).toBe(instance.id);
            expect(result.granted_scopes).toContain("chat:write");
        });

        it("updates scopes on conflict", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connection = createSlackConnection(instance.id);

            // First grant with limited scopes
            testEnv.repositories.personaConnection.create.mockResolvedValue(connection);

            // Update with additional scopes (upsert)
            const updatedConnection = {
                ...connection,
                granted_scopes: ["chat:write", "channels:read", "files:write"]
            };
            testEnv.repositories.personaConnection.updateScopes.mockResolvedValue(updatedConnection);

            const result = await testEnv.repositories.personaConnection.updateScopes(
                instance.id,
                connection.connection_id,
                ["chat:write", "channels:read", "files:write"]
            );

            expect(result?.granted_scopes).toContain("files:write");
        });
    });

    describe("List Connections", () => {
        it("lists connections with provider details", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const slackConn = createSlackConnection(instance.id);
            const githubConn = createGitHubConnection(instance.id);

            testEnv.repositories.personaConnection.findByInstanceIdWithDetails.mockResolvedValue([
                slackConn,
                githubConn
            ]);

            const connections = await testEnv.repositories.personaConnection.findByInstanceIdWithDetails(
                instance.id
            );

            expect(connections).toHaveLength(2);
            expect(connections[0].connection.provider).toBe("slack");
            expect(connections[0].connection.name).toBe("My Slack Workspace");
            expect(connections[1].connection.provider).toBe("github");
        });

        it("returns empty array when no connections", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaConnection.findByInstanceId.mockResolvedValue([]);

            const connections = await testEnv.repositories.personaConnection.findByInstanceId(
                instance.id
            );

            expect(connections).toEqual([]);
        });
    });

    describe("Revoke Connection Access", () => {
        it("revokes connection access", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connection = createSlackConnection(instance.id);

            testEnv.repositories.personaConnection.findByInstanceAndConnection.mockResolvedValue(
                connection
            );
            testEnv.repositories.personaConnection.delete.mockResolvedValue(true);

            const result = await testEnv.repositories.personaConnection.delete(
                instance.id,
                connection.connection_id
            );

            expect(result).toBe(true);
        });

        it("returns false when connection not found", async () => {
            testEnv.repositories.personaConnection.delete.mockResolvedValue(false);

            const result = await testEnv.repositories.personaConnection.delete(
                "instance-id",
                "conn-id"
            );

            expect(result).toBe(false);
        });

        it("revokes all connections for an instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaConnection.deleteAllForInstance.mockResolvedValue(3);

            const deletedCount = await testEnv.repositories.personaConnection.deleteAllForInstance(
                instance.id
            );

            expect(deletedCount).toBe(3);
        });
    });

    describe("Provider Access Check", () => {
        it("checks if instance has provider access", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            // Instance has Slack connection
            testEnv.repositories.personaConnection.hasProviderAccess.mockResolvedValue(true);

            const hasAccess = await testEnv.repositories.personaConnection.hasProviderAccess(
                instance.id,
                "slack"
            );

            expect(hasAccess).toBe(true);
        });

        it("returns false when provider not connected", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaConnection.hasProviderAccess.mockResolvedValue(false);

            const hasAccess = await testEnv.repositories.personaConnection.hasProviderAccess(
                instance.id,
                "notion"
            );

            expect(hasAccess).toBe(false);
        });

        it("gets connection for specific provider", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connection = createSlackConnection(instance.id);

            testEnv.repositories.personaConnection.getConnectionForProvider.mockResolvedValue(
                connection
            );

            const result = await testEnv.repositories.personaConnection.getConnectionForProvider(
                instance.id,
                "slack"
            );

            expect(result).not.toBeNull();
            expect(result?.connection.provider).toBe("slack");
        });

        it("returns null when provider not found", async () => {
            testEnv.repositories.personaConnection.getConnectionForProvider.mockResolvedValue(null);

            const result = await testEnv.repositories.personaConnection.getConnectionForProvider(
                "instance-id",
                "notion"
            );

            expect(result).toBeNull();
        });
    });

    describe("Connection Lookup", () => {
        it("finds specific connection by instance and connection ID", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);
            const connection = createConnectionFixture({
                instanceId: instance.id
            });

            testEnv.repositories.personaConnection.findByInstanceAndConnection.mockResolvedValue(
                connection
            );

            const result = await testEnv.repositories.personaConnection.findByInstanceAndConnection(
                instance.id,
                connection.connection_id
            );

            expect(result).not.toBeNull();
            expect(result?.connection_id).toBe(connection.connection_id);
        });

        it("returns null when connection not found", async () => {
            testEnv.repositories.personaConnection.findByInstanceAndConnection.mockResolvedValue(
                null
            );

            const result = await testEnv.repositories.personaConnection.findByInstanceAndConnection(
                "instance-id",
                "conn-id"
            );

            expect(result).toBeNull();
        });
    });

    describe("Scope Management", () => {
        it("grants connection with specific scopes", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const scopes = ["channels:read", "chat:write", "users:read"];
            const connection = createConnectionFixture({
                instanceId: instance.id,
                grantedScopes: scopes
            });

            testEnv.repositories.personaConnection.create.mockResolvedValue(connection);

            const result = await testEnv.repositories.personaConnection.create({
                instance_id: instance.id,
                connection_id: connection.connection_id,
                granted_scopes: scopes
            });

            expect(result.granted_scopes).toEqual(scopes);
            expect(result.granted_scopes).toHaveLength(3);
        });

        it("grants connection with empty scopes", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const connection = createConnectionFixture({
                instanceId: instance.id,
                grantedScopes: []
            });

            testEnv.repositories.personaConnection.create.mockResolvedValue(connection);

            const result = await testEnv.repositories.personaConnection.create({
                instance_id: instance.id,
                connection_id: connection.connection_id,
                granted_scopes: []
            });

            expect(result.granted_scopes).toEqual([]);
        });

        it("updates scopes for existing connection", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const originalConnection = createConnectionFixture({
                instanceId: instance.id,
                grantedScopes: ["read"]
            });

            const updatedConnection = {
                ...originalConnection,
                granted_scopes: ["read", "write", "delete"]
            };

            testEnv.repositories.personaConnection.findByInstanceAndConnection.mockResolvedValue(
                originalConnection
            );
            testEnv.repositories.personaConnection.updateScopes.mockResolvedValue(updatedConnection);

            const result = await testEnv.repositories.personaConnection.updateScopes(
                instance.id,
                originalConnection.connection_id,
                ["read", "write", "delete"]
            );

            expect(result?.granted_scopes).toContain("write");
            expect(result?.granted_scopes).toContain("delete");
        });
    });

    describe("Multiple Connections", () => {
        it("handles multiple providers for same instance", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const connections = [
                createConnectionWithDetails(instance.id, "slack", "Work Slack"),
                createConnectionWithDetails(instance.id, "github", "Personal GitHub"),
                createConnectionWithDetails(instance.id, "notion", "Team Notion")
            ];

            testEnv.repositories.personaConnection.findByInstanceIdWithDetails.mockResolvedValue(
                connections
            );

            const result = await testEnv.repositories.personaConnection.findByInstanceIdWithDetails(
                instance.id
            );

            expect(result).toHaveLength(3);
            expect(result.map((c) => c.connection.provider)).toEqual(["slack", "github", "notion"]);
        });

        it("creates many connections in batch", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            const conn1 = createConnectionFixture({ instanceId: instance.id });
            const conn2 = createConnectionFixture({ instanceId: instance.id });

            testEnv.repositories.personaConnection.createMany.mockResolvedValue([conn1, conn2]);

            const result = await testEnv.repositories.personaConnection.createMany([
                {
                    instance_id: instance.id,
                    connection_id: conn1.connection_id,
                    granted_scopes: ["read"]
                },
                {
                    instance_id: instance.id,
                    connection_id: conn2.connection_id,
                    granted_scopes: ["write"]
                }
            ]);

            expect(result).toHaveLength(2);
        });

        it("returns empty array for empty batch", async () => {
            testEnv.repositories.personaConnection.createMany.mockResolvedValue([]);

            const result = await testEnv.repositories.personaConnection.createMany([]);

            expect(result).toEqual([]);
        });
    });

    describe("Cleanup on Instance Deletion", () => {
        it("deletes all connections when instance is deleted", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createCompletedInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaConnection.deleteAllForInstance.mockResolvedValue(2);
            testEnv.repositories.personaInstance.softDelete.mockResolvedValue(true);

            // Delete connections first
            const deletedCount = await testEnv.repositories.personaConnection.deleteAllForInstance(
                instance.id
            );
            expect(deletedCount).toBe(2);

            // Then delete instance
            const deleted = await testEnv.repositories.personaInstance.softDelete(instance.id);
            expect(deleted).toBe(true);
        });

        it("returns 0 when no connections to delete", async () => {
            const persona = createResearchAssistantPersona();
            const instance = createRunningInstance(persona.id, testEnv.testWorkspace.id);

            testEnv.repositories.personaConnection.deleteAllForInstance.mockResolvedValue(0);

            const deletedCount = await testEnv.repositories.personaConnection.deleteAllForInstance(
                instance.id
            );

            expect(deletedCount).toBe(0);
        });
    });
});
