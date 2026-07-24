import { describe, expect, it } from "vitest";
import { appConfig } from "../src/config/app.js";
import { handleApiRequest } from "../src/routes/api/index.js";
import { makeEnv } from "./fixtures.js";

const request = (path, init = {}) => new Request(`https://kokoc.store${path}`, init);
const json = async (response) => response.json();

describe("health API", () => {
  it("returns service metadata and binding status", async () => {
    const response = await handleApiRequest(request("/api/health"), makeEnv(), appConfig);
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      service: "kokoc-worker",
      domain: "kokoc.store",
      version: "v1-foundation",
      storeStatus: "coming-soon",
      bindings: {
        assets: true,
        database: true,
        cache: true
      }
    });
    expect(Date.parse(body.timestamp)).not.toBeNaN();
  });

  it("rejects non-GET requests", async () => {
    const response = await handleApiRequest(
      request("/api/health", { method: "POST" }),
      makeEnv(),
      appConfig
    );
    const body = await json(response);

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(body).toMatchObject({
      ok: false,
      error: "Method not allowed",
      allowedMethods: ["GET"]
    });
  });
});
