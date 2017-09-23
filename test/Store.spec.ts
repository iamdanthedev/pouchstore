// import { Store, Item } from '../src'
//
// import * as PouchDB from 'pouchdb'
// import * as chai from 'chai'
//
// import { ITodo, todoValidator, todos, genTodos } from './mocks/todo'
//
//
// const fs = require('fs')
// const uuid = require('uuid')
// const chaiAsPromised = require('chai-as-promised')
// const { assert, expect } = chai
//
// PouchDB.plugin(require('pouchdb-adapter-memory'))
// chai.use(chaiAsPromised)
//
// const mocksDir = __dirname + '/../../test/mocks/'
//
// describe('Collection', () => {
//
//
// 	describe('Single Collection empty', () => {
//
// 		let todoDB: PouchDB.Database<ITodo>
// 		let todoStore: Collection<ITodo, Item<ITodo>>
//
// 		before(() => {
// 			todoDB = new PouchDB('TodoStore', { adapter: 'memory'} )
// 		})
//
//     it('DB should be empty', () => {
//       return todoDB.allDocs().then((resp) => {
//         expect(resp.total_rows).to.eq(0)
//       })
//     })
//
// 		it('Should create new store', () => {
// 			todoStore = new Collection<ITodo, Item<ITodo>>({
// 				type: 'todo',
// 				idField: 'id',
// 				validator: todoValidator,
// 				factory: (doc, collection) => new Item(doc, collection)
// 			})
//
// 			todoStore.subscribe(todoDB)
//
// 			expect(todoStore).to.be.instanceOf(Collection)
// 		})
//
// 		it('Add 500 items to store sequentially', () => {
// 			for(var data of todos) {
// 				const item = todoStore.create(data)
// 				item.save()
// 			}
// 		})
//
// 		it('Collection#all, Collection#getItem', () => {
// 			const items = todoStore.all
//
// 			expect(todoStore.all).to.be.lengthOf(todos.length)
//
// 			for(var data of todos) {
// 				const item = todoStore.getItem(data.id)
//
// 				if (!item)
// 					return assert.fail('Item does not exist')
//
// 				expect(item.getItem('title')).to.eq(data.title)
// 				expect(item.getItem('desc')).to.eq(data.desc)
// 			}
// 		})
//
// 		it('Collection#allMap works', () => {
// 			const allMap = todoStore.allMap
//
// 			for(var data of todos) {
// 				expect(allMap[data.id]).to.exist
// 				expect(allMap[data.id].getItem('title')).to.eq(data.title)
// 			}
// 		})
//
// 		it('Collection#remove(item)', () => {
// 			const id = todos[0].id
// 			const item = todoStore.getItem(id)
//
// 			if (!item)
// 				return assert.fail('Could not getItem item')
//
// 			return todoStore.remove(item)
//         .then(() => {
//           expect(todoStore.getItem(id)).to.be.undefined
//   			})
//         .catch(e => expect.fail(null, null, e));
// 		})
//
// 		it('Collection#remove(itemId)')
//
// 		it('changes')
//
// 		it('hooks')
//
//
//
// 		after(() => {
// 			return todoDB.destroy()
// 		})
//
// 	})
//
// })
