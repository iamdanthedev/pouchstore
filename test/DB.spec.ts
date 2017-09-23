import { DB, Item, Collection } from '../src';
import { expect } from 'chai';
import { genTodos, ITodo, todoValidator } from './mocks/Todo';

DB.PLUGIN(require('pouchdb-adapter-memory'));

describe('DB', () => {

  let db: DB;

  function prepareDB()
  {
    before('create db', async () => {
      db = new DB('test-db', { adapter: 'memory' });
      await db.$pouchdb.destroy();
      db = new DB('test-db', { adapter: 'memory' });
    });
  }

  describe('should create DB object', () => {

    prepareDB();

    it('db should exist', () => {
      expect(db).to.exist;
    });

    it('db.$pouchdb should exist', () => {
      expect(db.$pouchdb).to.exist;
    })

  });

  describe('collections functionality', () => {

    prepareDB();

    let todos: Collection<ITodo, Item<ITodo>>;

    it('should create Todo collection', () => {
      todos = db.createCollection('todos', {
        type: 'todo',
        idField: 'id',
        factory: (doc, collection) => new Item(doc, collection),
        validator: todoValidator,
      })
    });

    it('should getItem collection', () => {
      const col = db.getCollection('todos');
      expect(col).to.exist;
      expect(col).to.eq(todos);

    });

    it('should subscribe collections', async () => {
      return db.subscribeCollections();
    });

    it('should fill todo collection with data', () => {
      const promises: Promise<any>[] = [];

      const data = genTodos(10);
      data.forEach(todo => {
        const item = todos.create(todo);
        promises.push(item.save());
      })

      return Promise.all(promises);
    });

    it('should unsubscribe collections', async () => {
      return db.unsubscribeCollections();
    });


  });

  describe('extending DB class', () => {

  });

})
