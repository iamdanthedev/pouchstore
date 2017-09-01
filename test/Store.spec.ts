import { Store, Item } from '../src'

import * as PouchDB from 'pouchdb'
import * as chai from 'chai'

import { ITodo, TodoValidator, todos, genTodos } from './mocks/todo'


const fs = require('fs')
const uuid = require('uuid')
const chaiAsPromised = require('chai-as-promised')
const { assert, expect } = chai

PouchDB.plugin(require('pouchdb-adapter-memory'))
chai.use(chaiAsPromised)

const mocksDir = __dirname + '/../../test/mocks/'

describe('Store', () => {


	describe('Single Store empty', () => {

		let todoDB: PouchDB.Database<ITodo>
		let todoStore: Store<ITodo, Item<ITodo>>

		before(() => {
			todoDB = new PouchDB('TodoStore', { adapter: 'memory'} )
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
				factory: (doc, collection) => new Item(doc, collection)
			})

			todoStore.subscribe(todoDB)

			expect(todoStore).to.be.instanceOf(Store)
		})

		it('Add 500 items to store sequentially', () => {
			for(var data of todos) {
				const item = todoStore.create(data)
				item.save()
			}
		})

		it('Store#all, Store#get', () => {
			const items = todoStore.all

			expect(todoStore.all).to.be.lengthOf(todos.length)

			for(var data of todos) {
				const item = todoStore.get(data.id)

				if (!item)
					return assert.fail('Item does not exist')

				expect(item.get('title')).to.eq(data.title)
				expect(item.get('desc')).to.eq(data.desc)
			}
		})

		it('Store#allMap works', () => {
			const allMap = todoStore.allMap

			for(var data of todos) {
				expect(allMap[data.id]).to.exist
				expect(allMap[data.id].get('title')).to.eq(data.title)
			}
		})

		it('Store#remove(item)', () => {
			const id = todos[0].id
			const item = todoStore.get(id)

			if (!item)
				return assert.fail('Could not get item')

			todoStore.remove(item).then(() => {
        expect(todoStore.get(id)).to.be.undefined
			})
		})

		it('Store#remove(itemId)')

		it('changes')

		it('hooks')



		after(() => {
			return todoDB.destroy()
		})

	})

})
