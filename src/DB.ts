import * as PouchDB from 'pouchdb';
import { Store } from './Store';
import { Item, ItemModel } from './Item';
import { IStoreOptions } from './StoreOptions';

export class DB {

  protected _db: PouchDB.Database;

  protected _collections = new Map<string, Store<any, Item<any>>>();

  static PLUGIN(plugin: PouchDB.Plugin)
  {
    PouchDB.plugin(plugin);
  }

  constructor(name?: string, options?: PouchDB.Configuration.DatabaseConfiguration)
  {
    this._db = new PouchDB(name, options);

    if (!this._db)
    {
      throw new Error('Cannot create pouchdb database');
    }
  }

  /**
   * Returns pouchdb instance
   * @returns {PouchDB.Database}
   */
  get $pouchdb(): PouchDB.Database
  {
    return this._db;
  }

  /**
   * Creates a new collections
   * @param {string} name
   * @param {IStoreOptions<T extends ItemModel, U extends Item<T>, S extends Item<any>>} options
   * @returns {Store<ItemModel, Item<T>, U>}
   */
  createCollection<T extends ItemModel, U extends Item<T>, S extends Item<any> = U>(
    name: string,
    options: IStoreOptions<T, U, S>
  )
  {
    if (this._collections.has(name))
      throw new Error('Collection with this name already exists');

    const collection = new Store(options, this);

    this._collections.set(name, collection);

    return collection;
  }

  /**
   * Returns existing collections by name or null if it doesn't exist
   * @param {string} name
   * @returns {T}
   */
  getCollection<T extends Store<any, Item<any>>>(name: string): T | null
  {
    if (this._collections.has(name))
      return this._collections.get(name) as T;

    return null;
  }

  /**
   * Removes existing collection
   * @param {boolean} removeFromDB If true removes items from pouchdb (dangerous)
   * @todo not implemented
   */
  removeCollection(removeFromDB: boolean = false)
  {
    console.log('not implemented');
  }

  /**
   * Makes all collections to fetch initial data and subscribe to changes feed
   * Collections are cleared initially
   */
  subscribeCollections(): Promise<void>
  {
    const promises: Promise<any>[] = [];
    this._collections.forEach(collection => promises.push(collection.subscribe()));

    return Promise.all(promises)
      .then(() => Promise.resolve())
      .catch(e => Promise.reject(e));
  }

  /**
   * Clears collections and stops changes subscription
   */
  unsubscribeCollections(): Promise<void>
  {
    const promises: Promise<any>[] = [];
    this._collections.forEach(collection => promises.push(collection.unsubscribe()));

    return Promise.all(promises)
      .then(() => Promise.resolve())
      .catch(e => Promise.reject(e));
  }

}
