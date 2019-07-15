import { Opaque } from 'ts-essentials';
import {
  assertValid,
  getValid,
  makeParser,
  ParserResult,
  ValidationFail
} from '..';
import { deepEqual } from './common';

describe('parser', () => {
  describe('single parser schema', () => {
    const parser = (input: 1 | 2): ParserResult<1 | 2> => {
      if ([1, 2].indexOf(input) !== -1) {
        return [input, null] as const;
      } else {
        return [ValidationFail, 'Custom parser failed'] as const;
      }
    };

    const schema = [parser, []] as const;

    it('should allow a valid value', () => {
      const answer: 1 | 2 = assertValid(2, schema);

      deepEqual(answer, 2);
    });

    it('should NOT allow an invalid value', () => {
      const [answer, validation] = getValid(3, schema);

      deepEqual(answer, ValidationFail);
      deepEqual(validation, 'Custom parser failed');
    });
  });

  describe('object with parsers schema and opaque types', () => {
    type ProductId = Opaque<number, 'ProductId'>;
    type ProductCode = Opaque<string, 'ProductCode'>;

    function makeProductId(id: number): ProductId {
      if (id <= 0) {
        throw new Error('Invalid product ID');
      }

      return (id as unknown) as ProductId;
    }
    function makeProductCode(code: string): ProductCode {
      if (!/^[A-Z]{3}\d{3}$/.test(code)) {
        throw new Error('Invalid product code');
      }

      return (code as unknown) as ProductCode;
    }

    const parseProductId = makeParser(makeProductId);
    const parseProductCode = makeParser(makeProductCode);

    interface Product {
      readonly id: ProductId;
      readonly code: ProductCode;
      readonly name: string;
      readonly price: number;
    }

    const productSchema = [
      {
        id: [parseProductId, []],
        code: [parseProductCode, []],
        name: ['string', []],
        price: ['number', []]
      },
      []
    ] as const;

    it('should allow a valid object', () => {
      const answer: Product = assertValid(
        {
          id: 123,
          code: 'ABC123',
          name: 'My Product',
          price: 123.45
        },
        productSchema
      );

      deepEqual(answer, {
        id: makeProductId(123),
        code: makeProductCode('ABC123'),
        name: 'My Product',
        price: 123.45
      });
    });

    it('should NOT allow an object with invalid ID', () => {
      const [, validation, messages] = getValid(
        {
          id: -123,
          code: 'BAD CODE',
          name: 'My Product',
          price: 123.45
        },
        productSchema
      );

      deepEqual(validation, {
        id: 'Invalid product ID',
        code: 'Invalid product code',
        name: null,
        price: null
      });
      deepEqual(messages, [
        {
          path: 'root.id',
          err: 'Invalid product ID'
        },
        {
          path: 'root.code',
          err: 'Invalid product code'
        }
      ]);
    });
  });
});
