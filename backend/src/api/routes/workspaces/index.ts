import { FastifyInstance } from "fastify";
import { createWorkspaceRoute } from "./create";
import { getCreditsBalanceRoute } from "./credits/balance";
import { estimateCreditsRoute } from "./credits/estimate";
import { getCreditsTransactionsRoute } from "./credits/transactions";
import { deleteWorkspaceRoute } from "./delete";
import { getWorkspaceRoute } from "./get";
import { acceptInvitationRoute } from "./invitations/accept";
import { declineInvitationRoute } from "./invitations/decline";
import { getInvitationRoute } from "./invitations/get";
import { listInvitationsRoute } from "./invitations/list";
import { revokeInvitationRoute } from "./invitations/revoke";
import { listWorkspacesRoute } from "./list";
import { inviteMemberRoute } from "./members/invite";
import { listMembersRoute } from "./members/list";
import { removeMemberRoute } from "./members/remove";
import { updateMemberRoleRoute } from "./members/update-role";
import { updateWorkspaceRoute } from "./update";
import { upgradeWorkspaceRoute } from "./upgrade";

export async function workspaceRoutes(fastify: FastifyInstance) {
    fastify.register(
        async (instance) => {
            // Workspace CRUD
            instance.register(createWorkspaceRoute);
            instance.register(listWorkspacesRoute);
            instance.register(getWorkspaceRoute);
            instance.register(updateWorkspaceRoute);
            instance.register(deleteWorkspaceRoute);
            instance.register(upgradeWorkspaceRoute);

            // Members
            instance.register(listMembersRoute);
            instance.register(inviteMemberRoute);
            instance.register(removeMemberRoute);
            instance.register(updateMemberRoleRoute);

            // Invitations
            instance.register(listInvitationsRoute);
            instance.register(revokeInvitationRoute);
            instance.register(getInvitationRoute);
            instance.register(acceptInvitationRoute);
            instance.register(declineInvitationRoute);

            // Credits
            instance.register(getCreditsBalanceRoute);
            instance.register(getCreditsTransactionsRoute);
            instance.register(estimateCreditsRoute);
        },
        { prefix: "/workspaces" }
    );
}
