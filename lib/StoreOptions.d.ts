import { Store } from './Store';
import { ItemModel, Item } from './Item';
import { ItemDoc, OnBeforeRemove } from './types';
/**
 * Options which the PouchCollection constructor is supplied with
 */
export declare class StoreOptions<T extends ItemModel, U extends Item<T>, S extends Item<any> = U> implements IStoreOptions<T, U, S> {
    constructor(options: IStoreOptions<T, U, S>);
    /**
     * Should attachments be loaded into items automatically
     * In this case all attachments will be 'local' by default
     * Otherwise on digest will be avaliable
     *
     * @danger May consumes a lot of extra memory!
     */
    loadAttachments: OptionLoadAttachments;
    /** Every item created received a type property and id in the form of '{$type}::id' */
    type: OptionType;
    /** Model's primary key */
    idField: OptionIdField<T>;
    /** Model factory */
    factory: OptionFactory<T, U, S>;
    /** Default values for model properties */
    validator: OptionValidator<T>;
    /** Hook to be evaluated before a store item it removed */
    onBeforeRemove: OnBeforeRemove<S>;
}
export interface IStoreOptions<T extends ItemModel, U extends Item<T>, S extends Item<any> = U> {
    /**
     * Should attachments be loaded into items automatically
     * In this case all attachments will be 'local' by default
     * Otherwise on digest will be avaliable
     *
     * @danger May consumes a lot of extra memory!
     */
    loadAttachments?: OptionLoadAttachments;
    /** Every item created received a type property and id in the form of '{$type}::id' */
    type: OptionType;
    /** Model's primary key */
    idField: OptionIdField<T>;
    /** Model factory */
    factory: OptionFactory<T, U, S>;
    /** Default values for model properties */
    validator: OptionValidator<T>;
    /** Hook to be evaluated before a store item it removed */
    onBeforeRemove?: OnBeforeRemove<S>;
}
export declare type OptionLoadAttachments = boolean;
/** Every item created received a type property and id in the form of '{$type}::id' */
export declare type OptionType = string;
/** Model's primary key */
export declare type OptionIdField<T extends ItemModel> = keyof T;
/** Model factory */
export declare type OptionFactory<T extends ItemModel, U extends Item<T>, S extends Item<any> = U> = (doc: ItemDoc<T>, collection: Store<T, U, S>) => S;
/** Default values for model properties */
export declare type OptionValidator<T extends ItemModel> = (data: Partial<T>) => T;
