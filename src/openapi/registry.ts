import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";

export const registry = new OpenAPIRegistry();

export function buildOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "EMERHNET API",
      version: "0.1.0",
      description:
        "EMERHNET Phase 1 backend — hospital onboarding, doctors, beds, ambulances.",
    },
    servers: [{ url: "/api/v1" }],
  });
}
