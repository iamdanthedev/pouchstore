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
import { Store } from './Store'
import { Attachment, ItemDoc, NewItemDoc, ExistingItemDoc  } from './types'


const clone = require('lodash.clone')
const uuid = require('uuid')
const log = require('debug')('App:Modules:PouchStore:Item')


/**
 * Base models interface
 */
export
interface ItemModel {
  type: string
}


/**
 * Items that PouchStores consist of should be an object of or inherit Item
 *
 * It provides basic ways of working with Pouchstore items
 */
export class Item<T extends ItemModel> {

	constructor(doc: ItemDoc<T>, collection: Store<T, Item<T>>) {
		log('constructor() %o', { doc })

		this._collection = collection

		this._protectedFields = ['_id', '_rev', 'id']

		this._set(doc)
	}

  /**
   * Return a PouchDB collection this item belongs to
   * Set by the collection which creates an item
   */
	get $collection() {
		return this._collection
	}

  /**
   * Returns **a copy** of an underlying PouchDB doc
   */
	@computed
	get $doc() {
		const _attachments = toJS(this._attachmentsMap)

		return Object.assign({}, toJS(this._doc), { _attachments })
	}

  /** If the item has been changed after load/last save */
	@computed
	get isDirty(): boolean {
		return this._dirty
	}

  /** If the item has never been saved */
	@computed
	get isNew(): boolean {
		return isNewDocument(this._doc)
	}

  /** Get a property of the item */
	get<K extends keyof T>(property: K): T[K] {
		return this._doc[property]
	}

  /**
   * Updates the item's underlying PouchDB document
   * Changes are not saved
   * @use Item#save()
   */
	set<DOC extends ItemDoc<T>>(doc: DOC | Partial<DOC>): this

  /**
   * Updates one property of the item's underlying PouchDB document
   * Changes are not saved
   * @use Item#save()
   */
	set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(prop: K, value: DOC[K]): this

  /** @internal */
	@action
	set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(docOrProp: K | DOC | Partial<DOC>, value?: DOC[K]): this {
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

	/** Save this item in the store. This will update the PouchDB database */
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

  /** Attaches a file to the document */
	@action
	attach(name: string, data: Blob | Buffer, contentType: string): void {

		this._attachmentsMap.set(name, {
			content_type: contentType,
			data: data,
			digest: uuid(), // this is a cheat!
		})

		this._dirty = true

	}

  /**
   * Removes attachment
   * This is the same as calling PouchStore#put(item)
   */
	@action
	detach(name: string) {
		this._attachmentsMap.delete(name)
	}

	/**
   * Remove this item from the store.
   * This is the same as calling PouchStore#remove(item)
   */
	@action
	remove(): Promise<void> {
		if (this.isNew)
			return Promise.reject('Item was never saved')

		return this.$collection.remove(this)
	}

  /**
   * Checks if attachment exists
   * Return attachment digest (for mobx observers - to track changes)
   */
	hasAttachment(name: string): string | undefined {
		log('hasAttachment() %s', name)

		if (this._attachmentsMap.has(name)) {
			const att = this._attachmentsMap.get(name)

			if (att)
				return att.digest
		}
	}

  /**
   * Returns attachment by name.
   * Local loadAttachments will have data prop of type string | Blob | Buffer
   */
	getAttachment(name: string): Attachment | undefined {
		log('getAttachment() %s', name)

		return this._attachmentsMap.get(name)
	}

  /** Returns true if attachment is stored on the model */
	isLocalAttachment(name: string): boolean | undefined {
		log('isLocalAttachment() %s', name)

		const att = this.getAttachment(name)

		if (att)
			return !isNil(att.data)
	}

  /** Loads attachment irrespectively of whether it is local or remote */
	loadAttachment(name: string): Promise<Attachment>  {

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

  /**
   * Loads attachment and returns a WebAPI URL Object string
   *
   * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
   */
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

	/** Updates _attachmentMap */
	@action
	protected _updateAttachmentsMap() {
		this._attachmentsMap.clear()

		const doc = this._doc

		if (isNil(doc._attachments))
			return

		for (var key in doc._attachments)
			this._attachmentsMap.set(key, doc._attachments[key])
	}

	/** Sets the whole underlying doc, some of its properties or a single property */
	@action
	protected _set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(data: DOC | Partial<DOC>): this {
		const doc: Partial<DOC> = clone(data)


		// initial set (document is just created)
		if (!this._doc) {
			this._doc = data as DOC
			this._updateAttachmentsMap()
			return this
		}

		for (var key in doc as Partial<T>) {
			if (!this._protectedFields.includes(key)) {
				this._doc[key] = clone(doc[key])
				this._dirty = true

				if (key === '_attachments')
					this._updateAttachmentsMap()
			} else {
				log(`set(): key ${key} is protected and was filtered out`)
			}
		}

		return this
	}

	protected _attachmentsMap: ObservableMap<PouchDB.Core.AttachmentResponse> =
		observable.map([], '_attachmentsMap')

	protected _collection: Store<T, Item<T>>

	@observable.deep
	protected _doc: ItemDoc<T>

	protected _protectedFields: Array<(keyof ItemDoc<T>) | 'id'>

	@observable
	private	_dirty: boolean = false
}