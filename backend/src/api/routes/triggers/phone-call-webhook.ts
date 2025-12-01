import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { nanoid } from "nanoid";
import type { JsonValue } from "@flowmaestro/shared";
import { globalEventEmitter } from "../../../services/events/EventEmitter";
import { PhoneCallTriggerConfig } from "../../../storage/models/Trigger";
import { CallExecutionRepository } from "../../../storage/repositories/CallExecutionRepository";
import { TriggerRepository } from "../../../storage/repositories/TriggerRepository";
import { WorkflowRepository } from "../../../storage/repositories/WorkflowRepository";

/**
 * Telnyx webhook payload for incoming calls
 */
interface TelnyxCallWebhook {
    data: {
        event_type: string;
        payload: {
            call_control_id: string;
            call_leg_id: string;
            call_session_id: string;
            from: string; // +15551234567
            to: string; // +15559876543
            direction: "incoming" | "outgoing";
            state: string; // "parked", "answered", "hangup", etc.
            caller_id_name?: string;
            caller_id_number?: string;
            // Additional fields
            start_time?: string;
            answer_time?: string;
            end_time?: string;
            hangup_cause?: string;
            hangup_source?: string;
        };
    };
}

/**
 * Phone call webhook receiver
 * PUBLIC endpoint - no auth required
 * Receives incoming call notifications from Telnyx
 */
export async function phoneCallWebhookRoute(fastify: FastifyInstance): Promise<void> {
    fastify.post("/phone-call", async (request: FastifyRequest, reply: FastifyReply) => {
        const startTime = Date.now();
        const body = request.body as TelnyxCallWebhook;

        fastify.log.info({
            msg: "Phone call webhook received",
            body
        });

        try {
            // Validate webhook payload
            if (!body.data || !body.data.payload) {
                return reply.status(400).send({
                    success: false,
                    error: "Invalid webhook payload"
                });
            }

            const payload = body.data.payload;
            const eventType = body.data.event_type;

            // Handle different event types
            if (eventType === "call.initiated" || eventType === "call.ringing") {
                return await handleIncomingCall(fastify, request, reply, body);
            } else if (eventType === "call.answered") {
                return await handleCallAnswered(fastify, body);
            } else if (eventType === "call.hangup") {
                return await handleCallHangup(fastify, body);
            } else {
                // For other events, just log and return success
                fastify.log.info({
                    msg: "Unhandled call event",
                    eventType,
                    callSid: payload.call_session_id
                });

                return reply.send({ success: true });
            }
        } catch (error: unknown) {
            const processingTime = Date.now() - startTime;
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            const errorStack = error instanceof Error ? error.stack : undefined;
            fastify.log.error({
                msg: "Phone call webhook processing error",
                error: errorMsg,
                stack: errorStack,
                processingTime
            });

            return reply.status(500).send({
                success: false,
                error: "Internal server error"
            });
        }
    });
}

/**
 * Handle incoming call (call.initiated or call.ringing)
 */
async function handleIncomingCall(
    fastify: FastifyInstance,
    _request: FastifyRequest,
    reply: FastifyReply,
    body: TelnyxCallWebhook
): Promise<void> {
    const payload = body.data.payload;
    const calledNumber = payload.to;
    const callerNumber = payload.from;
    const callSid = payload.call_session_id;

    fastify.log.info({
        msg: "Processing incoming call",
        callerNumber,
        calledNumber,
        callSid
    });

    // Find trigger by phone number
    const triggerRepo = new TriggerRepository();
    const triggers = await triggerRepo.findByType("phone_call", true);

    const trigger = triggers.find((t) => {
        const config = t.config as PhoneCallTriggerConfig;
        return config.phoneNumber === calledNumber;
    });

    if (!trigger) {
        fastify.log.warn({
            msg: "No trigger found for phone number",
            calledNumber
        });

        // Return error response to Telnyx (will play error message to caller)
        return reply.status(404).send({
            success: false,
            error: "No workflow configured for this phone number"
        });
    }

    // Get workflow
    const workflowRepo = new WorkflowRepository();
    const workflow = await workflowRepo.findById(trigger.workflow_id);

    if (!workflow) {
        fastify.log.error({
            msg: "Workflow not found for trigger",
            triggerId: trigger.id,
            workflowId: trigger.workflow_id
        });

        return reply.status(404).send({
            success: false,
            error: "Workflow not found"
        });
    }

    const config = trigger.config as PhoneCallTriggerConfig;

    // Check business hours if enabled
    if (config.businessHoursEnabled && config.businessHoursSchedule) {
        const now = new Date();
        const timezone = config.businessHoursTimezone || "America/New_York";
        const dayOfWeek = now
            .toLocaleDateString("en-US", { weekday: "long", timeZone: timezone })
            .toLowerCase() as keyof typeof config.businessHoursSchedule;
        const hoursToday = config.businessHoursSchedule[dayOfWeek];

        if (!hoursToday || !isWithinBusinessHours(now, hoursToday, timezone)) {
            fastify.log.info({
                msg: "Call received outside business hours",
                callerNumber,
                dayOfWeek,
                hoursToday
            });

            // If voicemail is enabled, could handle here
            // For now, just return error
            return reply.status(503).send({
                success: false,
                error: "Outside business hours"
            });
        }
    }

    // Create call execution record
    const callRepo = new CallExecutionRepository();
    const callExecution = await callRepo.create({
        trigger_id: trigger.id,
        user_id: workflow.user_id,
        call_sid: callSid,
        caller_number: callerNumber,
        called_number: calledNumber,
        direction: "inbound",
        call_status: "ringing",
        caller_name: payload.caller_id_name,
        recording_enabled: config.enableRecording || false
    });

    // Generate LiveKit room name
    const livekitRoomName = `call-${nanoid(12)}`;

    // Update call execution with room name
    await callRepo.update(callExecution.id, {
        livekit_room_name: livekitRoomName
    });

    // Log event
    await callRepo.createEvent({
        call_execution_id: callExecution.id,
        event_type: "call:incoming",
        event_data: {
            caller_number: callerNumber,
            called_number: calledNumber,
            caller_name: payload.caller_id_name || null
        } as Record<string, JsonValue>,
        severity: "info"
    });

    // Emit WebSocket event for real-time updates
    globalEventEmitter.emitCallIncoming(
        callExecution.id,
        callerNumber,
        calledNumber,
        workflow.user_id
    );

    // Record trigger execution (will link to workflow execution later)
    await triggerRepo.recordTrigger(trigger.id);

    fastify.log.info({
        msg: "Call execution created",
        callExecutionId: callExecution.id,
        livekitRoomName
    });

    // Return SIP redirect to LiveKit
    // This tells Telnyx to connect the call to LiveKit's SIP bridge
    const livekitSipUri = process.env.LIVEKIT_SIP_URI || "sip.livekit.io";

    // Return Telnyx command to dial to LiveKit
    return reply.send({
        commands: [
            {
                command: "answer"
            },
            {
                command: "transfer",
                sip_address: `sip:${livekitRoomName}@${livekitSipUri}`,
                sip_headers: [
                    {
                        name: "X-Call-Execution-ID",
                        value: callExecution.id
                    },
                    {
                        name: "X-Trigger-ID",
                        value: trigger.id
                    }
                ]
            }
        ]
    });
}

/**
 * Handle call answered event
 */
async function handleCallAnswered(
    fastify: FastifyInstance,
    body: TelnyxCallWebhook
): Promise<{ success: boolean }> {
    const payload = body.data.payload;
    const callSid = payload.call_session_id;

    const callRepo = new CallExecutionRepository();
    const callExecution = await callRepo.findByCallSid(callSid);

    if (!callExecution) {
        fastify.log.warn({
            msg: "Call execution not found for answered event",
            callSid
        });
        return { success: true };
    }

    // Update call status and answered time
    const answeredAt = new Date();
    await callRepo.update(callExecution.id, {
        call_status: "active",
        answered_at: answeredAt
    });

    // Log event
    await callRepo.createEvent({
        call_execution_id: callExecution.id,
        event_type: "call:answered",
        event_data: {
            answer_time: payload.answer_time || null
        } as Record<string, JsonValue>,
        severity: "info"
    });

    // Emit WebSocket event
    globalEventEmitter.emitCallActive(
        callExecution.id,
        callExecution.execution_id || "",
        answeredAt.getTime()
    );

    fastify.log.info({
        msg: "Call answered",
        callExecutionId: callExecution.id,
        callSid
    });

    return { success: true };
}

/**
 * Handle call hangup event
 */
async function handleCallHangup(
    fastify: FastifyInstance,
    body: TelnyxCallWebhook
): Promise<{ success: boolean }> {
    const payload = body.data.payload;
    const callSid = payload.call_session_id;

    const callRepo = new CallExecutionRepository();
    const callExecution = await callRepo.findByCallSid(callSid);

    if (!callExecution) {
        fastify.log.warn({
            msg: "Call execution not found for hangup event",
            callSid
        });
        return { success: true };
    }

    // Calculate call duration
    const endedAt = new Date();
    const callDuration = callExecution.answered_at
        ? Math.floor((endedAt.getTime() - callExecution.answered_at.getTime()) / 1000)
        : 0;

    // Update call execution
    await callRepo.update(callExecution.id, {
        call_status: "completed",
        ended_at: endedAt,
        call_duration_seconds: callDuration,
        hangup_cause: payload.hangup_cause || "normal"
    });

    // Log event
    await callRepo.createEvent({
        call_execution_id: callExecution.id,
        event_type: "call:hangup",
        event_data: {
            hangup_cause: payload.hangup_cause || null,
            hangup_source: payload.hangup_source || null,
            duration_seconds: callDuration
        } as Record<string, JsonValue>,
        severity: "info"
    });

    // Emit WebSocket event
    globalEventEmitter.emitCallEnded(
        callExecution.id,
        callDuration,
        "completed",
        payload.hangup_cause
    );

    fastify.log.info({
        msg: "Call ended",
        callExecutionId: callExecution.id,
        callSid,
        duration: callDuration,
        hangupCause: payload.hangup_cause
    });

    return { success: true };
}

/**
 * Check if current time is within business hours
 */
function isWithinBusinessHours(now: Date, hoursStr: string, timezone: string): boolean {
    // Parse hours string like "9-17" (9 AM to 5 PM)
    const [start, end] = hoursStr.split("-").map((h) => parseInt(h, 10));

    const currentHour = parseInt(
        now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            hour12: false,
            timeZone: timezone
        })
    );

    return currentHour >= start && currentHour < end;
}
