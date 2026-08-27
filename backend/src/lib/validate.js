// Parses `data` against a Zod schema; throws a 400 error shaped for
// errorHandler.js on failure, otherwise returns the parsed (typed) value.
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw { status: 400, message: 'Datos inválidos', details: result.error.flatten() };
  }
  return result.data;
}

module.exports = { validate };
