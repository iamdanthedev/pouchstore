import * as debug from 'debug';
import * as Ajv from 'ajv';
import { DB } from './DB';
import { Item, ItemModel } from './Item';
import { CollectionOptions } from './CollectionOptions';
import { ExistingItemDoc, ItemDoc, MapOf, NewItemDoc } from './types';
import { Schema } from './Schema';
import { ValidationError } from './ValidationError';
import clone = require('lodash.clonedeep');
import uuid = require('uuid');

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

  protected _schema: Schema<T>;

  protected _lastErrors: Ajv.ErrorObject[];

  private _changes: PouchDB.Core.Changes<T>;

  private _subscribed: boolean = false;

  private _items: Map<string, U> = new Map<string, U>();

  private _log: debug.IDebugger;


  /**
   * Creates new PouchStore
   * It does not subscribe/attach it to any PouchDB database automatically
   * @see PouchStore#subsribe() Use subsribe to do so
   */
  constructor(options: CollectionOptions<T, U>, db: D) {

    this._options = clone(options);
    this._db = db;
    this._schema = new Schema(db, this._options.schema);
    this._log = debug(`pouchstore ${this._schema.type}`);


    this._log('constructor() %o', { options: this._options });
  }

  /**
   * Pouchstore DB the collection belongs to
   * @returns {DB}
   */
  get $db(): D {
    return this._db;
  }


  get indexes(): string[] {
    return this._schema.indexes;
  }

  /**
   * Last validation errors
   *
   * @returns {ajv.ErrorObject[]}
   */
  get lastErrors(): Ajv.ErrorObject[] {
    return this._lastErrors;
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
   * Returns collection's size
   *
   * @returns {number}
   */
  get size(): number {
    return this._items.size;
  }

  /**
   * Returns array of all documents sorted by ids
   */
  get all(): U[] {
    if (!this._subscribed) {
      this._log('attempt to access unsubscribed collection items');
    }

    return Array.from(this._items).map(([key, value]) => value);
  }

  /**
   * Returns a map of all documents
   */
  get allMap(): MapOf<U> {
    const result: MapOf<U> = {};
    this.all.forEach(item => result[item.$doc[this._schema.primaryField]] = item);

    return result;
  }

  /**
   * Get item by id or index
   */
  public getItem(id: string): U | undefined {
    if (!this._subscribed) {
      this._log('error: attempt to access unsubscribed collection items');
    }

    if (id.match(`^${this._schema.type}::`)) {
      id = id.split('::')[1];
    }

    if (!!id) {
      return this._items.get(id);
    }
  }

  /**
   * Conducts a search query
   * @todo should return U[]
   *
   * @param {PouchDB.Find.FindRequest<T extends ItemModel>} req
   * @returns {Promise<ItemDoc<T extends ItemModel>[]>}
   */
  public async find(req: PouchDB.Find.FindRequest<T>): Promise<U[]> {
    try {
      const request: PouchDB.Find.FindRequest<T> = {
        selector: {
          $and: [
            { type: this._schema.type }
          ]
        },
        sort: req.sort,
        limit: req.limit,
      };

      if (req.selector && request.selector && request.selector.$and) {
        request.selector.$and.push(req.selector);
      }

      const response = await this.$db.$pouchdb.find(request) as PouchDB.Find.FindResponse<T> & { warning?: string };

      return response.docs.map(doc => this.getItem(doc._id)).filter(u => u !== undefined) as U[];
    }
    catch (e) {
      return Promise.reject(e);
    }
  }

  /**
   * Creates a new object
   * Return a new item or undefined if data validation fails
   * Validation errors are put into Collection.lastErrors
   * It does not put it into the collection
   *
   * @see Item#save()
   * @see Collection#lastErrors
   * @param data
   * @return {U}
   * @throws {ValidationError}
   */
  public create(data: Partial<T>): U {
    this._log('create() %o', { data });

    const defaults = this._schema.defaults;
    const item: Partial<T> = Object.assign({}, defaults, data);

    // set id if missing
    if (!item[this._schema.primaryField]) {
      item[this._schema.primaryField] = uuid();
    }

    const _id = this._id(item[this._schema.primaryField] as string);

    if (this._schema.validateDoc(item)) {
      const doc: NewItemDoc<T> = Object.assign({}, item, {
        _id,
        _rev: undefined,
      });

      return this._instantiate(doc);
    }
    else {
      // HACK: this never happens
      return {} as any as U; // tslint:disable-line
    }
  }

  /**
   * Creates a set of documents in one go
   *
   * @param {Partial<T extends ItemModel>[]} data
   * @param {boolean} saveItems Should items be saved (Item#save()) or just created
   * @returns {U[]}
   * @throws {ValidationError}
   */
  public async bulkCreate(data: Partial<T>[], saveItems: boolean = false): Promise<U[]> {
    this._log('bulkCreate() %o', { data, saveItems });

    const items: U[] =  data.map(itemData => this.create(itemData));

    if (saveItems) {
      for (const item of items) {
        await item.save();
      }
    }

    return items;
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
    this._log('update() %o', { item });

    if (!this._db) {
      return Promise.reject('DB is not defined');
    }

    const db = this._db.$pouchdb as PouchDB.Database<T>;
    const doc = item.$doc;
    const id = doc[this._schema.primaryField];
    const _id = this._id(id);

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
    this._log('remove() %o', { item: arg });

    const item = typeof arg === 'string' ? this.getItem(arg) : arg;

    if (!item) {
      return Promise.reject('Cannot getItem item');
    }

    if (!item.$doc._rev) {
      return Promise.reject('Cannot remove an unsaved item');
    }

    const id = item.$doc[this._schema.primaryField];
    const _id = this._id(id);
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
    this._log('_fetchAll()');

    const db = this._db.$pouchdb as PouchDB.Database<T>;

    if (!db) {
      return Promise.reject('Collection is not attached to PouchDB');
    }

    const type = this._schema.type;

    const options = {
      include_docs: true,
      attachments: this._options.loadAttachments,
      binary: true,
      startkey: type,
      endkey: `${type}::\uffff`,
    };

    return db.allDocs(options)
      .then(result => {
        result.rows.forEach(row => this._addDoc(row.doc as ExistingItemDoc<T>));

        return Promise.resolve();
      })
      .catch(err => Promise.reject(err));
  }

  private _subscribeToChanges(): Promise<void> {
    this._log('_subscribeToChanges()');

    const db = this._db.$pouchdb as PouchDB.Database<T>;

    if (!db) {
      return Promise.reject('Collection is not attached to PouchDB');
    }

    const type = this._schema.type;

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
        type,
      },
    })
      .on('change', info => {

        this._log('change info', info);

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
    log('_instantiate() %o', { doc });

    const { factory } = this._options;

    return factory(doc, this);
  }


  private _setItem(item: U): void {
    const id = item.$doc[this._schema.primaryField];

    // TODO: validate

    if (!!!id) {
      throw new Error(`${this._schema.type} Id field is empty, cannot add to collection`);
    }

    this._items.set(id, item);
  }

  private _addDoc(doc: ExistingItemDoc<T>): void {
    this._log('_setItem() %o', { doc });

    const id = doc[this._schema.primaryField];

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
    this._log('_removeItem %o', { doc });
    this._items.delete(doc[this._schema.primaryField]);
  }

  private _id(id: string): string {
    return `${this._schema.type}::${id}`;
  }
}
