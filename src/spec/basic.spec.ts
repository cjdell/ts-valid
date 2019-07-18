import assert from 'assert';
import { assertValid, getValid, ValidationError, ValidationFail } from '..';
import { deepEqual } from './common';

describe('basic', () => {
  describe('string schema', () => {
    const schema = ['string', []] as const;

    it('should allow a string', () => {
      const answer: string = assertValid('hello', schema);

      deepEqual(answer, 'hello');
    });

    it('should NOT allow undefined', () => {
      const [answer, validation] = getValid(undefined, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'undefined is not allowed.');
    });

    it('should NOT allow undefined (ValidationError)', () => {
      try {
        assertValid(undefined, schema);

        assert.fail();
      } catch (err) {
        if (err instanceof ValidationError) {
          deepEqual(
            err.message,
            'Validation failed:\nroot: undefined is not allowed.'
          );
          deepEqual(err.validation, 'undefined is not allowed.');
          deepEqual(err.messages, [
            { path: 'root', err: 'undefined is not allowed.' }
          ]);
        } else {
          assert.fail(err);
        }
      }
    });
  });

  describe('boolean schema', () => {
    const schema = ['boolean', []] as const;

    it('should allow a boolean', () => {
      const answer: boolean = assertValid(true, schema);

      deepEqual(answer, true);
    });

    it('should NOT allow a number', () => {
      const [answer, validation] = getValid(1, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, '"1" is not a boolean.');
    });
  });

  describe('optional string schema', () => {
    const schema = ['string', ['Opt']] as const;

    it('should allow a string', () => {
      const answer: string | undefined = assertValid('hello', schema);

      deepEqual(answer, 'hello');
    });

    it('should allow undefined', () => {
      const answer: string | undefined = assertValid(undefined, schema);

      deepEqual(answer, undefined);
    });

    it('should NOT allow null', () => {
      const [answer, validation] = getValid(null, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'null is not allowed.');
    });
  });

  describe('nullable string schema', () => {
    const schema = ['string', ['Null']] as const;

    it('should allow a string', () => {
      const answer: string | null = assertValid('hello', schema);

      deepEqual(answer, 'hello');
    });

    it('should allow null', () => {
      const answer: string | null = assertValid(null, schema);

      deepEqual(answer, undefined);
    });

    it('should NOT allow undefined', () => {
      const [answer, validation] = getValid(undefined, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'undefined is not allowed.');
    });
  });

  describe('union schema', () => {
    const schema = [['Union', 'string', 'number'], []] as const;

    it('should allow a string', () => {
      const answer: string | number = assertValid('hello', schema);

      deepEqual(answer, 'hello');
    });

    it('should allow a number', () => {
      const answer: string | number = assertValid(1, schema);

      deepEqual(answer, 1);
    });

    it('should NOT allow undefined', () => {
      const [answer, validation] = getValid(undefined, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'undefined is not allowed.');
    });
  });

  describe('options schema', () => {
    type Options = 'A' | 'B' | 'C';

    const schema = [['Options', ['A', 'B', 'C']], []] as const;

    it('should allow an option', () => {
      const answer: Options = assertValid('B', schema);

      deepEqual(answer, 'B');
    });

    it('should NOT allow null', () => {
      const [answer, validation] = getValid('D', schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, '"D" is not a valid option (A, B, C).');
    });
  });
});
