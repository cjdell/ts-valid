export function assertUnreachable(x: never): never {
  throw new Error(`An unreachable event has occurred: ${x}`);
}

export class ValidationError extends Error {
  constructor(
    public validation: ValueValidation<any>,
    public messages: readonly ValidationMessage[]
  ) {
    super(`Validation failed:\n${getValidationErrorMessage(messages)}`);

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

function getValidationErrorMessage(
  messages: readonly ValidationMessage[]
): string {
  return messages.map(message => `${message.path}: ${message.err}`).join('\n');
}

export function assertValid<TValueSchema extends ValueSchema>(
  input: any,
  valueSchema: TValueSchema
): ValueResult<TValueSchema> {
  const res = getValid(input, valueSchema);

  if (res[0] === ValidationFail) {
    throw new ValidationError(res[1], res[2]);
  }

  return res[0];
}

// tslint:disable-next-line:variable-name
export const ValidationFail = Symbol('ValidationFail');
export type ValidationFail = typeof ValidationFail;

export function getValid<TValueSchema extends ValueSchema>(
  input: any,
  valueSchema: TValueSchema
): readonly [
  ValueResult<TValueSchema> | ValidationFail,
  ValueValidation<TValueSchema>,
  readonly ValidationMessage[]
] {
  const messages: ValidationMessage[] = [];

  const [answer, validation] = walkValue(input, valueSchema, 'root', messages);

  return [answer, validation, messages] as const;
}

interface ValidationMessage {
  readonly path: string;
  readonly err: string;
}

function walkValue<TValueSchema extends ValueSchema>(
  input: any,
  valueSchema: TValueSchema,
  path: string,
  messages: ValidationMessage[]
): readonly [
  ValueResult<TValueSchema> | ValidationFail,
  ValueValidation<TValueSchema>
] {
  // tslint:disable-next-line:no-let
  let ret: any = ValidationFail;
  // tslint:disable-next-line:no-let
  let err: any = null;

  const [type, args] = valueSchema;

  if (input === null) {
    if (args.indexOf('Null') !== -1) {
      ret = null;
    } else {
      ret = ValidationFail;
      err = 'null is not allowed.';
    }
  } else if (input === undefined) {
    if (args.indexOf('Opt') !== -1) {
      ret = undefined;
    } else {
      err = 'undefined is not allowed.';
    }
  } else if (type === 'string') {
    if (typeof input === 'string') {
      ret = input;
    } else {
      err = `"${input}" is not a string.`;
    }
  } else if (type === 'number') {
    if (typeof input === 'number') {
      ret = input;
    } else {
      err = `"${input}" is not a number.`;
    }
  } else if (type === 'boolean') {
    if (typeof input === 'boolean') {
      ret = input;
    } else {
      err = `"${input}" is not a boolean.`;
    }
  } else if (type === 'unknown') {
    if (input !== null && input !== undefined) {
      ret = input;
    } else {
      err = `"${input}" is not a value (unknown).`;
    }
  } else if (type === 'any') {
    if (input !== null && input !== undefined) {
      ret = input;
    } else {
      err = `"${input}" is not a value (any).`;
    }
  } else if (isOptions(type)) {
    const options = type[1];

    if (options.indexOf(input) !== -1) {
      ret = input;
    } else {
      err = `"${input}" is not a valid option (${options.join(', ')}).`;
    }
  } else if (isParserSchema(type)) {
    const result = type(input);

    ret = result[0];
    err = result[1];
  } else if (isUnionSchema(type)) {
    const [, ...unionValueSchemas] = type;

    const results = unionValueSchemas.map((s, i) =>
      walkValue(input, s, `${path}{union(${i})}`, messages)
    );

    for (const result of results) {
      if (result[0] !== ValidationFail) {
        ret = result[0];
        break;
      }
    }

    if (ret === ValidationFail) {
      // TODO: Merge errors somehow
      err = 'No valid union schemas';
    }
  } else if (isArraySchema(type)) {
    if (Array.isArray(input)) {
      const results = input.map((elem, index) =>
        walkValue(elem, type, `${path}[${index}]`, messages)
      );

      const hasFailures = results.some(result => result[0] === ValidationFail);

      ret = hasFailures ? ValidationFail : results.map(result => result[0]);
      err = results.map(result => result[1]);
    } else {
      err = `Value of type "${typeof input}" is not an array.`;
    }
  } else if (isTupleSchema(type)) {
    const [, itemSchemas] = type;

    if (Array.isArray(input)) {
      const tupleLength = Object.keys(itemSchemas).length;

      if (input.length === tupleLength) {
        const results = Object.keys(itemSchemas).map(propName => {
          const index = parseInt(propName, 10);
          const itemSchema = itemSchemas[index];

          return walkValue(
            input[index],
            itemSchema,
            `${path}[${index}]`,
            messages
          );
        });

        const hasFailures = results.some(
          result => result[0] === ValidationFail
        );

        ret = hasFailures ? ValidationFail : results.map(result => result[0]);
        err = results.map(result => result[1]);
      } else {
        err = `Tuple of length "${input.length}" should be "${tupleLength}".`;
      }
    } else {
      err = `Value of type "${typeof input}" is not a tuple.`;
    }
  } else if (isObjectSchema(type)) {
    if (input && typeof input === 'object') {
      const propResults = Object.keys(type).map(propName => {
        const propSchema = type[propName];

        return [
          propName,
          walkValue(
            input[propName],
            propSchema,
            `${path}.${propName}`,
            messages
          )
        ] as const;
      });

      ret = {};
      err = {};

      propResults.forEach(propResult => {
        const [propName, result] = propResult;

        if (result[0] === ValidationFail) {
          ret = ValidationFail;
        } else if (result[0] !== undefined) {
          if (ret !== ValidationFail) {
            // tslint:disable-next-line:no-object-mutation
            ret[propName] = result[0];
          }
        }

        // tslint:disable-next-line:no-object-mutation
        err[propName] = result[1];
      });
    } else {
      err = `Value of type "${typeof input}" is not an object.`;
    }
  } else if (isRecordSchema(type)) {
    const [, recordKeyType, recordValueSchema] = type;

    if (input && typeof input === 'object') {
      const propResults = Object.keys(input).map(key => {
        const keyResult = walkValue(
          key,
          [recordKeyType, []] as const,
          `${path}.${key}{key}`,
          messages
        );

        const valueResult = walkValue(
          input[key],
          recordValueSchema,
          `${path}.${key}`,
          messages
        );

        return [keyResult, valueResult] as const;
      });

      ret = {};
      err = {};

      // Special case. Check missing properties is using "Options" as key...
      if (
        isOptions(recordKeyType) &&
        recordValueSchema[1].indexOf('Opt') === -1
      ) {
        const options = recordKeyType[1];

        options.forEach(option => {
          if (!(option in input)) {
            const msg = 'Property is missing.';

            ret = ValidationFail;

            // tslint:disable-next-line: no-object-mutation
            err[option] = msg;

            messages.push({
              path: `${path}.${option}`,
              err: msg
            });
          }
        });
      }

      propResults.forEach(propResult => {
        const [keyResult, valueResult] = propResult;

        const propName = keyResult[0];
        const propValue = valueResult[0];

        if (propName === ValidationFail || propValue === ValidationFail) {
          ret = ValidationFail;
        } else {
          if (ret !== ValidationFail) {
            // tslint:disable-next-line:no-object-mutation
            ret[propName] = propValue;
          }
        }

        // tslint:disable-next-line:no-object-mutation
        err[propName] = valueResult[1];
      });
    } else {
      err = `Value of type "${typeof input}" is not an object.`;
    }
  } else {
    assertUnreachable(type);
  }

  // Only add leaf nodes to the messages array
  if (typeof err === 'string') {
    messages.push({ path, err });
  }

  return [ret, err];
}

type BasicSchema =
  | 'string'
  | 'number'
  | 'boolean'
  | 'unknown'
  | 'any'
  | Options;
type Args = 'Null' | 'Opt';
type Options<T extends string | number = string | number> = readonly [
  'Options',
  readonly T[]
];

function isOptions<T extends TypeSchema>(
  thing: T
): thing is Extract<T, Options> {
  return Array.isArray(thing) && thing[0] === 'Options';
}

type ParserSchema<T = unknown> = (value: any) => ParserResult<T>;

export type ParserResult<T = unknown> =
  | readonly [T, null]
  | readonly [ValidationFail, Validation];

function isParserSchema(parser: unknown): parser is ParserSchema {
  return parser instanceof Function;
}

/**
 * Make a parser function given a map function. Any error thrown will translate to validation failures.
 */
export function makeParser<T>(
  func: (inp: any) => T
): (inp: unknown) => ParserResult<T> {
  return (inp: unknown) => {
    try {
      const val = func(inp);

      return [val as T, null] as const;
    } catch (err) {
      return [ValidationFail, err.message] as const;
    }
  };
}

interface ObjectSchema {
  readonly [key: string]: ValueSchema;
}

function isObjectSchema<T extends TypeSchema>(
  type: T
): type is Extract<T, ObjectSchema> {
  return type && !Array.isArray(type) && typeof type === 'object';
}

type TupleSchema<
  TTupleType extends {
    readonly [key: number]: ValueSchema;
  } = {
    readonly [key: number]: ValueSchema;
  }
> = readonly ['Tuple', TTupleType];

function isTupleSchema<T extends TypeSchema>(
  type: T
): type is Extract<T, TupleSchema> {
  return Array.isArray(type) && type[0] === 'Tuple';
}

type ArraySchema<
  TElementType extends
    | BasicSchema
    | ParserSchema
    | ObjectSchema
    | TupleSchema = BasicSchema | ParserSchema | ObjectSchema | TupleSchema,
  TElementArgs extends Args = Args
> = readonly [TElementType, readonly TElementArgs[]];

function isArraySchema<T extends TypeSchema>(
  type: T
): type is Extract<T, ArraySchema> {
  return (
    Array.isArray(type) &&
    !isOptions(type) &&
    !isTupleSchema(type) &&
    !isUnionSchema(type) &&
    !isRecordSchema(type)
  );
}

type UnionSchema<
  TValue1 extends ValueSchema = any,
  TValue2 extends ValueSchema = any,
  TValue3 extends ValueSchema = any
> = readonly ['Union', TValue1, TValue2, TValue3?];

function isUnionSchema<T extends TypeSchema>(
  type: T
): type is Extract<T, UnionSchema> {
  return Array.isArray(type) && type[0] === 'Union';
}

type RecordSchema<
  TKey extends BasicSchema = BasicSchema,
  TValue extends ValueSchema = any
> = readonly ['Record', TKey, TValue];

function isRecordSchema<T extends TypeSchema>(
  type: T
): type is Extract<T, RecordSchema> {
  return Array.isArray(type) && type[0] === 'Record';
}

type TypeSchema =
  | BasicSchema
  | ParserSchema
  | ObjectSchema
  | TupleSchema
  | ArraySchema
  | UnionSchema
  | RecordSchema;

type ValueSchema<
  TType extends TypeSchema = TypeSchema,
  TArgs extends Args = Args
> = readonly [TType, readonly TArgs[]];

// ================ RESULT TRANSFORMATION ================

type ValueResult<TValue> = TValue extends ValueSchema<infer TType, infer TArgs>
  ? TType extends UnionSchema<infer TValue1, infer TValue2, infer TValue3>
    ? (
        | (TValue1 extends ValueSchema<infer TType1, infer TArgs1>
            ? _ValueResult<TType1, TArgs1>
            : never)
        | (TValue2 extends ValueSchema<infer TType2, infer TArgs2>
            ? _ValueResult<TType2, TArgs2>
            : never)
        | (TValue3 extends ValueSchema<infer TType3, infer TArgs3>
            ? _ValueResult<TType3, TArgs3>
            : never))
    : _ValueResult<TType, TArgs>
  : never;

type _ValueResult<TType extends TypeSchema, TArgs extends Args> =
  | (TType extends BasicSchema
      ? BasicResult<TType>
      : TType extends ParserSchema<infer TRetType>
      ? TRetType
      : TType extends ObjectSchema
      ? ObjectOrTupleResult<TType>
      : TType extends TupleSchema<infer TTupleType>
      ? ObjectOrTupleResult<TTupleType>
      : TType extends ArraySchema<infer TElementType, infer TElementArgs>
      ? ArrayResult<TElementType, TElementArgs>
      : TType extends RecordSchema<infer TKey, infer TValue>
      ? _RecordResult<TKey, TValue>
      : never)
  | ArgsResultExtra<TArgs>;

type ObjectOrTupleResult<T extends ObjectSchema | TupleSchema> = {
  readonly [P in keyof T]: ValueResult<T[P]>;
};

type _RecordResult<TKey extends BasicSchema, TValue extends ValueSchema> = {
  [P in BasicResult<TKey>]: ValueResult<TValue>;
};

interface ArrayResult<TType extends TypeSchema, TArgs extends Args>
  extends ReadonlyArray<_ValueResult<TType, TArgs>> {}

type BasicResult<T extends BasicSchema> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : T extends 'unknown'
  ? unknown
  : T extends 'any'
  ? any
  : T extends Options<infer TOptionType>
  ? TOptionType
  : never;

type ArgsResultExtra<T extends Args> =
  | (T extends 'Null' ? null : never)
  | (T extends 'Opt' ? undefined : never);

// ================ VALIDATION TRANSFORMATION ================

type Validation = string;

export type BasicValidation = Validation | null;

type ValueValidation<TValue> = TValue extends ValueSchema<infer TType>
  ? (TType extends UnionSchema<infer TValue1, infer TValue2>
      ? (
          | (
              | (TValue1 extends ValueSchema<infer TType1>
                  ? _ValueValidation<TType1>
                  : never)
              | (TValue2 extends ValueSchema<infer TType2>
                  ? _ValueValidation<TType2>
                  : never))
          | BasicValidation)
      : _ValueValidation<TType>)
  : never;

type _ValueValidation<TType extends TypeSchema> = TType extends BasicSchema
  ? BasicValidation
  : TType extends ParserSchema
  ? BasicValidation
  : TType extends ObjectSchema
  ? ObjectOrTupleValidation<TType> | BasicValidation
  : TType extends TupleSchema<infer TTupleType>
  ? ObjectOrTupleValidation<TTupleType> | BasicValidation
  : TType extends ArraySchema<infer TElementType>
  ? ArrayValidation<TElementType> | BasicValidation
  : TType extends RecordSchema<infer TKey, infer TValue>
  ? RecordValidation<TKey, TValue> | BasicValidation
  : never;

type ObjectOrTupleValidation<T extends ObjectSchema | TupleSchema> = {
  [P in keyof T]: ValueValidation<T[P]>;
};

interface ArrayValidation<TType extends TypeSchema>
  extends ReadonlyArray<_ValueValidation<TType>> {}

type RecordValidation<TKey extends BasicSchema, TValue extends ValueSchema> = {
  [P in BasicResult<TKey>]?: ValueValidation<TValue>;
};
