import mongoose from "mongoose";

export const { Schema } = mongoose;
export const objectId = Schema.Types.ObjectId;

export const mutableSchemaOptions = Object.freeze({
  timestamps: true,
  versionKey: false,
  strict: "throw",
  minimize: false,
});

export const appendOnlySchemaOptions = Object.freeze({
  versionKey: false,
  strict: "throw",
  minimize: false,
});

export function intField({
  defaultValue,
  min = 0,
  max,
  required = true,
  immutable = false,
} = {}) {
  return {
    type: Number,
    required,
    default: defaultValue,
    min,
    ...(max === undefined ? {} : { max }),
    immutable,
    validate: {
      validator: Number.isInteger,
      message: "{PATH} must be an integer",
    },
  };
}

export function textField({
  required = false,
  min,
  max,
  immutable = false,
  select = true,
} = {}) {
  return {
    type: String,
    required,
    trim: true,
    immutable,
    select,
    ...(min === undefined ? {} : { minlength: min }),
    ...(max === undefined ? {} : { maxlength: max }),
    set: (value) =>
      typeof value === "string"
        ? value.normalize("NFKC").replaceAll("\u0000", "")
        : value,
  };
}

export function addVersion(schema) {
  schema.add({ version: intField({ defaultValue: 0 }) });
  return schema;
}

export function boundedUniqueArray(max) {
  return [
    {
      validator: (values) => Array.isArray(values) && values.length <= max,
      message: `Array exceeds maximum of ${max}`,
    },
    {
      validator: (values) =>
        new Set((values ?? []).map(String)).size === (values ?? []).length,
      message: "Array values must be unique",
    },
  ];
}

export function model(name, schema, collection) {
  return mongoose.models[name] ?? mongoose.model(name, schema, collection);
}
