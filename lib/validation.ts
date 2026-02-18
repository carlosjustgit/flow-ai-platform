import Ajv from 'ajv';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

const ajv = new Ajv({ allErrors: true });

/**
 * Validate data against a JSON schema
 */
export async function validateSchema(data: any, schema: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (!valid) {
    const errors = validate.errors?.map(
      (err) => `${err.instancePath} ${err.message}`
    ) || ['Validation failed'];
    return { valid: false, errors, data: null };
  }

  return { valid: true, errors: null, data };
}

/**
 * Validate research foundation output
 */
export async function validateResearchFoundation(data: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  const schemaPath = resolve(process.cwd(), 'schemas/research-foundation.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);
  return validateSchema(data, schema);
}

/**
 * Validate KB files output
 */
export async function validateKBFiles(data: any): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  const schemaPath = resolve(process.cwd(), 'schemas/kb-files.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);
  return validateSchema(data, schema);
}

/**
 * Generic agent output validator
 */
export async function validateAgentOutput(data: any, schemaPath: string): Promise<{
  valid: boolean;
  errors: string[] | null;
  data: any | null;
}> {
  const fullPath = resolve(process.cwd(), schemaPath);
  const schemaContent = await readFile(fullPath, 'utf-8');
  const schema = JSON.parse(schemaContent);
  return validateSchema(data, schema);
}

/**
 * KB File type
 */
export interface KBFile {
  filename: string;
  title: string;
  format: 'md' | 'txt';
  content: string;
}
