import { PouchStore, BasePouchStoreItem } from '../src'
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

describe('PouchStore', () => {


	describe('Single Store empty', () => {

		let todoDB: PouchDB.Database<ITodo>
		let todoStore: IPouchStore<ITodo, IPouchStoreItem<ITodo>>

		before(() => {
			todoDB = new PouchDB('TodoStore', { adapter: 'memory'} )
		})

		it('Should create new store', () => {
			todoStore = new PouchStore<ITodo, IPouchStoreItem<ITodo>>({
				type: 'todo',
				idField: 'id',
				validator: TodoValidator,
				factory: (doc, collection) => new BasePouchStoreItem(doc, collection)
			})

			todoStore.subscribe(todoDB)

			expect(todoStore).to.be.instanceOf(PouchStore)
		})

		it('Add many items to store', () => {
			for(var data of todos) {
				const item = todoStore.create(data)
				item.save()
			}
		})

		it('PouchStore#all, PouchStore#get', () => {
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

		it('PouchStore#allMap works', () => {
			const allMap = todoStore.allMap

			for(var data of todos) {
				expect(allMap[data.id]).to.exist
				expect(allMap[data.id].get('title')).to.eq(data.title)
			}
		})

		it('PouchStore#remove(item)')

		it('PouchStore#remove(itemId)')

		it('changes')




		after(() => {
			todoDB.destroy()
			todoDB.close()
		})

	})

})
