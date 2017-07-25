import { computed, observable, ObservableMap } from 'mobx'

import { isNil } from './utils'

const uuid = require('uuid')
const log = require('debug')('PouchStore')


/**
 * Creates a new PouchDB-MobX-driven collection.
 * Supports extending 
 * @template T Incoming items data model interface
 * @template U Result of transforming incoming model (what we actually store on the colleciton)
 *             U can equal T if we, for example, don't provide neither options.classModel
 *             nor options.classFactory
 */
export class PouchStore<T extends IPouchDataModel, U extends IPouchStoreItem<T>>
	implements IPouchStore<T, U> {

	constructor(options: TPouchCollectionConstructorOptions<T, U>) {

		this._options = {
			loadAttachments: options.loadAttachments || false,
			type: options.type,
			idField: options.idField,
			factory: options.factory,
			validator: options.validator,
			onBeforeRemove: options.onBeforeRemove
		}

		log(`${this._options.type} constructor() %o`, { options: this._options })
	}

	/** Subscribe to pouchdb and start listening to changes feed */
	subscribe(db: PouchDB.Database<any>): Promise<any> {

		if (!db)
			return Promise.reject('Database must be not null')

		this._db = db as PouchDB.Database<T>

		this._items.clear()

		return this
			._fetchAll()
			.then(() => this._subscribeToChanges())
			.then(() => {
				this._subscribed = true
				return Promise.resolve()
			})
			.catch(err => Promise.reject(err))
	}

	/** Unsubscribe from pouchdb */
	unsubscribe(): Promise<any> {
		if (this._changes)
			this._changes.cancel()

		this._db = null
		this._items.clear()
		this._subscribed = false

		return Promise.resolve()
	}


	@computed
	get all(): U[] {
		if (!this._subscribed)
			log(`${this._options.type} attempt to access unsubscribed collection items'`)

		return this._items.values().slice()
	}

	@computed
	get allMap(): TMapOf<U> {
		const result: TMapOf<U> = {}
		this.all.forEach(item => result[item.$doc[this._options.idField]] = item)

		return result
	}

	get(arg: string | number): U | undefined {
		if (!this._subscribed)
			log(`${this._options.type} error: attempt to access unsubscribed collection items`)

		let result: U | undefined

		if (typeof arg === 'string') {
			result = this._items.get(arg)
		} else if (typeof arg === 'number') {
			if (arg < this._items.size) {
				result = this._items.values()[arg]
			} else {
				log(`${this._options.type} error: index out of bounds`)
			}
		} else {
			log(`${this._options.type} error: get() argument must be of type string or number`)
		}

		return result
	}

	loadAttachment(itemId: string, name: string): Promise<Blob | Buffer> {
		log('loadAttachments() %o', { itemId, name })
		
		if (!!!itemId || !!!name)
			return Promise.reject('ItemID or attachment names are not correct')

		return this._db
			? this._db.getAttachment(itemId, name)
			: Promise.reject('The store is not attached to any PouchDB')
	}


	/** Creates new document */
	create(data: Partial<T>): U {
		log(`${this._options.type} create() %o`, { data })

		const item: T = this._options.validator(data)
		const _id = this._id(item)

		const doc: TNewDocument<T> = Object.assign({}, item, {
			_id,
			_rev: undefined,
		})

		return this._instantiate(doc)
	}

	/** Write document to pouchdb */
	put(item: U): Promise<TExistingDocument<T>> {
		log(`${this._options.type} update() %o`, { item })

			if (!this._db)
				return Promise.reject('DB is not defined')

			const db = this._db

			const doc = item.$doc
			
			const _id = this._id(doc)
			const id = doc[this._options.idField]

			if (!!!_id || !!!id)
				return Promise.reject('"_id" and "id" properties must be set on an object before putting it into the DB')

			// at first, we should add the item to _items collection to prevent duplicating
			if (!this._items.has(id))
				this._setItem(item)


			// now put it into the bucket
			return db.put(doc)
				.then(() => db.get(_id))
				.then((doc: TExistingDocument<T>) => Promise.resolve(doc))
				.catch(err => Promise.reject(err))

	}
	
	upload(itemId: string, name: string, blob: Blob): Promise<void> {
		log('upload() %o', { itemId, name, blob })

		const item = this.get(itemId)

		if (!item)
			return Promise.reject('Cannot find the specified item')

		if (!!!name)
			return Promise.reject('attachment name should not be empty')

		const db = this._db

		const _id = this._id(itemId)

		if (!db)
			return Promise.reject('Store is not attached to any PouchDB')

		if (!!!_id)
			return Promise.reject('Could not get item\'s id')

		return db.get(_id)
			.then((doc: TExistingDocument<T>) =>
				db.putAttachment(doc._id, name, doc._rev, blob, blob.type),
			)
			.then(() => db.get(_id))
			.then((doc: TExistingDocument<T>) => Promise.resolve(this._addDoc(doc)))
			.catch(err => Promise.reject(err))

	}

	remove(item: U): Promise<any>
	remove(itemId: string): Promise<any>
	remove(arg: string | U): Promise<any> {
		log(`${this._options.type} remove() %o`, { item: arg })

		const item = typeof arg === 'string' ? this.get(arg) : arg

		if (!item)
			return Promise.reject('Cannot get item')

		const _id = this._id(item)
		const db = this._db

		if (!db)
			return Promise.reject('Store is not attached to PouchDB')

		if (!item || item.$collection !== this || !!!_id)
			return Promise.reject('Incorrect item provided.')
		

		// TODO: this should go into separate function - hook invoker
		// like this return invokeHook('onBeforeRemove').then()
		// hook invoker returns Promise.reject() if failed
		let beforeRemovePromise: Promise<TDocument<any>[] | false | void>

		if (this._options.onBeforeRemove) {
			beforeRemovePromise = this._options.onBeforeRemove.call(this, item)
		} else {
			beforeRemovePromise = Promise.resolve()
		}

		const extraDocs: TDocument<any> =  []

		return beforeRemovePromise
			.then((resp) => {

				if (resp === false)
					return Promise.reject('Operation rejected in onBeforeRemove hook')

				if (Array.isArray(resp))
					extraDocs.push(resp)

				return db.get(_id)
			})
			.then((doc) => {
				const putDoc = Object.assign(doc, { _deleted: true })

				const docs = [...extraDocs, putDoc]

				return db.bulkDocs(docs)
			})
			.then(response => Promise.resolve(response))
			.catch(err => Promise.reject(err))

	}

	private _fetchAll(): Promise<void> {
		log(`${this._options.type} _fetchAll()`)

		const db = this._db

		if (!db)
			return Promise.reject('Store is not attached to PouchDB')


		const options = {
			include_docs: true,
			attachments: this._options.loadAttachments,
			binary: true,
			startkey: this._options.type,
			endkey: this._options.type + '::\uffff',
		}

		return db.allDocs(options)
			.then((result) => {
				result.rows.forEach(row => this._addDoc(<TExistingDocument<T>>row.doc))
				return Promise.resolve()
			})
			.catch(err => Promise.reject(err))
	}

	private _subscribeToChanges(): Promise<void> {
		log(`${this._options.type} _subscribeToChanges()`)

		const db = this._db

		if (!db)
			return Promise.reject('Store is not attached to PouchDB')


		this._changes = db.changes({
			live: true,
			since: 'now',
			include_docs: true,
			attachments: this._options.loadAttachments,
			binary: true,
			filter(doc, params) {
				return doc.docType === params.query.docType
			},
			query_params: {
				docType: this._options.type,
			},
		})
			.on('change', (info) => {

				log(`${this._options.type} change info`, info)

				if (info.doc && !info.deleted)
					this._addDoc(info.doc as TExistingDocument<T>)

				if (info.doc && info.deleted)
					this._removeItem(info.doc as TExistingDocument<T>)
			})

		return Promise.resolve()

	}

	/** Instantiates a new object depending in modelClass and modelFactory options */
	private _instantiate(doc: TDocument<T>): U {
		log('_instantite() %o', { doc })

		const { factory } = this._options

		if (!factory)
			throw new Error(`${this._options.type} factory must exist`)

		return factory(doc, this)
	}


	private _setItem(item: U) {
		const id = item.$doc[this._options.idField]

		if (!!!id)
			throw new Error(`${this._options.type} Id field is empty, cannot add to collection`)

		this._items.set(id, item)
	}

	private _addDoc(doc: TExistingDocument<T>): void {
		log(`${this._options.type} _setItem() %o`, { doc })

		const id = doc[this._options.idField]

		if (!!!id)
			throw new Error('Id field is empty, cannot add to collection')

		const item = this._items.get(id)

		if (item) 
			item.set(doc)
		else
			this._setItem(this._instantiate(doc))

	}

	private _removeItem(doc: TExistingDocument<T>) {
		log(`${this._options.type} _removeItem %o`, { doc })

		this._items.delete(doc[this._options.idField])
	}

	private _id(item: T | U | string): string {

		const typeOfU = (arg: any): arg is U => !isNil(arg.$doc)
		const typeOfT = (arg: any): arg is T => !arg.$doc

		const type = this._options.type
		let id = null

		if (typeof item === 'string')
			id = item
		else if (typeOfU(item))
			id = item.$doc[this._options.idField]
		else if (typeOfT(item))
			id = item[this._options.idField]

		return `${type}::${id}`
	}

	protected _options: IPouchCollectionOptions<T, U>

	protected _db: PouchDB.Database<T> | null

	private _changes: PouchDB.Core.Changes<T>

	private _subscribed: boolean = false

	/** Collection of items */
	@observable
	private _items: ObservableMap<U> = observable.map<U>()	
}