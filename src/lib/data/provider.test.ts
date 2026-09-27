import { afterEach, describe, expect, it, vi } from "vitest";
import { getProviderMode } from "./provider";

const keys = ["DATA_PROVIDER", "GOOGLE_SHEETS_SPREADSHEET_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_PRIVATE_KEY", "APP_PASSWORD"] as const;
const previous = new Map(keys.map((key) => [key, process.env[key]]));

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of keys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("data provider mode safety", () => {
  it("fails in production instead of presenting mock data when Google credentials are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATA_PROVIDER = "auto";
    delete process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    process.env.APP_PASSWORD = "private-password";
    expect(() => getProviderMode()).toThrow(/Configuração Google incompleta/);
  });

  it("fails on partial Google configuration even in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.DATA_PROVIDER = "auto";
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID = "sheet-id";
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    expect(() => getProviderMode()).toThrow(/Configuração Google incompleta/);
  });

  it("allows mock data only when explicitly selected", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.DATA_PROVIDER = "mock";
    expect(getProviderMode()).toBe("mock");
  });
});
