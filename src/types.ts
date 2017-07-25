import { ItemModel } from './Item'

export type Attachment = PouchDB.Core.AttachmentResponse

export type Attachments = PouchDB.Core.Attachments

export type MapOf<T> = {
  [id: string]: T,
}

export
  type ItemDoc<T extends ItemModel> =
  (NewItemDoc<T> | ExistingItemDoc<T>)

export
  type NewItemDoc<T extends ItemModel> =
  PouchDB.Core.Document<WithAttachments<T>> & { _rev: undefined }

export
  type ExistingItemDoc<T extends ItemModel> =
  PouchDB.Core.ExistingDocument<WithAttachments<T>>

export
  type WithAttachments<T> = T & { _attachments?: Attachments }


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
export
  type OnBeforeRemove<U> = (item: U) => Promise<ItemDoc<any>[] | false | void>



