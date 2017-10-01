/**
 * Schema class test
 */
// tslint:disable:no-unused-expression

import { expect } from 'chai';

import { Schema } from '../src/Schema';
import { DB } from '../src/DB';
import { ITodo, todoSchema } from './mocks/Todo';
import * as faker from 'faker';
import { ValidationError } from '../src/ValidationError';


describe('Schema', () => {

  describe('Todo Schema', () => {

    let db: DB;
    let schema: Schema<ITodo>;


    before(() => {
      db = new DB('./test/test-db');
      schema = new Schema(db, todoSchema);

      expect(db).to.exist;
      expect(schema).to.exist;
    });

    it('get defaults() should match the schema', () => {
      const defaults = schema.defaults;

      expect(defaults).to.have.all.keys('type', 'desc', 'counter');
      expect(defaults.type).eq(todoSchema.properties.type.const);
      expect(defaults.id).eq(todoSchema.properties.type.default);
      expect(defaults.counter).eq(todoSchema.properties.counter.default);
    });

    it('get indexes should match the schema', () => {
      expect(schema.indexes).to.eql(['id', 'params.param1']);
    });

    it('validating proper document should succeed', () => {
      const doc = {
        type: 'todo',
        id: faker.random.uuid(),
        title: faker.lorem.sentence().slice(0, 99),
        desc: faker.lorem.sentences(5),
        counter: faker.random.number(49)
      };

      const valid = schema.validateDoc(doc);

      expect(valid).eq(true);
    });

    it('validating improper document (title) should fail', () => {
      const doc = {
        type: 'todo',
        id: faker.random.uuid(),
        title: 99, // incorrect type
        desc: faker.lorem.sentences(5),
        counter: faker.random.number(100)
      };

      expect(() => schema.validateDoc(doc)).to.throw(ValidationError, /title/);
    });

    it('validating improper document (counter) should fail', () => {
      const doc = {
        type: 'todo',
        id: faker.random.uuid(),
        title: faker.lorem.sentence().slice(0, 99),
        desc: faker.lorem.sentences(5),
        counter: faker.random.number(100) + 100
      };

      expect(() => schema.validateDoc(doc)).to.throw(ValidationError, /counter/);
    });

    it('validating improper document (no id) should fail', () => {
      const doc = {
        type: 'todo',
        title: faker.lorem.sentence().slice(0, 99),
        desc: faker.lorem.sentences(5),
        counter: faker.random.number(100) + 100
      };

      expect(() => schema.validateDoc(doc)).to.throw(ValidationError, /id/);
    });

    it('validateProp for proper data (id) should succeed', () => {
      expect(schema.validateProp('id', faker.random.uuid())).eq(true);
    });

    it('validateProp for proper data (title) should succeed', () => {
      expect(schema.validateProp('title', faker.lorem.word())).eq(true);
    });


    it('validateProp for improper data should fail', () => {
      expect(() => schema.validateProp('counter', 100)).to.throw(ValidationError, /maximum/);
    });
  });
});
