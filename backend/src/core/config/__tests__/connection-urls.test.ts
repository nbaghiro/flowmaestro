import {
    buildRedisUrl,
    normalizePostgresSslMode,
    parseDatabaseUrl,
    parseRedisUrl,
    postgresSslOption
} from "../connection-urls";

describe("parseDatabaseUrl", () => {
    it("parses a full postgres URL", () => {
        expect(
            parseDatabaseUrl("postgresql://app:s3cret@db.internal:5433/flowmaestro?sslmode=require")
        ).toEqual({
            host: "db.internal",
            port: 5433,
            database: "flowmaestro",
            user: "app",
            password: "s3cret",
            sslMode: "require"
        });
    });

    it("accepts the postgres:// scheme without a password or port", () => {
        expect(parseDatabaseUrl("postgres://app@db.internal/flowmaestro")).toEqual({
            host: "db.internal",
            port: undefined,
            database: "flowmaestro",
            user: "app",
            password: undefined,
            sslMode: undefined
        });
    });

    it("decodes percent-encoded credentials", () => {
        const parsed = parseDatabaseUrl("postgres://us%40er:p%40ss%2Fword@host:5432/db");
        expect(parsed.user).toBe("us@er");
        expect(parsed.password).toBe("p@ss/word");
    });

    it("returns an empty object for empty, invalid or non-postgres values", () => {
        expect(parseDatabaseUrl(undefined)).toEqual({});
        expect(parseDatabaseUrl("")).toEqual({});
        expect(parseDatabaseUrl("not a url")).toEqual({});
        expect(parseDatabaseUrl("mysql://user:pass@host/db")).toEqual({});
    });
});

describe("normalizePostgresSslMode and postgresSslOption", () => {
    it("maps libpq modes onto the three supported modes", () => {
        expect(normalizePostgresSslMode("disable")).toBe("disable");
        expect(normalizePostgresSslMode("prefer")).toBe("disable");
        expect(normalizePostgresSslMode("require")).toBe("require");
        expect(normalizePostgresSslMode("verify-ca")).toBe("verify-full");
        expect(normalizePostgresSslMode("VERIFY-FULL")).toBe("verify-full");
        expect(normalizePostgresSslMode(undefined)).toBeUndefined();
        expect(normalizePostgresSslMode("bogus")).toBeUndefined();
    });

    it("translates modes into pg ssl options", () => {
        expect(postgresSslOption(undefined)).toBeUndefined();
        expect(postgresSslOption("disable")).toBeUndefined();
        expect(postgresSslOption("require")).toEqual({ rejectUnauthorized: false });
        expect(postgresSslOption("verify-full")).toBe(true);
    });
});

describe("parseRedisUrl", () => {
    it("parses redis:// without credentials", () => {
        expect(parseRedisUrl("redis://cache.internal:6380")).toEqual({
            host: "cache.internal",
            port: 6380,
            username: undefined,
            password: undefined,
            tls: false
        });
    });

    it("parses rediss:// with a password and implies TLS", () => {
        expect(parseRedisUrl("rediss://default:t0ken@red-abc.render.com:6379")).toEqual({
            host: "red-abc.render.com",
            port: 6379,
            username: "default",
            password: "t0ken",
            tls: true
        });
    });

    it("returns an empty object for empty, invalid or non-redis values", () => {
        expect(parseRedisUrl(undefined)).toEqual({});
        expect(parseRedisUrl("")).toEqual({});
        expect(parseRedisUrl("http://cache:6379")).toEqual({});
    });
});

describe("buildRedisUrl", () => {
    it("builds a plain URL when there are no credentials", () => {
        expect(buildRedisUrl({ host: "localhost", port: 8403, tls: false })).toBe(
            "redis://localhost:8403"
        );
    });

    it("builds a TLS URL with encoded credentials", () => {
        expect(
            buildRedisUrl({
                host: "cache",
                port: 6379,
                username: "default",
                password: "p@ss word",
                tls: true
            })
        ).toBe("rediss://default:p%40ss%20word@cache:6379");
    });

    it("round-trips through parseRedisUrl", () => {
        const parts = { host: "h", port: 1234, username: "u", password: "p/w", tls: true };
        expect(parseRedisUrl(buildRedisUrl(parts))).toEqual(parts);
    });
});

describe("config precedence", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        // The config module loads backend/.env on import, which would refill the
        // variables this suite deletes. Keep the test hermetic.
        jest.doMock("dotenv", () => ({ config: jest.fn() }));
        process.env = { ...originalEnv };
        delete process.env.POSTGRES_HOST;
        delete process.env.POSTGRES_PORT;
        delete process.env.POSTGRES_DB;
        delete process.env.POSTGRES_USER;
        delete process.env.POSTGRES_PASSWORD;
        delete process.env.POSTGRES_SSL;
        delete process.env.DATABASE_URL;
        delete process.env.REDIS_HOST;
        delete process.env.REDIS_PORT;
        delete process.env.REDIS_URL;
        delete process.env.REDIS_PASSWORD;
        delete process.env.REDIS_TLS;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    function loadConfig(): typeof import("../index").config {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require("../index").config;
    }

    it("uses DATABASE_URL and REDIS_URL when the individual variables are unset", () => {
        process.env.DATABASE_URL = "postgres://u:p@dbhost:5555/dbname?sslmode=require";
        process.env.REDIS_URL = "rediss://:tok@redishost:6380";
        const config = loadConfig();
        expect(config.database).toMatchObject({
            host: "dbhost",
            port: 5555,
            database: "dbname",
            user: "u",
            password: "p",
            sslMode: "require"
        });
        expect(config.redis).toMatchObject({
            host: "redishost",
            port: 6380,
            password: "tok",
            tls: true,
            url: "rediss://:tok@redishost:6380"
        });
    });

    it("lets the individual variables win over the URLs", () => {
        process.env.DATABASE_URL = "postgres://u:p@dbhost:5555/dbname?sslmode=require";
        process.env.POSTGRES_HOST = "override-host";
        process.env.POSTGRES_SSL = "disable";
        process.env.REDIS_URL = "redis://redishost:6380";
        process.env.REDIS_PORT = "7000";
        const config = loadConfig();
        expect(config.database.host).toBe("override-host");
        expect(config.database.port).toBe(5555);
        expect(config.database.sslMode).toBe("disable");
        expect(config.redis.host).toBe("redishost");
        expect(config.redis.port).toBe(7000);
        expect(config.redis.url).toBe("redis://redishost:7000");
    });

    it("falls back to the defaults when nothing is set", () => {
        const config = loadConfig();
        expect(config.database.host).toBe("localhost");
        expect(config.database.port).toBe(5432);
        expect(config.database.sslMode).toBeUndefined();
        expect(config.redis.url).toBe("redis://localhost:6379");
    });
});
