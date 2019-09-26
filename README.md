# ts-valid

DEPRECATED: Use https://www.npmjs.com/package/type-safe-validator instead which has nicer syntax.

A validation library designed to take full advantage of the TypeScript type system. All return types are inferred directly from the schema.

## Motivation

I wanted a library that would guarantee that my validation schema will always fully comply with my TypeScript interfaces. As far I as know, such a library did not exist.

This library aims to completely stop runtime errors by ensuring that a compiled TypeScript program can never mistakenly receive an invalid object from sources such a REST API.

## Benefits

- Less bugs. No disparity between the schema and the interface your code compiles.
- If an object successfully makes its way into your domain, it is guaranteed to be in the correct shape.
- Explicit checks for `null` and `undefined`.
- Infinitely nestable schemas for Objects, Tuples, Arrays, Records and Union types.
- Supports literal types.
- Direct support custom parsers and "Opaque" types (see `ts-essentials` module).
- All excess properties are trimmed and a deep copy is returned. The original object is untouched.

## Usage modes

Two primary usages depending on preference:

Use `assertValid` to get a validated object, or throw if there is an error:

    const answer = assertValid(input, schema);

Use `getValid` to get a tuple which contains a validation object, or detailed failure information:

    const [answer, validation, messages] = getValid(input, schema);

    if (answer !== ValidationFail) {
      // Use answer
    }

The `validation` object will mirror the object shape, but for each of the property values, a `string` will be present if there is an error, or `null` is there is no error.

The `messages` array will contain a flattened list of all error messages, each with a `path` property (i.e. 'a.b.c'), and a human readable `err` string.

## Example

Here is how to validate a simple object. See tests for many more examples and to see how error results are returned.

    import { assertValid } from 'ts-valid';

    interface Schema {
      one: number;
      two: string | null;
      three?: number;
    }

    const schema = [{
      one: ['number', []],
      two: ['string', ['Null']],
      three: ['number', ['Opt']],
    }, []] as const;

    // Type error will show here if the schema and interface 'mis-align'.
    // Will throw if input doesn't comply with schema.
    const answer: Schema = assertValid(
      {
        one: 1,
        two: 'two',
        three: 3,
        extra: 'disappear',   // This prop will disappear as not in the schema
      },
      schema,
    );

### Alternative usage...

    import { getValid, ValidationFail } from 'ts-valid';

    const [answer, validation, messages] = getValid(
      {
        one: 'one',   // Deliberate mistake
        two: 'two',
        three: true,  // Deliberate mistake
      },
      schema,
    );

    if (answer !== ValidationFail) {
      // Use answer
    } else {
      // Read from either `validation` or `messages`

      // validation = { 
      //   one: '"one" is not a number.',
      //   two: null,
      //   three: '"true" is not a number.',
      // }

      // messages = [ 
      //   { path: 'root.one', err: '"one" is not a number.' },
      //   { path: 'root.three', err: '"true" is not a number.' },
      // ]
    }

## Notes

This library is a work in progress however I am already using it in two major projects. Feedback is welcome.
