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
function isNewDocument<T extends ItemModel>(arg: ItemDoc<T>): arg is NewItemDoc<T> {
    return isNil(arg._rev);
}

/**
 * Removes trailing and ending dots from the string
 * @copyright https://github.com/pubkey/rxdb/blob/master/src/util.js
 * @param  {string} str
 * @return {string} str without wrapping dots
 */
export function trimDots(str: string) {
    // start
    while (str.charAt(0) == '.')
        str = str.substr(1);

    // end
    while (str.slice(-1) == '.')
        str = str.slice(0, -1);

    return str;
}
