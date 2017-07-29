/// <reference types="pouchdb-core" />
/// <reference types="node" />
/**
 * Base Model for Objects
 * It puts the actual PouchDB document into a protected _doc property,
 * so that classes derived from **PouchBaseModel** can access the document
 * inside their getters
 */
import { ObservableMap } from 'mobx';
import { Store } from './Store';
import { Attachment, ItemDoc, NewItemDoc } from './types';
/**
 * Base models interface
 */
export interface ItemModel {
    type: string;
}
/**
 * Items that PouchStores consist of should be an object of or inherit Item
 *
 * It provides basic ways of working with Pouchstore items
 */
export declare class Item<T extends ItemModel, S = {}> {
    constructor(doc: ItemDoc<T>, collection: Store<T, Item<T>> & S);
    /**
     * Return a PouchDB collection this item belongs to
     * Set by the collection which creates an item
     */
    readonly $collection: Store<T, Item<T, {}>> & S;
    /**
     * Returns **a copy** of an underlying PouchDB doc
     */
    readonly $doc: NewItemDoc<T> | PouchDB.Core.ExistingDocument<T & {
        _attachments?: PouchDB.Core.Attachments | undefined;
    }>;
    /** If the item has been changed after load/last save */
    readonly isDirty: boolean;
    /** If the item has never been saved */
    readonly isNew: boolean;
    /** Get a property of the item */
    get<K extends keyof T>(property: K): T[K];
    /**
     * Updates the item's underlying PouchDB document
     * Changes are not saved
     * @use Item#save()
     */
    set<DOC extends ItemDoc<T>>(doc: DOC | Partial<DOC>, dontDirty?: boolean): this;
    /**
     * Updates one property of the item's underlying PouchDB document
     * Changes are not saved
     * @use Item#save()
     */
    set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(prop: K, value: DOC[K], dontDirty?: boolean): this;
    /** Save this item in the store. This will update the PouchDB database */
    save(): Promise<void>;
    /** Attaches a file to the document */
    attach(name: string, data: Blob | Buffer, contentType: string): void;
    /**
     * Removes attachment
     * This is the same as calling PouchStore#put(item)
     */
    detach(name: string): void;
    /**
   * Remove this item from the store.
   * This is the same as calling PouchStore#remove(item)
   */
    remove(): Promise<void>;
    /**
     * Checks if attachment exists
     * Return attachment digest (for mobx observers - to track changes)
     */
    hasAttachment(name: string): string | undefined;
    /**
     * Returns attachment by name.
     * Local loadAttachments will have data prop of type string | Blob | Buffer
     */
    getAttachment(name: string): Attachment | undefined;
    /** Returns true if attachment is stored on the model */
    isLocalAttachment(name: string): boolean | undefined;
    /** Loads attachment irrespectively of whether it is local or remote */
    loadAttachment(name: string): Promise<Attachment>;
    /**
     * Loads attachment and returns a WebAPI URL Object string
     *
     * **Important**: Don't forget to release the object created with URL.revokeObjectURL(str)
     */
    loadAttachmentAsURL(name: string, localOnly?: boolean): Promise<string | null>;
    /** Updates _attachmentMap */
    protected _updateAttachmentsMap(): void;
    /** Sets the whole underlying doc, some of its properties or a single property */
    protected _set<DOC extends ItemDoc<T>, K extends keyof ItemDoc<T>>(data: DOC | Partial<DOC>, dontDirty: boolean): this;
    protected _attachmentsMap: ObservableMap<PouchDB.Core.AttachmentResponse>;
    protected _collection: Store<T, Item<T>> & S;
    protected _doc: ItemDoc<T>;
    protected _protectedFields: Array<(keyof ItemDoc<T>) | 'id'>;
    private _dirty;
}
