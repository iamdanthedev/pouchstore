/**
 * Base Model for Objects
 * It puts the actual PouchDB document into a protected _doc property,
 * so that classes derived from **PouchBaseModel** can access the document
 * inside their getters
 */
import {
	action,
	computed,
	observable,
	ObservableMap,
	toJS,
} from 'mobx'

import { isNewDocument, isNil } from './utils'

const clone = require('lodash.clone')
const uuid = require('uuid')
const log = require('debug')('App:Modules:PouchStore:BasePouchStoreItem')

export
class BasePouchStoreItem<T extends IPouchDataModel>
implements IPouchStoreItem<T> {

	constructor(
		doc: TDocument<T>,
		collection: IPouchStore<T, IPouchStoreItem<T>>,
	) {
		log('constructor() %o', { doc })

		this._collection = collection

		this._protectedFields = ['_id', '_rev', 'id']

		this._set(doc)
	}

	get $collection() {
		return this._collection
	}

	@computed
	get $doc() {
		const _attachments = toJS(this._attachmentsMap)

		return Object.assign({}, toJS(this._doc), { _attachments })
	}

	@computed
	get isDirty(): boolean {
		return this._dirty
	}

	@computed
	get isNew(): boolean {
		return isNewDocument(this._doc)
	}

	get<K extends keyof T>(property: K): T[K] {
		return this._doc[property]
	}

	set<DOC extends TDocument<T>>(doc: DOC | Partial<DOC>): IPouchStoreItem<T>
	set<DOC extends TDocument<T>, K extends keyof TDocument<T>>(prop: K, value: DOC[K]): IPouchStoreItem<T>
	@action
	set<DOC extends TDocument<T>, K extends keyof TDocument<T>>(docOrProp: K | DOC | Partial<DOC>, value?: DOC[K]): IPouchStoreItem<T> {
		log('set()', { docOrProp, value })

		if (typeof docOrProp === 'string' && value) {

			const data: Partial<DOC> = {}
			data[docOrProp] = value
			return this._set(data)

		} else if (typeof docOrProp === 'object') {

			return this._set(docOrProp)

		} else {

			return this

		}

	}


	@action
	attach(name: string, data: Blob | Buffer, contentType: string): void {

		this._attachmentsMap.set(name, {
			content_type: contentType,
			data: data,
			digest: uuid(), // this is a cheat!
		})

		this._dirty = true

	}

	@action
	detach(name: string) {
		this._attachmentsMap.delete(name)
	}

	@action
	save(): Promise<void> {
		return this.$collection.put(this)
			.then((doc) => {
				this._doc = doc
				this._dirty = false

				return Promise.resolve()
			})
			.catch(err => Promise.reject(err))
	}

	@action
	remove(): Promise<void> {
		if (this.isNew)
			return Promise.reject('Item was never saved')

		return this.$collection.remove(this)
	}

	hasAttachment(name: string): string | undefined {
		log('hasAttachment() %s', name)

		if (this._attachmentsMap.has(name)) {
			const att = this._attachmentsMap.get(name)

			if (att)
				return att.digest
		}
	}


	getAttachment(name: string): PouchDB.Core.AttachmentResponse | undefined {
		log('getAttachment() %s', name)

		return this._attachmentsMap.get(name)
	}

	isLocalAttachment(name: string): boolean | undefined {
		log('isLocalAttachment() %s', name)

		const att = this.getAttachment(name)

		if (att)
			return !isNil(att.data)
	}


	loadAttachment(name: string): Promise<PouchDB.Core.AttachmentResponse>  {

		const att = this.getAttachment(name)

		if (!att)
			return Promise.reject('Attachment not found')

		// if attachment is already loaded
		if (!isNil(att.data))
			return Promise.resolve(att)

		// othetwise request it

		return this._collection.loadAttachment(this._doc._id, name)
			.then((data) => {

				const newAtt = clone(att)
				newAtt.data = data

				return Promise.resolve(att)
			})
			.catch(err => Promise.reject('Could not load attachment' + err ))
	}

	loadAttachmentAsURL(name: string, localOnly: boolean = false): Promise<string | null> {
		log('loadAttachmentAsURL()', { name, localOnly })

		if (typeof URL === 'undefined')
			return Promise.reject('WebAPI URL is not avaliable in Node.js')


		if (!this.hasAttachment(name))
			return Promise.reject('Attachment does not exist')

		const att = this.getAttachment(name)

		if (!att)
			return Promise.reject('Could not get attachment')

		if (att.data) {
			//locally present attachment
			// we don't keep this attachment in this._attachmentsMap to save memory
			return Promise.resolve(URL.createObjectURL(att.data))

		} else if (!localOnly) {
			// then we have to load if from the db

			return this.loadAttachment(name).then((att) => {
				if (att.data)
					return Promise.resolve(URL.createObjectURL(att.data))
				else
					return Promise.reject('Could not load attachment')
			})
		} else {
			// Attachment exists but is not kept locally
			// That is not an error, so resolve with null, instead of rejecting
			return Promise.resolve(null)
		}
	}

	@action
	private _refreshAttachmentsMap() {
		this._attachmentsMap.clear()

		const doc = this._doc

		if (isNil(doc._attachments))
			return

		for (var key in doc._attachments)
			this._attachmentsMap.set(key, doc._attachments[key])
	}

	@action
	protected _set<DOC extends TDocument<T>, K extends keyof TDocument<T>>(data: DOC | Partial<DOC>): IPouchStoreItem<T> {
		const doc: Partial<DOC> = clone(data)


		// initial set (document is just created)
		if (!this._doc) {
			this._doc = data as DOC
			this._refreshAttachmentsMap()
			return this
		}

		for (var key in doc as Partial<T>) {
			if (!this._protectedFields.includes(key)) {
				this._doc[key] = clone(doc[key])
				this._dirty = true

				if (key === '_attachments')
					this._refreshAttachmentsMap()
			} else {
				log(`set(): key ${key} is protected and was filtered out`)
			}
		}

		return this
	}

	protected _attachmentsMap: ObservableMap<PouchDB.Core.AttachmentResponse> =
		observable.map([], '_attachmentsMap')

	protected _collection: IPouchStore<T, IPouchStoreItem<T>>

	@observable.deep
	protected _doc: TDocument<T>

	protected _protectedFields: Array<(keyof TDocument<T>) | 'id'>

	@observable
	private	_dirty: boolean = false
}
