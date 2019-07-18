import { assertValid, getValid, getValidProp, ValidationFail } from '..';
import { deepEqual } from './common';

describe('record', () => {
  describe('record string keys', () => {
    type Schema = Record<string, number>;

    const schema = [['Record', 'string', ['number', []]], []] as const;

    it('should allow a valid object', () => {
      const answer: Schema = assertValid(
        {
          one: 1,
          two: 2,
          three: 3
        },
        schema
      );

      deepEqual(answer, { one: 1, two: 2, three: 3 });
    });
  });

  describe('record schema with option keys', () => {
    type Schema = Record<'A' | 'B', number>;

    const schema = [
      ['Record', ['Options', ['A', 'B']], ['number', []]],
      []
    ] as const;

    it('should allow a valid object', () => {
      const answer: Schema = assertValid(
        {
          A: 1,
          B: 2
        },
        schema
      );

      deepEqual(answer, { A: 1, B: 2 });
    });

    it('should NOT allow an object with a missing property', () => {
      const [answer, validation, messages] = getValid(
        {
          A: 1
        },
        schema
      );

      deepEqual(answer, ValidationFail);

      deepEqual(validation, {
        A: null,
        B: 'Property is missing.'
      });

      deepEqual(messages, [
        {
          path: 'root.B',
          err: 'Property is missing.'
        }
      ]);
    });
  });

  describe('record schema with option keys and optional object values', () => {
    interface Value {
      readonly one: number;
      readonly two: string;
    }

    interface Schema {
      readonly A?: Value;
      readonly B?: Value;
      readonly C?: Value;
    }

    // type Schema = Record<'A' | 'B' | 'C', Value | undefined>;

    const schema = [
      [
        'Record',
        ['Options', ['A', 'B', 'C']],
        [
          {
            one: ['number', []],
            two: ['string', []]
          },
          ['Opt']
        ]
      ],
      []
    ] as const;

    it('should allow a valid object', () => {
      const answer: Schema = assertValid(
        {
          A: { one: 1, two: 'two' },
          C: { one: 11, two: 'two two' }
        },
        schema
      );

      deepEqual(answer, {
        A: { one: 1, two: 'two' },
        C: { one: 11, two: 'two two' }
      });
    });

    it('should NOT allow an invalid object', () => {
      const [answer, validation, messages] = getValid(
        {
          A: { one: 1, two: 2 },
          B: undefined
        },
        schema
      );

      deepEqual(answer, ValidationFail);

      deepEqual(validation, {
        A: {
          one: null,
          two: '"2" is not a string.'
        },
        B: null
      });

      deepEqual(messages, [
        {
          path: 'root.A.two',
          err: '"2" is not a string.'
        }
      ]);

      deepEqual(getValidProp(validation, 'A'), {
        one: null,
        two: '"2" is not a string.'
      });
      deepEqual(
        getValidProp(getValidProp(validation, 'A'), 'two'),
        '"2" is not a string.'
      );

      deepEqual(getValidProp(validation, 'B'), null);
      deepEqual(getValidProp(getValidProp(validation, 'B'), 'two'), null);
    });
  });
});
