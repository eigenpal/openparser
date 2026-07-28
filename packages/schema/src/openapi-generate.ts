import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { OPENPARSER_COMPONENT_SCHEMAS, OPENPARSER_ROUTE_MANIFEST } from './contracts';
import { OCR_MODELS } from './ocr-models';
import { buildParseCurl } from './request-examples';

const DOCS_OVERLAY_PATH = join(dirname(fileURLToPath(import.meta.url)), 'openapi-docs.yaml');
type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeSchemaDocs(schema: unknown, docs: unknown): unknown {
  if (!isObject(schema) || !isObject(docs)) return schema;
  const merged = { ...schema };
  for (const [key, value] of Object.entries(docs)) {
    if (key === 'properties' && isObject(value) && isObject(merged.properties)) {
      const properties = { ...merged.properties } as JsonObject;
      for (const [name, propertyDocs] of Object.entries(value)) {
        properties[name] = mergeSchemaDocs(properties[name], propertyDocs);
      }
      merged.properties = properties;
    } else if (key === 'items') {
      merged.items = mergeSchemaDocs(merged.items, value);
    } else {
      merged[key] = structuredClone(value);
    }
  }
  return merged;
}

function normalizeRefs(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeRefs);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      if (key === '$schema') return [];
      return [
        [
          key,
          key === '$ref' && typeof child === 'string' && child in OPENPARSER_COMPONENT_SCHEMAS
            ? `#/components/schemas/${child}`
            : normalizeRefs(child),
        ],
      ];
    })
  );
}

function generatedSchemas(schemaDocs: JsonObject): JsonObject {
  const registry = z.registry<{ id: string }>();
  for (const [name, schema] of Object.entries(OPENPARSER_COMPONENT_SCHEMAS)) {
    registry.add(schema, { id: name });
  }
  const generated = z.toJSONSchema(registry, {
    target: 'draft-2020-12',
    unrepresentable: 'any',
  }).schemas as JsonObject;
  generated.OcrModel = { type: 'string', enum: [...OCR_MODELS] };
  generated.LlmModel = { type: 'string', minLength: 1, maxLength: 200 };
  const requestSchemas = new Set([
    'ParseRequest',
    'ExtractRequest',
    'SuggestSchemaRequest',
    'CreateExtractionPipelineRequest',
    'UpdateExtractionPipelineRequest',
    'ParseBatchItem',
    'ExtractBatchItem',
    'ParseBatchRequest',
    'ExtractBatchRequest',
  ]);
  return Object.fromEntries(
    Object.entries(generated).map(([name, schema]) => {
      const source = requestSchemas.has(name)
        ? z.toJSONSchema(
            OPENPARSER_COMPONENT_SCHEMAS[name as keyof typeof OPENPARSER_COMPONENT_SCHEMAS],
            { target: 'draft-2020-12', io: 'input', unrepresentable: 'any' }
          )
        : schema;
      return [name, mergeSchemaDocs(normalizeRefs(source), schemaDocs[name])];
    })
  );
}

function responseFromManifest(
  target: { schema?: string; component?: string; binary?: true },
  docs: unknown
): JsonObject {
  if (target.component) return { $ref: `#/components/responses/${target.component}` };
  const responseDocs = isObject(docs) ? structuredClone(docs) : {};
  if (target.binary) {
    return {
      description: responseDocs.description ?? 'File content',
      content: {
        'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
      },
    };
  }
  const content = isObject(responseDocs.content) ? responseDocs.content : {};
  const json = isObject(content['application/json']) ? content['application/json'] : {};
  return {
    ...responseDocs,
    description: responseDocs.description ?? 'Successful response',
    content: {
      ...content,
      'application/json': {
        ...json,
        schema: { $ref: `#/components/schemas/${target.schema}` },
      },
    },
  };
}

function replaceRequestExampleTokens(description: string, baseUrl: string): string {
  return description
    .replaceAll('__OPENPARSER_PARSE_SYNC_CURL__', buildParseCurl({ baseUrl, path: '/parse' }))
    .replaceAll(
      '__OPENPARSER_PARSE_ASYNC_CURL__',
      buildParseCurl({ baseUrl, path: '/parse/async' })
    );
}

function generatedPaths(routeDocs: JsonObject, baseUrl: string): JsonObject {
  const paths: JsonObject = {};
  for (const route of OPENPARSER_ROUTE_MANIFEST) {
    const source = routeDocs[route.operationId];
    const docs = isObject(source) ? structuredClone(source) : {};
    if (typeof docs.description === 'string') {
      docs.description = replaceRequestExampleTokens(docs.description, baseUrl);
    }
    const responseDocs = isObject(docs.responses) ? docs.responses : {};
    const operation: JsonObject = {
      operationId: route.operationId,
      tags: [route.tag],
      ...(typeof docs.summary === 'string' ? { summary: docs.summary } : {}),
      ...(typeof docs.description === 'string' ? { description: docs.description } : {}),
      ...('parameters' in route
        ? {
            parameters: route.parameters.map((name) => ({
              $ref: `#/components/parameters/${name}`,
            })),
          }
        : {}),
      ...('requestBody' in route
        ? { requestBody: { $ref: `#/components/requestBodies/${route.requestBody}` } }
        : {}),
      responses: Object.fromEntries(
        Object.entries(route.responses).map(([status, target]) => [
          status,
          responseFromManifest(target, responseDocs[status]),
        ])
      ),
    };
    const pathItem = (isObject(paths[route.path]) ? paths[route.path] : {}) as Record<
      string,
      unknown
    >;
    pathItem[route.method] = operation;
    paths[route.path] = pathItem;
  }
  return paths;
}

function defaultBaseUrl(overlay: JsonObject): string {
  const server =
    Array.isArray(overlay.servers) && isObject(overlay.servers[0]) ? overlay.servers[0] : {};
  const variables = isObject(server.variables) ? server.variables : {};
  const host =
    isObject(variables.ocr_host) && typeof variables.ocr_host.default === 'string'
      ? variables.ocr_host.default
      : 'api.openparser.dev';
  return `https://${host}`;
}

/** Authoritative OpenParser OpenAPI object for generated docs and future runtime serving. */
export function buildOpenParserOpenApiDocument(): JsonObject {
  const overlay = parseYaml(readFileSync(DOCS_OVERLAY_PATH, 'utf8')) as JsonObject;
  const routeDocs = isObject(overlay['x-route-docs']) ? overlay['x-route-docs'] : {};
  const schemaDocs = isObject(overlay['x-schema-docs']) ? overlay['x-schema-docs'] : {};
  delete overlay['x-route-docs'];
  delete overlay['x-schema-docs'];

  const components = isObject(overlay.components) ? overlay.components : {};
  const requestBodies = isObject(components.requestBodies) ? components.requestBodies : {};
  requestBodies.CreateFileUpload = {
    required: true,
    content: {
      'multipart/form-data': {
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['file'],
          properties: { file: { type: 'string', format: 'binary' } },
        },
      },
    },
  };
  components.requestBodies = requestBodies;
  components.schemas = generatedSchemas(schemaDocs);

  const document = {
    ...overlay,
    paths: generatedPaths(routeDocs, defaultBaseUrl(overlay)),
    components,
  };
  const serialized = JSON.stringify(document);
  const unresolved =
    serialized.match(/\{\{[^{}]+\}\}/)?.[0] ?? serialized.match(/__OPENPARSER_[A-Z_]+__/)?.[0];
  if (unresolved) {
    throw new Error(`OpenParser OpenAPI contains unresolved placeholder: ${unresolved}`);
  }
  return document;
}
