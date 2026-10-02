import Ajv, { type AnySchema } from 'ajv';
import addFormats from 'ajv-formats';

export const apiResources = ['people', 'planets', 'films'] as const;
export type ApiResource = (typeof apiResources)[number];
type ResponseKind = 'success' | 'notFound';

function createSuccessSchema(resource: ApiResource): AnySchema {
  const identifyingProperty = resource === 'films' ? 'title' : 'name';

  return {
    type: 'object',
    required: ['message', 'result', 'apiVersion', 'timestamp', 'support'],
    properties: {
      message: { const: 'ok' },
      result: {
        type: 'object',
        required: ['properties', 'uid'],
        properties: {
          properties: {
            type: 'object',
            required: [identifyingProperty],
            properties: {
              [identifyingProperty]: { type: 'string', minLength: 1 },
            },
            additionalProperties: true,
          },
          uid: { type: 'string', minLength: 1 },
        },
        additionalProperties: true,
      },
      apiVersion: { type: 'string', minLength: 1 },
      timestamp: { type: 'string', format: 'date-time' },
      support: {
        type: 'object',
        required: ['contact'],
        properties: {
          contact: { type: 'string', format: 'email' },
        },
        additionalProperties: true,
      },
    },
    additionalProperties: true,
  };
}

const notFoundSchema: AnySchema = {
  type: 'object',
  required: ['apiVersion', 'timestamp', 'support'],
  anyOf: [{ required: ['message'] }, { required: ['messsage'] }],
  properties: {
    message: { type: 'string', minLength: 1 },
    messsage: { type: 'string', minLength: 1 },
    apiVersion: { type: 'string', minLength: 1 },
    timestamp: { type: 'string', format: 'date-time' },
    support: {
      type: 'object',
      required: ['contact'],
      properties: {
        contact: { type: 'string', format: 'email' },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
};

export const responseSchemas: Record<ApiResource, Record<ResponseKind, AnySchema>> = {
  people: { success: createSuccessSchema('people'), notFound: notFoundSchema },
  planets: { success: createSuccessSchema('planets'), notFound: notFoundSchema },
  films: { success: createSuccessSchema('films'), notFound: notFoundSchema },
};

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

export function assertResponseSchema(
  resource: ApiResource,
  kind: ResponseKind,
  body: unknown,
): void {
  const validator = ajv.compile(responseSchemas[resource][kind]);
  if (!validator(body)) {
    throw new Error(
      `Invalid ${resource} ${kind} response schema: ${ajv.errorsText(validator.errors)}`,
    );
  }
}
