/// <reference types="pouchdb-core" />
/// <reference types="pouchdb-mapreduce" />
/// <reference types="pouchdb-replication" />
/// <reference types="node" />
import { StoreOptions, IStoreOptions } from './StoreOptions';
import { Item, ItemModel } from './Item';
import { MapOf, ExistingItemDoc } from './types';
/**
 * Creates a new PouchDB-MobX-driven collection.
 * Supports extending
 * @template T Incoming items data model interface
 * @template U Result of transforming incoming model (what we actually store on the colleciton)
 *             U can equal T if we, for example, don't provide neither options.classModel
 *             nor options.classFactory
 */
export declare class Store<T extends ItemModel, U extends Item<T>> {
    /**
     * Creates new PouchStore
     * It does not subsribe/attach it to any PouchDB database automatically
     * @see PouchStore#subsribe() Use subsribe to do so
     */
    constructor(options: IStoreOptions<T, U> | StoreOptions<T, U>);
    /**
     * Subscribe to pouchdb and start listening to changes feed
     */
    subscribe(db: PouchDB.Database<any>): Promise<void>;
    /**
     * Unsubscribe from pouchdb & stop listening
     */
    unsubscribe(): Promise<void>;
    /**
     * Returns array of all documents sorted by ids
     */
    readonly all: U[];
    /**
     * Returns a map of all documents
     */
    readonly allMap: MapOf<U>;
    /** Get item by id or index */
    get(arg: string | number): U | undefined;
    /**
     * Creates a new object
     * It does not include it into the store
     *
     * @see Item#save()
     */
    create(data: Partial<T>): U;
    /** Load attachment by name */
    loadAttachment(itemId: string, name: string): Promise<Blob | Buffer>;
    /**
     * Puts an object to the underlying db
     *
     * @todo Actually, it is, probably, not supposed to be in a public interface
     */
    put(item: U): Promise<ExistingItemDoc<T>>;
    /** Puts an attachment to the database */
    putAttachment(itemId: string, name: string, file: Blob | Buffer, contentType: string): Promise<void>;
    /**
     * Remove item from the store
     * It will be saved with { _deleted: true } in PouchDB
     */
    remove(item: U): Promise<any>;
    remove(itemId: string): Promise<any>;
    private _fetchAll();
    private _subscribeToChanges();
    /** Instantiates a new object depending in modelClass and modelFactory options */
    private _instantiate(doc);
    private _setItem(item);
    private _addDoc(doc);
    private _removeItem(doc);
    private _id(item);
    protected _options: StoreOptions<T, U>;
    protected _db: PouchDB.Database<T> | null;
    private _changes;
    private _subscribed;
    /** Collection of items */
    private _items;
}
