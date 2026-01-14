import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface CliConfig {
    apiUrl: string;
    currentWorkspace?: string;
    defaultOutputFormat: OutputFormat;
}

export interface Credentials {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    apiKey?: string;
}

export type OutputFormat = "json" | "table" | "yaml";

const CONFIG_DIR = path.join(os.homedir(), ".flowmaestro");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
const CREDENTIALS_FILE = path.join(CONFIG_DIR, "credentials.json");

const DEFAULT_CONFIG: CliConfig = {
    apiUrl: "https://api.flowmaestro.ai",
    defaultOutputFormat: "table"
};

function ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }
}

export function getConfigDir(): string {
    return CONFIG_DIR;
}

export function loadConfig(): CliConfig {
    ensureConfigDir();

    if (!fs.existsSync(CONFIG_FILE)) {
        return { ...DEFAULT_CONFIG };
    }

    try {
        const content = fs.readFileSync(CONFIG_FILE, "utf-8");
        const config = JSON.parse(content) as Partial<CliConfig>;
        return { ...DEFAULT_CONFIG, ...config };
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export function saveConfig(config: CliConfig): void {
    ensureConfigDir();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4), {
        mode: 0o600
    });
}

export function updateConfig(updates: Partial<CliConfig>): CliConfig {
    const config = loadConfig();
    const newConfig = { ...config, ...updates };
    saveConfig(newConfig);
    return newConfig;
}

export function getConfigValue<K extends keyof CliConfig>(key: K): CliConfig[K] {
    const config = loadConfig();
    return config[key];
}

export function setConfigValue<K extends keyof CliConfig>(key: K, value: CliConfig[K]): void {
    updateConfig({ [key]: value } as Partial<CliConfig>);
}

export function loadCredentials(): Credentials {
    ensureConfigDir();

    if (!fs.existsSync(CREDENTIALS_FILE)) {
        return {};
    }

    try {
        const content = fs.readFileSync(CREDENTIALS_FILE, "utf-8");
        return JSON.parse(content) as Credentials;
    } catch {
        return {};
    }
}

export function saveCredentials(credentials: Credentials): void {
    ensureConfigDir();
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 4), {
        mode: 0o600
    });
}

export function clearCredentials(): void {
    if (fs.existsSync(CREDENTIALS_FILE)) {
        fs.unlinkSync(CREDENTIALS_FILE);
    }
}

export function isAuthenticated(): boolean {
    const credentials = loadCredentials();

    if (credentials.apiKey) {
        return true;
    }

    if (credentials.accessToken) {
        if (credentials.expiresAt && credentials.expiresAt > Date.now()) {
            return true;
        }
        if (credentials.refreshToken) {
            return true;
        }
    }

    return false;
}

export function getAuthToken(): string | null {
    const credentials = loadCredentials();

    if (credentials.apiKey) {
        return credentials.apiKey;
    }

    if (credentials.accessToken) {
        return credentials.accessToken;
    }

    return null;
}

export function isTokenExpired(): boolean {
    const credentials = loadCredentials();

    if (!credentials.expiresAt) {
        return false;
    }

    return credentials.expiresAt <= Date.now();
}

export function hasRefreshToken(): boolean {
    const credentials = loadCredentials();
    return !!credentials.refreshToken;
}

export function getEffectiveApiUrl(): string {
    const envUrl = process.env.FM_API_URL;
    if (envUrl) {
        return envUrl;
    }
    return getConfigValue("apiUrl");
}

export function getEffectiveWorkspace(): string | undefined {
    const envWorkspace = process.env.FM_WORKSPACE;
    if (envWorkspace) {
        return envWorkspace;
    }
    return getConfigValue("currentWorkspace");
}

export function getEffectiveApiKey(): string | undefined {
    const envKey = process.env.FM_API_KEY;
    if (envKey) {
        return envKey;
    }
    const credentials = loadCredentials();
    return credentials.apiKey;
}
