import { assertValid, getValid, ValidationFail } from '..';
import { deepEqual } from './common';

describe('mix', () => {
  describe('mix schema', () => {
    interface Schema {
      readonly one: number;
      readonly nested: {
        readonly two: string;
        readonly arr: readonly (number | null)[];
      };
      readonly nestedOptional?: {
        readonly three: string;
      };
    }

    const schema = [
      {
        one: ['number', []],
        nested: [
          {
            two: ['string', []],
            arr: [['number', ['Null']], []]
          },
          []
        ],
        nestedOptional: [
          {
            three: ['string', []]
          },
          ['Opt']
        ]
      },
      []
    ] as const;

    it('should allow a valid object', () => {
      const answer: Schema = assertValid(
        {
          one: 1,
          nested: {
            two: 'two',
            arr: [1, 2, null]
          }
        },
        schema
      );

      deepEqual(answer, {
        one: 1,
        nested: {
          two: 'two',
          arr: [1, 2, null]
        }
      });
    });

    it('should NOT allow an invalid object', () => {
      const [answer, validation, messages] = getValid(
        {
          one: 1,
          nested: {
            two: 2,
            arr: [1, 'abc', 3]
          },
          nestedOptional: null
        },
        schema
      );

      deepEqual(answer, ValidationFail);
      deepEqual(validation, {
        one: null,
        nested: {
          two: '"2" is not a string.',
          arr: [null, '"abc" is not a number.', null]
        },
        nestedOptional: 'null is not allowed.'
      });
      deepEqual(messages, [
        { path: 'root.nested.two', err: '"2" is not a string.' },
        { path: 'root.nested.arr[1]', err: '"abc" is not a number.' },
        { path: 'root.nestedOptional', err: 'null is not allowed.' }
      ]);
    });
  });
});
