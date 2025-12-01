import { randomBytes, pbkdf2 } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);

export class PasswordUtils {
    private static readonly ITERATIONS = 100000;
    private static readonly KEY_LENGTH = 64;
    private static readonly DIGEST = "sha512";

    static async hash(password: string): Promise<string> {
        const salt = randomBytes(16).toString("hex");
        const hash = await pbkdf2Async(
            password,
            salt,
            PasswordUtils.ITERATIONS,
            PasswordUtils.KEY_LENGTH,
            PasswordUtils.DIGEST
        );

        return `${salt}:${hash.toString("hex")}`;
    }

    static async verify(password: string, hashedPassword: string): Promise<boolean> {
        const [salt, storedHash] = hashedPassword.split(":");

        if (!salt || !storedHash) {
            return false;
        }

        const hash = await pbkdf2Async(
            password,
            salt,
            PasswordUtils.ITERATIONS,
            PasswordUtils.KEY_LENGTH,
            PasswordUtils.DIGEST
        );

        return storedHash === hash.toString("hex");
    }
}
