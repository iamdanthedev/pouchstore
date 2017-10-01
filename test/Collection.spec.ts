/**
 * Collection class test
 */
// tslint:disable:no-unused-expression
// tslint:disable:no-invalid-this
import { Collection, DB, Item } from '../src';
import { expect } from 'chai';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import * as path from 'path';
import { genTodos, ITodo, todoSchema, todoTags } from './mocks/Todo';
import { setTimeout } from 'timers';
import { __awaiter } from 'tslib';

DB.PLUGIN(memoryAdapter);


async function prepareDB(subscribe: boolean): Promise<DB> {
  // create db and destroy
  let db: DB = new DB('./test/test-db', { adapter: 'memory' });
  await db.$pouchdb.destroy();

  db = new DB('./test/test-db', { adapter: 'memory' });

  if (subscribe) {
    await db.subscribeCollections();
  }

  return Promise.resolve(db);
}

async function createCollection(db: DB, name: string): Promise<Collection<ITodo, Item<ITodo>>> {
  return await db.createCollection(name, {
    factory: (doc, collection) => new Item(doc, collection),
    schema: todoSchema,
  });
}

describe('Collection', () => {

  let db: DB;
  let todos: Collection<ITodo, Item<ITodo>>;
  let todosData: ITodo[];
  let mocksDir: string;

  before(() => {
    mocksDir = path.resolve(__dirname, 'mocks');
    todosData = genTodos(500);
  });

  describe('collection functionality', () => {

    before(async () => {
      db = await prepareDB(false);
      todos = await createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('add 500 items to store sequentially', async () => {
      try {
        for (const data of todosData) {
          const item = todos.create(data);

          if (!item) {
            return expect.fail(null, null, 'object is missing');
          }

          await item.save();
        }
      }
      catch (e) {
        expect.fail(null, null, e);
      }
    });

    it('collection.all should contain 500 items', () => {
      const items = todos.all;
      expect(items.length).to.eq(todosData.length);
    });

    it('data should match', () => {
      for (const data of todosData) {
        const item = todos.getItem(data.id);

        if (!item) {
          return expect.fail(null, null, 'object is missing');
        }

        expect(item).to.exist;
        expect(item.getProp('title')).to.eq(data.title);
        expect(item.getProp('desc')).to.eq(data.desc);
      }
    });

    it('collection.allMap should have a map of items', () => {
      const allMap = todos.allMap;

      for (const data of todosData) {
        expect(allMap[data.id]).to.exist;
        expect(allMap[data.id].getProp('title')).to.eq(data.title);
      }
    });

    it('collection.remove should remove an item', () => {
      const id = todosData[0].id;
      const item = todos.getItem(id);

      if (!item) {
        return expect.fail('could not get item');
      }

      return todos.remove(item)
        .then(() => {
          expect(todos.getItem(id)).to.be.undefined;
        })
        .catch(e => expect.fail(null, null, e));
    });

    it('changes');

    it('hooks');

  });

  describe('Collection#bulkCreate()', () => {

    before(async () => {
      db = await prepareDB(false);
      todos = await createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('should create documents', async () => {
      const result = await todos.bulkCreate(todosData);

      expect(result).to.be.lengthOf(todosData.length);

      for (const todo of result) {
        expect(todo.isNew).to.eq(true);
      }
    });

  });

  describe('Collection#bulkCreate() with saveItems == true', () => {

    let items: Item<ITodo>[];

    before(async () => {
      db = await prepareDB(false);
      todos = await createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('should create documents', async () => {
      items = await todos.bulkCreate(todosData, true);

      expect(items).to.be.lengthOf(todosData.length);
    });

    it('every item should have isNew == false', () => {
      for (const todo of items) {
        expect(todo.isNew).to.eq(false);
      }
    });

  });

  describe('Collection#size', () => {

    before(async () => {
      db = await prepareDB(false);
      todos = await createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('should create documents', async () => {
      const result = await todos.bulkCreate(todosData, true);
      expect(result).to.be.lengthOf(todosData.length);
    });

    it('size should match', () => {
      expect(todos.size).to.eq(todosData.length);
    });

  });

  describe('Collection#find', () => {

    before(async () => {
      db = await prepareDB(false);
      todos = await createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('indexes should exist', async () => {
      const response = await todos.$db.$pouchdb.getIndexes();
      expect(response.indexes.length).to.eq(todos.indexes.length);
    });

    it('add 500 items to store sequentially', async () => {
      try {
        for (const data of todosData) {
          const item = todos.create(data);

          if (!item) {
            return expect.fail(null, null, 'object is missing');
          }

          await item.save();
        }
      }
      catch (e) {
        expect.fail(null, null, e);
      }
    });

    it('should find by id', async () => {
      const docs = await todos.find({
        selector: {
          id: { $eq: todosData[0].id }
        }
      });

      expect(docs).to.exist;
      expect(docs.length).to.eq(1);
    });

    // it('should find by params.color', async () => {
    //   const docs = await todos.find({
    //     selector: {
    //       params: {
    //         color: 'red'
    //       }
    //     }
    //   });
    //
    //   expect(docs).to.exist;
    //   expect(docs.length).to.eq(1);
    // });

    // it('should find by tag', async () => {
    //
    //   for (const tag of todoTags) {
    //
    //     const docs = await todos.find({
    //       selector: {
    //         tags: { $in: tag }
    //       }
    //     });
    //
    //     expect(docs).to.exist;
    //     expect(docs.length).to.be.gt(0);
    //
    //   }
    //
    // });


  });

});
