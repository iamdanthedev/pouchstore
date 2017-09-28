/**
 * Item class test
 */
// tslint:disable:no-unused-expression
// tslint:disable:no-invalid-this

import { Collection, DB, Item } from '../src';

import * as PouchDB from 'pouchdb';
import { expect } from 'chai';
import * as faker from 'faker';
import * as fs from 'fs';
import * as path from 'path';
import * as memoryAdapter from 'pouchdb-adapter-memory';
import { genTodos, ITodo, todoSchema, todoSchema2 } from './mocks/Todo';
import { JsonSchema } from '../src/JsonSchema';

DB.PLUGIN(memoryAdapter);

function timeout(seconds: number): void {
  it(`waiting for timeout (${seconds} seconds)`, function(done: MochaDone): void {
    this.timeout(seconds * 1000 + 1000);
    setTimeout(done, seconds * 1000);
  });
}

describe('Item', () => {

  let db: DB;
  let todos: Collection<ITodo, Item<ITodo>>;
  let todos2: Collection<ITodo, Item<ITodo>>;
  let todo: Item<ITodo>;
  let todosData: ITodo[];
  let mocksDir: string;

  async function prepareDB(subscribe: boolean): Promise<void> {
    db = new DB('test-db', { adapter: 'memory' });
    await db.$pouchdb.destroy();
    db = new DB('test-db', { adapter: 'memory' });

    if (subscribe) {
      await db.subscribeCollections();
    }

    return Promise.resolve();
  }

  function createCollection(name: string, schema: JsonSchema<ITodo> = todoSchema): Collection<ITodo, Item<ITodo>> {
    return db.createCollection(name, {
      schema,
      factory: (doc, collection) => new Item(doc, collection),
    });
  }

  before(() => {
    mocksDir = path.resolve(__dirname, 'mocks');
  });

  describe('item functionality', () => {

    before(async () => {
      await prepareDB(false);
      todos = createCollection('todos');
      todosData = genTodos(500);
    });

    it('db should be empty', () => {
      return db.$pouchdb.allDocs().then(resp => {
        expect(resp.total_rows).to.eq(0);
      });
    });

    it('db should subscribe collections', () => {
      return db.subscribeCollections();
    });

    it('should create an item', () => {
      todo = todos.create(todosData[0]);
      expect(todo).to.exist;
    });

    it('record.$db should point to the right db', () => {
      expect(todo.$db).to.eq(db);
    });

    it('record.$collection should point to the right collection', () => {
      expect(todo.$collection).to.eq(todos);
    });

    it('record props should match', () => {
      for (const key of Object.keys(todosData[0])) {
        expect(todo.getProp(key as keyof ITodo)).to.eq(todosData[0][key as keyof ITodo]);
      }
    });

    it('record.isNew should eq true', () => {
      expect(todo.isNew).to.eq(true);
    });

    it('record.isDirty should eq false', () => {
      expect(todo.isDirty).eq(false);
    });

    it('record.save() fulfills', () => {
      return todo.save()
        .then(() => expect(todos.all).to.have.lengthOf(1));
    });

    it('record.isNew should eq false', () => {
      expect(todo.isNew).eq(false);
    });

    it('record.isDirty should eq false', () => {
      expect(todo.isDirty).eq(false);
    });

    it('record.setProp should work', () => {
      const title: string = faker.lorem.words(5);
      todo.setProp('title', title);
      expect(todo.getProp('title')).to.be.eq(title);
    });

    it('record.isDirty should eq true', () => {
      expect(todo.isDirty).eq(true);
    });

    it('record.save() should fulfills', () => {
      return todo.save();
    });

    it('item references the same object as in the store', () => {
      expect(todos.getItem(todo.getProp('id'))).to.eq(todo);
    });

    it('record.isDirty should eq false', () => {
      expect(todo.isDirty).eq(false);
    });


    it('record.set works (whole doc)', () => {
      const origId: string = todo.getProp('id');
      const data2 = todosData[1];
      todo.setDoc(data2);
      expect(todo.getProp('id')).to.eq(origId);
      expect(todo.getProp('title')).to.eq(data2.title);
      expect(todo.getProp('type')).to.eq(data2.type);
    });

    it('record.save should fulfill', () => {
      return todo.save();
    });

  });

  describe('attachments', () => {

    let file1path: string;
    let file: Buffer;
    let filetype: string;

    before(async () => {
      file1path = path.resolve(mocksDir, 'img.jpg');
      file = fs.readFileSync(file1path);
      todosData = genTodos(500);
      filetype = 'image/jpeg';

      await prepareDB(false);
      todos = createCollection('todos');
    });

    it('db should be empty', () => {
      return db.$pouchdb.allDocs().then(resp => {
        expect(resp.total_rows).to.eq(0);
      });
    });

    it('db should subscribe collections', () => {
      return db.subscribeCollections();
    });

    it('shoud create record', () => {
      todo = todos.create(todosData[0]);
      expect(todo).to.exist;
    });

    it('record.attach should return true', () => {
      expect(todo.attach('pic1', file, filetype)).to.eq(true);
    });

    it('record.getattachment should return the attachment', () => {
      const att = todo.getAttachment('pic1');

      expect(att).to.exist;
      expect(att.content_type).eq(filetype);
      expect(att.data).eql(file);
    });

    it('record.getAttachmentDigest for existing attachment should return value', () => {
      expect(todo.getAttachmentDigest('pic1')).to.exist;
    });

    it('record.getAttachmentDigest for nonexistant attachment should return undefined', () => {
      expect(todo.getAttachmentDigest('does not not exist!')).to.be.undefined;
    });

    it('record.attachments should contain attachment', () => {
      expect(todo.attachments.pic1).to.exist;
      expect(todo.attachments.pic1.data).eql(file);
    });

    it('record.save should resolve', () => {
      return todo.save();
    });

    it('should load item w/ attachment stub', async () => {
      try {
        const item = await todos.getItem(todo.getProp('id'));
        expect(item).to.exist;
        expect(item.attachments.pic1).to.exist;
        expect(item.attachments.pic1.length).eq(file.byteLength);
        expect(item.attachments.pic1.stub).is.true;
      }
      catch (e) {
        expect.fail(null, null, e);
      }
    });

    it('should detach attachment', () => {
      todo.detach('pic1');
      expect(todo.getAttachmentDigest('pic1')).be.undefined;
    });

  });

  describe('multiple attachments (start from a new doc)', () => {

    let todoId: string;
    let todo2: Item<ITodo>;
    let img1;
    let img2;
    let img3;
    let img4;

    before(async () => {
      todoId = faker.random.uuid();

      img1 = fs.readFileSync(path.resolve(mocksDir, 'img1.png'));
      img2 = fs.readFileSync(path.resolve(mocksDir, 'img2.png'));
      img3 = fs.readFileSync(path.resolve(mocksDir, 'img3.png'));
      img4 = fs.readFileSync(path.resolve(mocksDir, 'img4.png'));

      await prepareDB(false);
      todos = createCollection('todos');
      todos2 = createCollection('todos2', todoSchema2);
      await db.subscribeCollections();
    });

    it('should create new doc', () => {
      todo = todos.create({
        id: todoId,
        title: 'test'
      });

      expect(todo).to.exist;
    });

    it('should attach 2 files', () => {
      todo.attach('img1.png', img1, 'image/png');
      todo.attach('img2.png', img2, 'image/png');

      expect(todo.attachments).all.keys('img1.png', 'img2.png');
    });

    it('should save', () => {
      return todo.save();
    });

    timeout(1);

    it('should get a replica of the doc', () => {
      todo2 = todos2.getItem(todoId);
      expect(todo2).to.exist;
    });

    it('replica should have 2 attachments', () => {
      expect(todo2.attachments).all.keys('img1.png', 'img2.png');
    });

    it('doc should still have 2 attachments', () => {
      expect(todo.attachments).all.keys('img1.png', 'img2.png');
    });

    it('should attach 2 more files', () => {
      todo.attach('img3.png', img3, 'image/png');
      todo.attach('img4.png', img4, 'image/png');

      expect(todo.attachments).all.keys('img1.png', 'img2.png', 'img3.png', 'img4.png');
    });

    it('replica should still have 2 attachments', () => {
      expect(todo2.attachments).all.keys('img1.png', 'img2.png');
    });

    it('should save', () => {
      return todo.save();
    });

    it('should have 4 attachments', () => {
      expect(todo.attachments).all.keys('img1.png', 'img2.png', 'img3.png', 'img4.png');
    });

    it('replica should have the doc w/ 4 attachments', () => {
      expect(todo2.attachments).all.keys('img1.png', 'img2.png', 'img3.png', 'img4.png');
    });

    it('should remove 1 attachment', () => {
      todo.detach('img1.png');
      expect(todo.attachments).all.keys('img2.png', 'img3.png', 'img4.png');
    });

    it('replica should still have the doc w/ 4 attachments', () => {
      expect(todo2.attachments).all.keys('img1.png', 'img2.png', 'img3.png', 'img4.png');
    });

    it('should save', () => {
      return todo.save();
    });

    it('should have 3 attachments', () => {
      expect(todo.attachments).all.keys('img2.png', 'img3.png', 'img4.png');
    });

    it('replica should still have the doc w/ 4 attachments', () => {
      expect(todo2.attachments).all.keys('img2.png', 'img3.png', 'img4.png');
    });

  });

  describe('multiple attachments (start from an existing doc', () => {

    let img1;
    let img2;
    let img3;
    let img4;

    before(async () => {
      img1 = fs.readFileSync(path.resolve(mocksDir, 'img1.png'));
      img2 = fs.readFileSync(path.resolve(mocksDir, 'img2.png'));
      img3 = fs.readFileSync(path.resolve(mocksDir, 'img3.png'));
      img4 = fs.readFileSync(path.resolve(mocksDir, 'img4.png'));

      await prepareDB(false);
      todos = createCollection('todos');
      await db.subscribeCollections();
    });

    it('should put new doc into pouchdb directly', () => {
      const doc: PouchDB.Core.PutDocument<ITodo> = {
        _id: 'todo::doc1',
        id: 'doc1',
        title: 'test doc',
        type: 'todo',
        desc: 'test test',
        counter: 0,
        _attachments: {
          'img1.png': {
            content_type: 'image/png',
            data: img1,
            digest: ''
          },
          'img2.png': {
            content_type: 'image/png',
            data: img2,
            digest: ''
          },
        }
      };

      return db.$pouchdb.put(doc);
    });

    it('should get doc from the collection', () => {
      todo = todos.getItem('doc1');
      expect(todo).to.exist;
    });

    it('should have 2 attachments', () => {
      expect(todo.attachments).all.keys('img1.png', 'img2.png');
    });

    it('should get attachments which are not stubs and size should match', async () => {
      try {
        const att1 = await todo.loadAttachment('img1.png');
        expect(att1).to.exist;
        expect((att1.data as Buffer).byteLength).to.eq(img1.byteLength);
        expect(att1.stub).to.not.exist;
      }
      catch (e) {
        expect.fail(null, null, e);
      }
    });

    it('should save', () => {
      return todo.save();
    });
  });
});

