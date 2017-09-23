import { StoreOptions, IStoreOptions } from './StoreOptions';
import { Item, ItemModel } from './Item';
import { isNil } from './utils';
import { MapOf, ItemDoc, ExistingItemDoc, NewItemDoc } from './types';

const log = require('debug')('pouchstore');


/**
 * Creates a new PouchDB-MobX-driven collection.
 * Supports extending
 * @template T Incoming items data model interface
 * @template U Result of transforming incoming model (what we actually store on the colleciton)
 *             U can equal T if we, for example, don't provide neither options.classModel
 *             nor options.classFactory
 *           S For situations when the items in the store do not satisfy the constraint
 *             restricting U (e.g. complex factory function), setting S will override
 *             the constraint
 */
export
class Store<T extends ItemModel, U extends Item<T>, S extends Item<any> = U>
{

  /**
   * Creates new PouchStore
   * It does not subsribe/attach it to any PouchDB database automatically
   * @see PouchStore#subsribe() Use subsribe to do so
   */
  constructor(options: IStoreOptions<T, U, S> | StoreOptions<T, U, S>) {

    if (options instanceof StoreOptions)
      this._options = options
    else
      this._options = new StoreOptions<T, U, S>(options)


    log(`${this._options.type} constructor() %o`, { options: this._options })
  }

  /**
   * Subscribe to pouchdb and start listening to changes feed
   */
  subscribe(db: PouchDB.Database<any>): Promise<void> {

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

  /**
   * Unsubscribe from pouchdb & stop listening
   */
  unsubscribe(): Promise<void> {
    if (this._changes)
      this._changes.cancel()

    this._db = null
    this._items.clear()
    this._subscribed = false

    return Promise.resolve()
  }


  /**
   * Returns array of all documents sorted by ids
   */
  get all(): S[] {
    if (!this._subscribed)
      log(`${this._options.type} attempt to access unsubscribed collection items'`)

    return Array.from(this._items).map(([key, value]) => value);
  }

  /**
   * Returns a map of all documents
   */
  get allMap(): MapOf<S> {
    const result: MapOf<S> = {}
    this.all.forEach(item => result[item.$doc[this._options.idField]] = item)

    return result
  }

  /** Get item by id or index */
  // TODO: remove access by index (useless?)
  get(arg: string | number): S | undefined {
    if (!this._subscribed)
      log(`${this._options.type} error: attempt to access unsubscribed collection items`)

    let result: S | undefined

    if (typeof arg === 'string') {
      result = this._items.get(arg)
    } else if (typeof arg === 'number') {
      if (arg < this._items.size) {
        result = this.all[arg]
      } else {
        log(`${this._options.type} error: index out of bounds`)
      }
    } else {
      log(`${this._options.type} error: get() argument must be of type string or number`)
    }

    return result
  }

  /**
   * Creates a new object
   * It does not include it into the store
   *
   * @see Item#save()
   */
  create(data: Partial<T>): S {
    log(`${this._options.type} create() %o`, { data })

    const item: T = this._options.validator(data)
    const _id = this._id(item)

    const doc: NewItemDoc<T> = Object.assign({}, item, {
      _id,
      _rev: undefined,
    })

    return this._instantiate(doc)
  }

  /** Load attachment by name */
  loadAttachment(itemId: string, name: string): Promise<Blob | Buffer> {
    log('loadAttachments() %o', { itemId, name })

    if (!!!itemId || !!!name)
      return Promise.reject('ItemID or attachment names are not correct')

    return this._db
      ? this._db.getAttachment(itemId, name)
      : Promise.reject('The store is not attached to any PouchDB')
  }

  /**
   * Puts an object to the underlying db
   * TODO: implement put(items: S[])
   */
  put(item: S): Promise<ExistingItemDoc<T>>
  {
    log(`${this._options.type} update() %o`, { item });

    if (!this._db)
      return Promise.reject('DB is not defined');

    const db = this._db;
    const doc = item.$doc;
    const _id = this._id(doc);
    const id = doc[this._options.idField];

    if (!!!_id || !!!id)
      return Promise.reject('"_id" and "id" properties must be set on an object before putting it into the DB');

    // at first, we should add the item to _items collection to prevent duplicating
    if (!this._items.has(id))
      this._setItem(item);


    doc._attachments = item.attachments;

    // TODO: should unset previously set object in case of error
    return db.put(doc)
      .then(() => db.get(_id))
      .then((doc: ExistingItemDoc<T>) => Promise.resolve(doc))
      .catch(err => Promise.reject(err));
  }

  /** Puts an attachment to the database */
  putAttachment(itemId: string, name: string, file: Blob | Buffer, contentType: string): Promise<void> {
    log('putAttachment() %o', { itemId, name, file })

    const item = this.get(itemId)

    if (!item)
      return Promise.reject('Cannot find the specified item')

    if (!!!name)
      return Promise.reject('Attachment name should not be empty')

    const db = this._db

    const _id = this._id(itemId)

    if (!db)
      return Promise.reject('Store is not attached to any PouchDB')

    if (!!!_id)
      return Promise.reject('Could not get item\'s id')

    return db.get(_id)
      .then((doc: ExistingItemDoc<T>) =>
        db.putAttachment(doc._id, name, doc._rev, file, contentType),
      )
      .then(() => db.get(_id))
      .then((doc: ExistingItemDoc<T>) => Promise.resolve(this._addDoc(doc)))
      .catch(err => Promise.reject(err))

  }

  /**
   * Remove item from the store
   * It will be saved with { _deleted: true } in PouchDB
   */
  remove(item: S): Promise<any>
  remove(itemId: string): Promise<any>
  remove(arg: string | S): Promise<any> {
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
    let beforeRemovePromise: Promise<ItemDoc<any>[] | false | void>

    if (this._options.onBeforeRemove) {
      beforeRemovePromise = this._options.onBeforeRemove.call(this, item)
    } else {
      beforeRemovePromise = Promise.resolve()
    }

    const extraDocs: ItemDoc<any> =  []

    return beforeRemovePromise
      .then((resp) => {

        if (resp === false)
          return Promise.reject('Operation rejected in onBeforeRemove hook')

        if (Array.isArray(resp))
          extraDocs.push(...resp)

        return db.get(_id)
      })
      .then((doc) => {
        const putDoc = Object.assign(doc, { _deleted: true })

        const docs = [...extraDocs, putDoc]

        this._removeItem(item.$doc)

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
        result.rows.forEach(row => this._addDoc(<ExistingItemDoc<T>>row.doc))
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
        return doc.type === params.query.type
      },
      query_params: {
        type: this._options.type,
      },
    })
      .on('change', (info) => {

        log(`${this._options.type} change info`, info)

        if (info.doc && !info.deleted)
          this._addDoc(info.doc as ExistingItemDoc<T>)

        if (info.doc && info.deleted)
          this._removeItem(info.doc as ExistingItemDoc<T>)
      })

    return Promise.resolve()

  }

  /** Instantiates a new object depending in modelClass and modelFactory options */
  private _instantiate(doc: ItemDoc<T>): S {
    log('_instantite() %o', { doc })

    const { factory } = this._options

    if (!factory)
      throw new Error(`${this._options.type} factory must exist`)

    return factory(doc, this)
  }


  private _setItem(item: S) {
    const id = item.$doc[this._options.idField]

    if (!!!id)
      throw new Error(`${this._options.type} Id field is empty, cannot add to collection`)

    this._items.set(id, item)
  }

  private _addDoc(doc: ExistingItemDoc<T>): void {
    log(`${this._options.type} _setItem() %o`, { doc })

    const id = doc[this._options.idField]

    if (!!!id)
      throw new Error('Id field is empty, cannot add to collection')

    const item = this._items.get(id)

    if (item)
      item.set(doc, true)
    else
      this._setItem(this._instantiate(doc))

  }

  private _removeItem(doc: ExistingItemDoc<T>) {
    log(`${this._options.type} _removeItem %o`, { doc })

    this._items.delete(doc[this._options.idField])
  }

  private _id(item: T | S | string): string {

    const typeOfS = (arg: any): arg is S => !isNil(arg.$doc)
    const typeOfT = (arg: any): arg is T => !arg.$doc

    const type = this._options.type
    let id = null

    if (typeof item === 'string')
      id = item
    else if (typeOfS(item))
      id = item.$doc[this._options.idField]
    else if (typeOfT(item))
      id = item[this._options.idField]

    return `${type}::${id}`
  }

  protected _options: StoreOptions<T, U, S>

  protected _db: PouchDB.Database<T> | null

  private _changes: PouchDB.Core.Changes<T>

  private _subscribed: boolean = false

  /** Collection of items */
  // private _items: ObservableMap<S> = observable.map<S>()
  private _items = new Map<string, S>()
}
