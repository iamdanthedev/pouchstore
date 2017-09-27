import * as Ajv from 'ajv';

import { Collection } from './Collection';
import { Item, ItemModel } from './Item';
import { ItemDoc, OnBeforeRemove } from './types';
import { JsonSchema } from './JsonSchema';

export
interface CollectionOptions<T extends ItemModel, U extends Item<T>> {
  /**
   * Should attachments be loaded into items automatically
   * In this case all attachments will be 'local' by default
   * Otherwise on digest will be avaliable
   *
   * @danger May consumes a lot of extra memory!
   */
  loadAttachments?: boolean;

  /**
   * Model factory
   */
  factory: OptionFactory<T, U>;

  /**
   * Schema for items in this collection
   */
  schema: JsonSchema<T>;

  /**
   * Hook to be evaluated before a store item it removed
   */
  onBeforeRemove?: OnBeforeRemove<U>;
}

export type OptionLoadAttachments = boolean;

/**
 * Model factory
 */
export type OptionFactory<T extends ItemModel, U extends Item<T>> =
  (doc: ItemDoc<T>, collection: Collection<T, U>) => U;

