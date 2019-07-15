import { assertValid, getValid, ValidationFail } from '..';
import { deepEqual } from './common';

describe('object', () => {
  describe('object schema', () => {
    interface Schema {
      readonly one: number;
      readonly two: string | null;
      readonly three?: number;
    }

    const schema = [
      {
        one: ['number', []],
        two: ['string', ['Null']],
        three: ['number', ['Opt']]
      },
      []
    ] as const;

    it('should allow a valid object', () => {
      const answer: Schema = assertValid(
        {
          one: 1,
          two: 'two',
          three: 3,
          extra: 'disappear'
        },
        schema
      );

      deepEqual(answer, { one: 1, two: 'two', three: 3 });
    });

    it('should allow a valid object with allowed missing properties', () => {
      const answer: Schema = assertValid({ one: 1, two: null }, schema);

      deepEqual(answer, { one: 1, two: null });
    });

    it('should NOT allow a valid object with disallowed missing properties', () => {
      const [answer, validation, messages] = getValid({ one: 1 }, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, {
        one: null,
        two: 'undefined is not allowed.',
        three: null
      });
      deepEqual(messages, [
        { path: 'root.two', err: 'undefined is not allowed.' }
      ]);
    });

    it('should NOT allow a primitive', () => {
      const [answer, validation, messages] = getValid(123, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'Value of type "number" is not an object.');
      deepEqual(messages, [
        { path: 'root', err: 'Value of type "number" is not an object.' }
      ]);
    });
  });

  describe('object union schema', () => {
    type Schema =
      | {
          readonly one: number;
        }
      | {
          readonly two: string;
        };

    const schema = [
      [
        'Union',
        [
          {
            one: ['number', []]
          },
          []
        ],
        [
          {
            two: ['string', []]
          },
          []
        ]
      ],
      []
    ] as const;

    it('should allow a valid object (1)', () => {
      const answer = assertValid({ one: 1 }, schema);

      deepEqual(answer, { one: 1 });
    });

    it('should allow a valid object (2)', () => {
      const answer: Schema = assertValid({ two: 'two' }, schema);

      deepEqual(answer, { two: 'two' });
    });

    it('should NOT allow an invalid object', () => {
      const [answer, validation, messages] = getValid({ one: 'one' }, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'No valid union schemas');
      deepEqual(messages, [
        {
          path: 'root (Union).one',
          err: '"one" is not a number.'
        },
        {
          path: 'root (Union).two',
          err: 'undefined is not allowed.'
        },
        {
          path: 'root',
          err: 'No valid union schemas'
        }
      ]);
    });
  });
});
