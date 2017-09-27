/**
 * DB class test (simple and inherited)
 */
// tslint:disable:no-unused-expression

import { Collection, DB, Item } from '../src';
import { expect } from 'chai';
import { genTodos, ITodo, todoSchema } from './mocks/Todo';
import { genUser, IUser, User } from './mocks/User';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import { TestDB } from './mocks/TestDB';
import * as faker from 'faker';

DB.PLUGIN(memoryAdapter);

describe('DB', () => {

  let db: DB;
  let testDb: TestDB;

  async function prepareDB(): Promise<void> {
    db = new DB('test-db', { adapter: 'memory' });
    await db.$pouchdb.destroy();
    db = new DB('test-db', { adapter: 'memory' });
    await db.subscribeCollections();

    return Promise.resolve();
  }

  async function prepareTestDB(): Promise<void> {
    testDb = new TestDB('test-db1', { adapter: 'memory' });
    await db.$pouchdb.destroy();
    testDb = new TestDB('test-db1', { adapter: 'memory' });
    await testDb.subscribeCollections();

    return Promise.resolve();
  }

  describe('should create DB object', () => {

    before(async () => {
      await prepareDB();
    });

    it('db should exist', () => {
      expect(db).to.exist;
    });

    it('db.$pouchdb should exist', () => {
      expect(db.$pouchdb).to.exist;
    });

  });

  describe('collections functionality', () => {

    before(async () => {
      await prepareDB();
    });

    let todos: Collection<ITodo, Item<ITodo>>;

    it('should create Todo collection', () => {
      todos = db.createCollection('todos', {
        factory: (doc, collection) => new Item(doc, collection),
        schema: todoSchema,
      });
    });

    it('should get collection', () => {
      const col = db.getCollection('todos');
      expect(col).to.exist;
      expect(col).to.eq(todos);
    });

    it('should subscribe collections', async () => {
      return db.subscribeCollections();
    });

    it('should fill todo collection with data', () => {
      const promises: Promise<void>[] = [];

      const data = genTodos(10);
      data.forEach(todo => {
        const item = todos.create(todo);
        promises.push(item.save());
      });

      return Promise.all(promises);
    });

    it('should unsubscribe collections', async () => {
      return db.unsubscribeCollections();
    });

  });

  describe('extending DB class', () => {

    before(async () => {
      await prepareTestDB();
    });

    it('db should exists', () => {
      expect(testDb).to.exist;
    });

    it('db collections should be empty', () => {
      expect(testDb.todos.all.length).eq(0);
      expect(testDb.users.all.length).eq(0);
    });

    it('should fill collections with data', () => {
      for (let i = 0; i < 10; i++) {
        const todos = genTodos(faker.random.number(10) + 1);
        const user  = genUser(1, todos)[0];

        todos.forEach(t => {
          const todo = testDb.todos.create(t);
          todo.save();
        });

        const u = testDb.users.create(user);
        u.save();
      }
    });

    it('collections should have data', () => {
      expect(testDb.users.all.length).to.eq(10);

      testDb.users.all.forEach(user => {
        expect(user.todos.length).to.be.gt(0);
      });
    });

  });

});
