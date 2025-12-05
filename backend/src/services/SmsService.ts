import twilio from "twilio";
import { config } from "../core/config/index";

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

export async function sendSms(to: string, body: string) {
    return client.messages.create({
        to,
        from: config.twilio.fromPhone,
        body
    });
}
