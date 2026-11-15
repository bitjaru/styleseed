// A small JSON Schema reader for the keywords the repository's hand-written schemas use
// (reference-evidence.schema.json, evidence-pack.schema.json): $ref, oneOf, anyOf, type, const, enum,
// pattern, minimum, maxLength, minItems, required, properties, additionalProperties: false, items.
// Returns the list of errors with a JSON path; [] means the value passes. Tests only.
export function schemaErrors(schema, value, root = schema, path = "$") {
  if (schema.$ref) return schemaErrors(schema.$ref.split("/").slice(1).reduce((node, key) => node[key], root), value, root, path);
  for (const [keyword, need] of [["oneOf", 1], ["anyOf", 0]]) {
    if (!schema[keyword]) continue;
    const passing = schema[keyword].filter((option) => !schemaErrors(option, value, root, path).length).length;
    if (need ? passing !== 1 : passing < 1) return [`${path}: ${keyword} matched ${passing}`];
  }
  const type = Array.isArray(value) ? "array" : value === null ? "null" : Number.isInteger(value) ? "integer" : typeof value;
  if (schema.type && !(schema.type === type || (schema.type === "number" && type === "integer"))) return [`${path}: expected ${schema.type}, got ${type}`];
  const errors = [];
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) errors.push(`${path}: expected ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: ${JSON.stringify(value)} is not allowed`);
  if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) errors.push(`${path}: does not match ${schema.pattern}`);
  if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below ${schema.minimum}`);
  if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path}: longer than ${schema.maxLength}`);
  if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: fewer than ${schema.minItems}`);
  if (type === "object") {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) errors.push(`${path}: missing ${key}`);
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...schemaErrors(schema.properties[key], child, root, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected ${key}`);
    }
  }
  if (type === "array" && schema.items) value.forEach((item, index) => errors.push(...schemaErrors(schema.items, item, root, `${path}[${index}]`)));
  return errors;
}
