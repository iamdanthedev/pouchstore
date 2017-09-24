/**
 * Collection class test
 */
// tslint:disable:no-unused-expression
// tslint:disable:no-invalid-this
import { Collection, DB, Item } from '../src';
import { expect } from 'chai';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import * as path from 'path';
import { genTodos, ITodo, todoValidator } from './mocks/Todo';

DB.PLUGIN(memoryAdapter);


async function prepareDB(subscribe: boolean): Promise<DB> {
  // create db and destroy
  let db: DB = new DB('test-db', { adapter: 'memory' });
  await db.$pouchdb.destroy();

  db = new DB('test-db', { adapter: 'memory' });

  if (subscribe) {
    await db.subscribeCollections();
  }

  return Promise.resolve(db);
}

function createCollection(db: DB, name: string): Collection<ITodo, Item<ITodo>> {
  return db.createCollection(name, {
    type: 'todo',
    idField: 'id',
    factory: (doc, collection) => new Item(doc, collection),
    validator: todoValidator,
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
      todos = createCollection(db, 'todos');
      await db.subscribeCollections();
    });

    it('DB should be empty', () => {
      return db.$pouchdb.allDocs().then(resp => {
        expect(resp.total_rows).to.eq(0);
      });
    });

    it('add 500 items to store sequentially', async () => {
      try {
        for (const data of todosData) {
          const item = todos.create(data);
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

    it('record.save should resolve', () => {

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

});