/**
 * Misc utils
 */
import { ItemDoc, NewItemDoc } from './types';
import { ItemModel } from './Item';

export
function isNil(arg: any): arg is undefined | null {
    return typeof arg === 'undefined' || arg === 'null';
}

export
function isNewDocument<T extends ItemModel>(arg: ItemDoc<T>):arg is NewItemDoc<T> {
    return isNil(arg._rev);
}
