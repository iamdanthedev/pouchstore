/// <reference types="pouchdb-core" />
import { ItemModel } from './Item';
export declare type Attachment = PouchDB.Core.AttachmentResponse;
export declare type Attachments = PouchDB.Core.Attachments;
export declare type MapOf<T> = {
    [id: string]: T;
};
export declare type ItemDoc<T extends ItemModel> = (NewItemDoc<T> | ExistingItemDoc<T>);
export declare type NewItemDoc<T extends ItemModel> = PouchDB.Core.Document<WithAttachments<T>> & {
    _rev: undefined;
};
export declare type ExistingItemDoc<T extends ItemModel> = PouchDB.Core.ExistingDocument<WithAttachments<T>>;
export declare type WithAttachments<T> = T & {
    _attachments?: Attachments;
};
/**
 * onBeforeRemove callback
 *
 * @param {U} Item to be removed
 *
 * @returns {Array<TDocument<any>} Array of extra document to add to bulk_docs
 * @returns {false} To prevent the remove function from execution
 * @returns {void} To proceed the execution
 *
 */
export declare type OnBeforeRemove<U> = (item: U) => Promise<ItemDoc<any>[] | false | void>;
