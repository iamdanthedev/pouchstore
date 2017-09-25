import * as debug from 'debug';

import { DB } from './DB';
import { Item, ItemModel } from './Item';
import { CollectionOptions, ICollectionOptions } from './CollectionOptions';
import { ExistingItemDoc, ItemDoc, MapOf, NewItemDoc } from './types';

const log = debug('pouchstore');


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
export class Collection<T extends ItemModel, U extends Item<T> = Item<T>, D extends DB = DB> {

  protected _options: CollectionOptions<T, U>;

  protected _db: D;

  private _changes: PouchDB.Core.Changes<T>;

  private _subscribed: boolean = false;

  private _items: Map<string, U> = new Map<string, U>();

  /**
   * Creates new PouchStore
   * It does not subscribe/attach it to any PouchDB database automatically
   * @see PouchStore#subsribe() Use subsribe to do so
   */
  constructor(options: ICollectionOptions<T, U>, db: D) {

    if (options instanceof CollectionOptions) {
      this._options = options;
    }
    else {
      this._options = new CollectionOptions<T, U>(options);
    }

    this._db = db;

    log(`${this._options.type} constructor() %o`, { options: this._options });
  }

  /**
   * Pouchstore DB the collection belongs to
   * @returns {DB}
   */
  get $db(): D {
    return this._db;
  }

  /**
   * Subscribe to pouchdb and start listening to changes feed
   */
  public subscribe(): Promise<void> {

    // if (!db)
    //   return Promise.reject('Database must be not null')

    // this._db = db as PouchDB.Database<T>

    this._items.clear();

    return this
      ._fetchAll()
      .then(() => this._subscribeToChanges())
      .then(() => {
        this._subscribed = true;

        return Promise.resolve();
      })
      .catch(err => Promise.reject(err));
  }

  /**
   * Unsubscribe from pouchdb & stop listening
   */
  public unsubscribe(): Promise<void> {
    if (this._changes) {
      this._changes.cancel();
    }

    // this._db = null
    this._items.clear();
    this._subscribed = false;

    return Promise.resolve();
  }


  /**
   * Returns array of all documents sorted by ids
   */
  get all(): U[] {
    if (!this._subscribed) {
      log(`${this._options.type} attempt to access unsubscribed collection items'`);
    }

    return Array.from(this._items).map(([key, value]) => value);
  }

  /**
   * Returns a map of all documents
   */
  get allMap(): MapOf<U> {
    const result: MapOf<U> = {};
    this.all.forEach(item => result[item.$doc[this._options.idField]] = item);

    return result;
  }

  /**
   * Get item by id or index
   */
  public getItem(arg: string): U | undefined {
    if (!this._subscribed) {
      log(`${this._options.type} error: attempt to access unsubscribed collection items`);
    }

    return this._items.get(arg);
  }

  /**
   * Creates a new object
   * It does not include it into the store
   *
   * @see Item#save()
   */
  public create(data: Partial<T>): U {
    log(`${this._options.type} create() %o`, { data });

    const item: T = this._options.validator(data);
    const _id = this._id(item);

    const doc: NewItemDoc<T> = Object.assign({}, item, {
      _id,
      _rev: undefined,
    });

    return this._instantiate(doc);
  }

  /**
   * Load attachment by name
   */
  public loadAttachment(itemId: string, name: string): Promise<Blob | Buffer> {
    log('loadAttachments() %o', { itemId, name });

    if (!!!itemId || !!!name) {
      return Promise.reject('ItemID or attachment names are not correct');
    }

    return this._db
      ? this._db.$pouchdb.getAttachment(itemId, name)
      : Promise.reject('The store is not attached to any PouchDB');
  }

  /**
   * Puts an object to the underlying db
   * @todo: implement put(items: U[])
   */
  public put(item: U): Promise<ExistingItemDoc<T>> {
    log(`${this._options.type} update() %o`, { item });

    if (!this._db) {
      return Promise.reject('DB is not defined');
    }

    const db = this._db.$pouchdb as PouchDB.Database<T>;
    const doc = item.$doc;
    const _id = this._id(doc);
    const id = doc[this._options.idField];

    if (!!!_id || !!!id) {
      return Promise.reject('"_id" and "id" properties must be set on an object before putting it into the DB');
    }

    // at first, we should add the item to _items collection to prevent duplicating
    if (!this._items.has(id)) {
      this._setItem(item);
    }


    doc._attachments = item.attachments;

    // TODO: should unset previously set object in case of error
    return db.put(doc)
      .then(() => db.get(_id))
      .then((d: ExistingItemDoc<T>) => Promise.resolve(d))
      .catch(err => Promise.reject(err));
  }

  /**
   * Puts an attachment to the database
   */
  public putAttachment(itemId: string, name: string, file: Blob | Buffer, contentType: string): Promise<void> {
    log('putAttachment() %o', { itemId, name, file });

    const item = this.getItem(itemId);

    if (!item) {
      return Promise.reject('Cannot find the specified item');
    }

    if (!!!name) {
      return Promise.reject('Attachment name should not be empty');
    }

    const db = this._db.$pouchdb as PouchDB.Database<T>;

    const _id = this._id(itemId);

    if (!db) {
      return Promise.reject('Collection is not attached to any PouchDB');
    }

    if (!!!_id) {
      return Promise.reject('Could not getItem item\'s id');
    }

    return db.get(_id)
      .then((doc: ExistingItemDoc<T>) =>
        db.putAttachment(doc._id, name, doc._rev, file, contentType),
      )
      .then(() => db.get(_id))
      .then((doc: ExistingItemDoc<T>) => Promise.resolve(this._addDoc(doc)))
      .catch(err => Promise.reject(err));

  }

  /**
   * Remove item from the store
   * It will be saved with { _deleted: true } in PouchDB
   */
  public remove(item: U): Promise<{}>;
  public remove(itemId: string): Promise<{}>;
  public remove(arg: string | U): Promise<{}> {
    log(`${this._options.type} remove() %o`, { item: arg });

    const item = typeof arg === 'string' ? this.getItem(arg) : arg;

    if (!item) {
      return Promise.reject('Cannot getItem item');
    }

    if (!item.$doc._rev) {
      return Promise.reject('Cannot remove an unsaved item');
    }

    const _id = this._id(item);
    const db = this._db.$pouchdb as PouchDB.Database<{}>;

    if (!db) {
      return Promise.reject('Collection is not attached to PouchDB');
    }

    if (!item || item.$collection !== this || !!!_id) {
      return Promise.reject('Incorrect item provided.');
    }


    // TODO: this should go into separate function - hook invoker
    // like this return invokeHook('onBeforeRemove').then()
    // hook invoker returns Promise.reject() if failed
    // tslint:disable-next-line
    let beforeRemovePromise: Promise<ItemDoc<any> | false | void>;

    if (this._options.onBeforeRemove) {
      beforeRemovePromise = this._options.onBeforeRemove.call(this, item);
    }
    else {
      beforeRemovePromise = Promise.resolve();
    }

    // tslint:disable-next-line
    const extraDocs: ItemDoc<any>[] =  [];

    return beforeRemovePromise
      .then(resp => {

        if (resp === false) {
          return Promise.reject('Operation rejected in onBeforeRemove hook');
        }

        if (Array.isArray(resp)) {
          extraDocs.push(...resp);
        }

        return db.get(_id);
      })
      .then(doc => {
        const putDoc = Object.assign(doc, { _deleted: true });

        const docs = [...extraDocs, putDoc];

        this._removeItem(item.$doc);

        return db.bulkDocs(docs);
      })
      .then(response => Promise.resolve(response))
      .catch(err => Promise.reject(err));

  }


  private _fetchAll(): Promise<void> {
    log(`${this._options.type} _fetchAll()`);

    const db = this._db.$pouchdb as PouchDB.Database<T>;

    if (!db) {
      return Promise.reject('Collection is not attached to PouchDB');
    }


    const options = {
      include_docs: true,
      attachments: this._options.loadAttachments,
      binary: true,
      startkey: this._options.type,
      endkey: `${this._options.type}::\uffff`,
    };

    return db.allDocs(options)
      .then(result => {
        result.rows.forEach(row => this._addDoc(row.doc as ExistingItemDoc<T>));

        return Promise.resolve();
      })
      .catch(err => Promise.reject(err));
  }

  private _subscribeToChanges(): Promise<void> {
    log(`${this._options.type} _subscribeToChanges()`);

    const db = this._db.$pouchdb as PouchDB.Database<T>;

    if (!db) {
      return Promise.reject('Collection is not attached to PouchDB');
    }


    this._changes = db.changes({
      live: true,
      since: 'now',
      include_docs: true,
      attachments: this._options.loadAttachments,
      binary: true,
      filter: (doc, params) => {
        return doc.type === params.query.type;
      },
      query_params: {
        type: this._options.type,
      },
    })
      .on('change', info => {

        log(`${this._options.type} change info`, info);

        if (info.doc && !info.deleted) {
          this._addDoc(info.doc as ExistingItemDoc<T>);
        }

        if (info.doc && info.deleted) {
          this._removeItem(info.doc as ExistingItemDoc<T>);
        }
      });

    return Promise.resolve();

  }

  /**
   * Instantiates a new object depending in modelClass and modelFactory options
   */
  private _instantiate(doc: ItemDoc<T>): U {
    log('_instantite() %o', { doc });

    const { factory } = this._options;

    if (!factory) {
      throw new Error(`${this._options.type} factory must exist`);
    }

    return factory(doc, this);
  }


  private _setItem(item: U): void {
    const id = item.$doc[this._options.idField];

    if (!!!id) {
      throw new Error(`${this._options.type} Id field is empty, cannot add to collection`);
    }

    this._items.set(id, item);
  }

  private _addDoc(doc: ExistingItemDoc<T>): void {
    log(`${this._options.type} _setItem() %o`, { doc });

    const id = doc[this._options.idField];

    if (!!!id) {
      throw new Error('Id field is empty, cannot add to collection');
    }

    const item = this._items.get(id);

    if (item) {
      item.setDoc(doc, true);
    }
    else {
      this._setItem(this._instantiate(doc));
    }

  }

  private _removeItem(doc: T): void {
    log(`${this._options.type} _removeItem %o`, { doc });

    this._items.delete(doc[this._options.idField]);
  }

  private _id(item: T | U | string): string {

    // const typeOfU = (arg: T | U): arg is U => arg.hasOwnProperty('$doc');
    const typeOfU = (arg: T | U): arg is U => '$doc' in arg;
    const typeOfT = (arg: T | U): arg is T => !typeOfU(arg);

    const itemType = this._options.type;

    let id = null;

    if (typeof item === 'string') {
      id = item;
    }
    else if (typeOfU(item)) {
      id = item.$doc[this._options.idField];
    }
    else if (typeOfT(item)) {
      id = item[this._options.idField];
    }

    return `${itemType}::${id}`;
  }


}
