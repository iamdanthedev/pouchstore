import * as PouchDB from 'pouchdb';
import * as Ajv from 'ajv';
import { Collection } from './Collection';
import { Item, ItemModel } from './Item';
import { CollectionOptions } from './CollectionOptions';

/**
 * Encapsulated PouchDB database and creates collections
 */
export class DB {

  protected _db: PouchDB.Database;

  protected _ajv: Ajv.Ajv;

  // otherwise we have typechecking problems with DB._collections
  // tslint:disable-next-line
  protected _collections: Map<string, Collection<ItemModel, Item<any>>> = new Map();

  constructor(name?: string, options?: PouchDB.Configuration.DatabaseConfiguration) {
    this._db = new PouchDB(name, options);

    if (!this._db) {
      throw new Error('Cannot create pouchdb database');
    }

    this._ajv = new Ajv({});

    this._init();
  }

  public static PLUGIN(plugin: PouchDB.Plugin): void {
    PouchDB.plugin(plugin);
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
   * AJV instance for this db
   * @returns {ajv.Ajv}
   */
  get $ajv(): Ajv.Ajv {
    return this._ajv;
  }

  /**
   * Creates a new collections
   * @param {string} name
   * @param {ICollectionOptions<T extends ItemModel, U extends Item<T>>} options
   * @returns {Collection<ItemModel, Item<T>, DB>}
   */
  public createCollection<T extends ItemModel, U extends Item<T>>(
    name: string,
    options: CollectionOptions<T, U>
  ): Collection<T, U, this> {

    if (this._collections.has(name)) {
      throw new Error('Collection with this name already exists');
    }

    const collection = new Collection(options, this);

    this._collections.set(name, collection);

    return collection;
  }

  /**
   * Returns existing collections by name or null if it doesn't exist
   * @param {string} name
   * @returns {undefined | Collection<ItemModel, Item<ItemModel>>}
   */
  public getCollection(name: string): Collection<ItemModel, Item<ItemModel>> | undefined {
    return this._collections.get(name);
  }

  // public removeCollection(removeFromDB: boolean = false): void {
  //   // console.log('not implemented');
  /**
   * Makes all collections to fetch initial data and subscribe to changes feed
   * Collections are cleared initially
   */
  public subscribeCollections(): Promise<void> {
    const promises: Promise<void>[] = [];
    this._collections.forEach(collection => promises.push(collection.subscribe()));

    return Promise.all(promises)
      .then(() => Promise.resolve())
      .catch(e => Promise.reject(e));
  }

  /**
   * Clears collections and stops changes subscription
   */
  public unsubscribeCollections(): Promise<void> {
    const promises: Promise<void>[] = [];
    this._collections.forEach(collection => promises.push(collection.unsubscribe()));

    return Promise.all(promises)
      .then(() => Promise.resolve())
      .catch(e => Promise.reject(e));
  }

  // }
  /**
   * Removes existing collection
   * @param {boolean} removeFromDB If true removes items from pouchdb (dangerous)
   * @todo not implemented
   */

  // tslint:disable-next-line
  protected _init(): void { }

}
