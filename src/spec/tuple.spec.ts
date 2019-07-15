import { assertValid, getValid, ValidationFail } from '..';
import { deepEqual } from './common';

describe('tuple', () => {
  describe('1 level', () => {
    type Schema = readonly [string, number];

    const schema = [['Tuple', [['string', []], ['number', []]]], []] as const;

    it('should allow a valid tuple', () => {
      const answer: Schema = assertValid(['A', 1], schema);

      deepEqual(answer, ['A', 1]);
    });

    it('should NOT allow a tuple with wrong types', () => {
      const [answer, validation] = getValid(['A', true], schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, [null, '"true" is not a number.']);
    });
  });

  describe('2 levels', () => {
    type Schema = readonly [
      readonly [string, number],
      readonly [number, string]
    ];

    const schema = [
      [
        'Tuple',
        [
          [['Tuple', [['string', []], ['number', []]]], []],
          [['Tuple', [['number', []], ['string', []]]], []]
        ]
      ],
      []
    ] as const;

    it('should allow a valid tuple', () => {
      const answer: Schema = assertValid([['A', 1], [2, 'B']], schema);

      deepEqual(answer, [['A', 1], [2, 'B']]);
    });

    it('should NOT allow a tuple with wrong types', () => {
      const [answer, validation, messages] = getValid(
        [['A', true], [2, true]],
        schema
      );

      deepEqual(answer, ValidationFail);
      deepEqual(validation, [
        [null, '"true" is not a number.'],
        [null, '"true" is not a string.']
      ]);
      deepEqual(messages, [
        {
          path: 'root[0][1]',
          err: '"true" is not a number.'
        },
        {
          path: 'root[1][1]',
          err: '"true" is not a string.'
        }
      ]);
    });
  });
});
