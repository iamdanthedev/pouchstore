import { Store, Item } from '../src'

import * as PouchDB from 'pouchdb'
import * as chai from 'chai'
import * as faker from 'faker'
import fs = require('fs');
import path = require('path');
import sinon = require('sinon');
const { assert, expect } = chai

import { ITodo, TodoValidator, todos } from './mocks/todo'
import { autorun, IReactionDisposer } from 'mobx';
import { create } from 'domain';

PouchDB.plugin(require('pouchdb-adapter-memory'))

const mocksDir = path.resolve(__dirname, 'mocks');

describe('Item', () => {


  let todoDB: PouchDB.Database<ITodo>;
  let todoStore: Store<ITodo, Item<ITodo>>;
  let secondStore: Store<ITodo, Item<ITodo>>;

  function prepareSuite()
  {
    before(async () => {
      todoDB = new PouchDB('TodoStore', { adapter: 'memory' });
      await todoDB.destroy(); // make sure it will be empty
      todoDB = new PouchDB('TodoStore', { adapter: 'memory' });

      todoStore = new Store<ITodo, Item<ITodo>>({
        type: 'todo',
        idField: 'id',
        validator: TodoValidator,
        factory: (doc, collection) => new Item(doc, collection),
      });

      secondStore = new Store<ITodo, Item<ITodo>>({
        type: 'todo',
        idField: 'id',
        validator: TodoValidator,
        factory: (doc, collection) => new Item(doc, collection),
      });

      todoStore.subscribe(todoDB);
      secondStore.subscribe(todoDB);
    });

    after(() => {
      return todoDB.destroy();
    })
  }

  describe('Record#1 from data', () => {

    let todoDB: PouchDB.Database<ITodo>
    let todoStore: Store<ITodo, Item<ITodo>>

    let todo: Item<ITodo>

    before(() => {
      todoDB = new PouchDB('TodoStore', { adapter: 'memory' })
    })

    it('DB should be empty', () => {
      return todoDB.allDocs().then((resp) => {
        expect(resp.total_rows).to.eq(0)
      })
    })

    it('Should create new store', () => {
      todoStore = new Store<ITodo, Item<ITodo>>({
        type: 'todo',
        idField: 'id',
        validator: TodoValidator,
        factory: (doc, collection) => new Item(doc, collection),
      })

      todoStore.subscribe(todoDB)

      expect(todoStore).to.be.instanceOf(Store)
    })

    const data = todos[0]

    it('Shoud create Record#1', () => {
      todo = todoStore.create(data)
      expect(todo).to.exist
    })

    it('Record1#$collection === todoStore', () => {
      if (!todo || !todoStore)
        return assert.fail('todo || todoStore is undefined')

      expect(todo.$collection).to.be.eq(todoStore)
    })

    it('Record#1 data should match', () => {
      for (var key of Object.keys(data)) {
        expect(todo.get(key as keyof ITodo)).to.eq(todos[0][key as keyof ITodo])
      }
    })

    it('Record#1.isNew == true', () => {
      assert(todo.isNew === true)
    })

    it('Record#1.isDirty == false', () => {
      assert(todo.isDirty === false)
    })

    it('Record#1.save() fulfills', () => {
      return todo.save()
        .then(() => expect(todoStore.all).to.have.lengthOf(1))
    })

    it('Record#1.isNew==false', () => {
      assert(todo.isNew === false)
    })

    it('Record#1.isDirty==false', () => {
      assert(todo.isDirty === false)
    })


    let item: Item<ITodo> | undefined

    it('Record#1 data should match', () => {
      item = todoStore.get(data.id)

      if (!item)
        return assert.fail('Record is null')


      for (var key of Object.keys(data)) {
        expect(item.get(key as keyof ITodo)).to.eq(todos[0][key as keyof ITodo])
      }
    })

    it('item === todo', () => {
      if (!item || !todo)
        return assert.fail('item || todo is null')

      expect(item).to.eq(todo)
    })

    it('Record#1.isNew == false', () => {
      if (!item)
        return assert.fail('Record is null')

      assert(item.isNew === false)
    })

    let title: string = faker.lorem.words(5)

    it('Record#1.set works (single field)', () => {
      if (!item)
        return assert.fail('item is undefined')

      item.set('title', title)

      expect(item.get('title')).to.be.eq(title)
    })

    it('Record#1.isDirty == true', () => {
      if (!item)
        return assert.fail('item is undefined')

      assert(item.isDirty === true)
    })

    it('Record#1.save() fulfills', () => {
      if (!item)
        return assert.fail('item is undefined')

      return item.save()
        .then(() => {
          const it = todoStore.get(data.id)

          if (!it)
            return assert.fail('item is undefined')

          return expect(it.get('title')).to.be.eq(title)
        })
    })

    it('item references the same object as in the store', () => {
      expect(item).to.eq(todoStore.get(data.id))
    })

    it('Record#1.isDirty === false', () => {
      if (!item)
        return assert.fail('item is undefined')

      assert(item.isDirty === false)
    })

    it('Record#1 should be the only one copy', () => {
      return todo.save()
        .then(() => {
          const it = todoStore.get(data.id)

          if (!it)
            return assert.fail('item is undefined')

          return assert(item === it)
        })
    })

    const data2 = todos[1]

    it('Record#1.set works (whole doc)', () => {
      if (!item)
        return assert.fail('Item is undefined')

      item.set(data2)

      assert(item.get('id') === data.id)
      assert(item.get('title') === data2.title)
      assert(item.get('type') === data2.type)
    })

    it('Record#1.save fulfills', () => {
      return todo.save()
    })

    it('Record#1 data should match', () => {
      if (!item)
        return assert.fail('Item is undefined')

      assert(item.get('id') === data.id)
      assert(item.get('title') === data2.title)
      assert(item.get('type') === data2.type)
    })



    after(() => {
      return todoDB.destroy()
    })
  })

  describe('Attachments', () => {

    let todoDB: PouchDB.Database<ITodo>;
    let todoStore: Store<ITodo, Item<ITodo>>;
    let todo: Item<ITodo>;

    const file1Path = path.resolve(mocksDir, 'img.jpg');
    const file = fs.readFileSync(file1Path);
    const fileType = 'image/jpeg';

    before(() => {
      todoDB = new PouchDB('TodoStore', { adapter: 'memory' });
    })

    it('DB should be empty', () => {
      return todoDB.allDocs().then((resp) => {
        expect(resp.total_rows).to.eq(0);
      })
    })

    it('Should create new store', () => {
      todoStore = new Store<ITodo, Item<ITodo>>({
        type: 'todo',
        idField: 'id',
        validator: TodoValidator,
        factory: (doc, collection) => new Item(doc, collection),
      })

      todoStore.subscribe(todoDB)

      expect(todoStore).to.be.instanceOf(Store)
    })

    const data = todos[0]

    it('Shoud create Record#1', () => {
      todo = todoStore.create(data)
      expect(todo).to.exist
    })

    it('Record#1.attach & Record#1.getAttachment works', () => {
      todo.attach('pic1', file, fileType);
      const att = todo.getAttachment('pic1');

      expect(att!).to.exist;
      expect(att!.content_type).eq(fileType);
      expect(att!.data).eq(file);
    })

    it('Record#1.getAttachmentDigest works', () => {
      expect(todo.getAttachmentDigest('pic1')).to.exist
      expect(todo.getAttachmentDigest('does not not exist!')).to.be.undefined
    })

    it('$doc should have attachment', () => {
      expect(todo.attachments['pic1']).to.exist;
      expect(todo.attachments['pic1'].data).eq(file);
    });

    it('should save item', () => {
      return todo.save();
    });

    it('should load item w/ attachment stub', async () => {
      try
      {
        const item = await todoDB.get(`todo::${todo.get('id')}`);
        expect(item).to.exist;
        expect(item._attachments['pic1']).to.exist;
        expect(item._attachments['pic1'].length).eq(file.byteLength);
        expect(item._attachments['pic1'].stub).is.true;
      }
      catch (e)
      {
        expect.fail(null, null, e);
      }
    });

    it('Record#1.loadAttachmentAsURL works')

    it('Should detach', () => {
      todo.detach('pic1');
      expect(todo.getAttachmentDigest('pic1')).be.undefined;
    })

    after(() => {
      return todoDB.destroy()
    })

  })

  describe('Multiple attachments (start from a new doc)', () => {

    prepareSuite();

    const img1 = fs.readFileSync(path.resolve(mocksDir, 'img1.png'));
    const img2 = fs.readFileSync(path.resolve(mocksDir, 'img2.png'));
    const img3 = fs.readFileSync(path.resolve(mocksDir, 'img3.png'));
    const img4 = fs.readFileSync(path.resolve(mocksDir, 'img4.png'));
    
    let todo: Item<ITodo>;
    let todo2: Item<ITodo>;

    it('should create new doc', () => {
      todo = todoStore.create({
        id: 'item',
        title: 'test'
      })

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
      todo2 = secondStore.get('item');
      expect(todo2).to.exist;
    });

    it('replica should have 2 attachments', () => {
      expect(todo2.attachments).all.keys('img1.png', 'img2.png');
    })

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
    })

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
    })

  });

  describe('Multiple attachments (start from an existing doc', () => {

    prepareSuite();

    const img1 = fs.readFileSync(path.resolve(mocksDir, 'img1.png'));
    const img2 = fs.readFileSync(path.resolve(mocksDir, 'img2.png'));
    const img3 = fs.readFileSync(path.resolve(mocksDir, 'img3.png'));
    const img4 = fs.readFileSync(path.resolve(mocksDir, 'img4.png'));

    let todo: Item<ITodo>;
    let todo2: Item<ITodo>;

    it('should put new doc into pouchdb', () => {
      const doc: PouchDB.Core.PutDocument<ITodo> = {
        _id: 'todo::doc1',
        id: 'doc1',
        title: 'test doc',
        type: 'todo',
        desc: 'test test',
        _attachments: {
          'img1.png': {
            content_type: 'image/png',
            data: img1
          },
          'img2.png': {
            content_type: 'image/png',
            data: img2
          },
        }
      } as any;

      return todoDB.put(doc);
    });

    it('should get doc from the store', () => {
      todo = todoStore.get('doc1');

      expect(todo).to.exist;
    });

    it('should have 2 attachments', () => {
      expect(todo.attachments).all.keys('img1.png', 'img2.png');
    });

    it('should get attachments which are not stubs and size should match', async () => {
      try
      {
        const att1 = await todo.loadAttachment('img1.png');
        expect(att1).to.exist;
        expect((att1.data as Buffer).byteLength).to.eq(img1.byteLength);
        expect(att1.stub).to.not.exist;
      }
      catch (e)
      {
        assert.fail(null, null, e);
      }

    });

    it('should save', () => {
      return todo.save();
    });

  });

  describe('Attachments - reactive - uploading triggers self', () => {

    const img1 = fs.readFileSync(path.resolve(mocksDir, 'img1.png'));
    const img2 = fs.readFileSync(path.resolve(mocksDir, 'img2.png'));
    const img3 = fs.readFileSync(path.resolve(mocksDir, 'img3.png'));
    const img4 = fs.readFileSync(path.resolve(mocksDir, 'img4.png'));

    let todo: Item<ITodo>;
    let runner: IReactionDisposer;

    const spy = sinon.spy();

    function prepareReactiveSuite() {
      prepareSuite();

      after(() => {
        spy.reset();
        runner();
      })
    }

    function createAutorun(callback: () => any)
    {
      it('should create autorun', () => {
        runner = autorun(() => {
            callback();
        });

        expect(runner).to.exist;
      });
    }


    describe('attaching a new attachment triggers Item.attachments', () => {

      prepareReactiveSuite();

      it('should create new doc', () => {
        todo = todoStore.create({
          id: 'item',
          title: 'test'
        })

        expect(todo).to.exist;
      });

      createAutorun(() => spy(todo.$doc._attachments));

      it('should attach 2 files', () => {
        expect(todo.attach('img1.png', img1, 'image/png')).eq(true);
        expect(todo.attach('img2.png', img2, 'image/png')).eq(true);

        expect(todo.attachments).all.keys('img1.png', 'img2.png');
      });

      timeout(1);

      it('spy should have been called twice', () => {
        expect(spy.callCount).eq(2 + 1); //first empty run also counts :-(
      });

    });

    describe('re-attaching an attachment triggers Item.attachments', () => {

      prepareReactiveSuite();

      it('should create new doc', () => {
        todo = todoStore.create({
          id: 'item',
          title: 'test'
        })

        expect(todo).to.exist;
      });

      createAutorun(() => spy(todo.$doc._attachments));

      it('should attach 1 file', () => {
        expect(todo.attach('img1.png', img1, 'image/png')).eq(true);
        expect(todo.attachments).all.keys('img1.png');
      });

      it('spy should have been called once', () => {
        expect(spy.callCount).eq(1 + 1);
        spy.reset();
      });

      it('should re-attach 1 file', () => {
        expect(todo.attach('img1.png', img2, 'image/png')).eq(true);
        expect(todo.attachments).all.keys('img1.png');
      });


      it('spy should have been called once', () => {
        expect(spy.callCount).eq(1);
      });

    });

    describe('removing an attachment triggers Item.attachments', () => {

      prepareReactiveSuite();

      it('should create new doc', () => {
        todo = todoStore.create({
          id: 'item',
          title: 'test'
        })

        expect(todo).to.exist;
      });

      createAutorun(() => spy(todo.$doc._attachments));

      it('should attach 1 file', () => {
        expect(todo.attach('img1.png', img1, 'image/png')).eq(true);
        expect(todo.attachments).all.keys('img1.png');
      });

      it('spy should have been called once', () => {
        expect(spy.callCount).eq(1 + 1);
        spy.reset();
      });

      it('should remove 1 file', () => {
        expect(todo.attach('img1.png', img2, 'image/png')).eq(true);
        expect(todo.attachments).all.keys('img1.png');
      });


      it('spy should have been called once', () => {
        expect(spy.callCount).eq(1);
      });

    });

    describe('attaching a new attachment triggers Item.getAttachmentDigest()', () => {

      prepareReactiveSuite();

      it('should create new doc', () => {
        todo = todoStore.create({
          id: 'item',
          title: 'test'
        })

        expect(todo).to.exist;
      });

      createAutorun(() => spy(todo.getAttachmentDigest('img1.png')));

      it('should attach 2 files', () => {
        expect(todo.attach('img1.png', img1, 'image/png')).eq(true);
        expect(todo.attach('img2.png', img2, 'image/png')).eq(true);

        expect(todo.attachments).all.keys('img1.png', 'img2.png');
      });

      timeout(1);

      it('spy should have been called twice', () => {
        expect(spy.called).is.true; //first empty run also counts :-(
      });

    });
  })

})

export function timeout(seconds: number) {
  it(`waiting for timeout (${seconds} seconds)`, function(done) {
    this.timeout(seconds * 1000 + 1000);
    setTimeout(() => done(), seconds * 1000);
  });
}
