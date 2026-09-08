import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { ExtractionRepairError, ExtractionValidationResult } from './run-types';

export function validateParsedValue(
  value: unknown,
  schema: Record<string, unknown>
): ExtractionValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      data: null,
      schemaError: new TypeError('extraction output must be a JSON object'),
      validationErrors: [
        { path: '/', kind: 'type', message: 'extraction output must be a JSON object' },
      ],
    };
  }
  const data = value as Record<string, unknown>;
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (validate(data)) {
    return { data, schemaError: null, validationErrors: [] };
  }
  const validationErrors: ExtractionRepairError[] = (validate.errors ?? [])
    .slice(0, 50)
    .map((err) => ({
      path: err.instancePath || '/',
      kind: err.keyword,
      message: err.message ?? 'schema validation failed',
    }));
  return {
    data,
    schemaError: new Error('schema validation failed'),
    validationErrors:
      validationErrors.length > 0
        ? validationErrors
        : [{ path: '/', kind: 'schema', message: 'unknown schema validation failure' }],
  };
}

export function validateOutput(
  content: string,
  schema: Record<string, unknown>
): ExtractionValidationResult {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch (error) {
    return {
      data: null,
      schemaError: error instanceof Error ? error : new Error('invalid json'),
      validationErrors: [{ path: '/', kind: 'json_decode', message: 'response is not valid JSON' }],
    };
  }
  return validateParsedValue(value, schema);
}
