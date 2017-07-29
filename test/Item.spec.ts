import { Store, Item } from '../src'
import * as PouchDB from 'pouchdb'
import * as chai from 'chai'
import * as faker from 'faker'

import { ITodo, TodoValidator, todos } from './mocks/todo'

const fs = require('fs')
const uuid = require('uuid')
const chaiAsPromised = require('chai-as-promised')
const { assert, expect } = chai

PouchDB.plugin(require('pouchdb-adapter-memory'))
chai.use(chaiAsPromised)

const mocksDir = __dirname + '/../../test/mocks/'

describe('Item', () => {


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

    let file: Buffer | Blob
    let fileType: 'image/jpeg'

    it('File#1 loaded', (done) => {
      fs.readFile(mocksDir + 'img.jpg', (err: any, data: Buffer) => {
        file = data
        assert(file)
        done()
      })

    })

    it('Record#1.attach & Record#1.getAttachment works', () => {
      todo.attach('pic1', file, fileType)
      const att = todo.getAttachment('pic1')

      if (!att)
        return assert.fail('Could not get the attachment')

      assert(att.content_type === fileType)
      assert(att.data === file)
    })

    it('Record#1.hasAttachment works', () => {
      expect(todo.hasAttachment('pic1')).to.exist
      expect(todo.hasAttachment('doesn not exist!')).to.be.undefined
    })


    it('Record#1.loadAttachment')

    it('Record#1.loadAttachmentAsURL works')

    it('Should detach')


    after(() => {
      return todoDB.destroy()
    })

  })

})
