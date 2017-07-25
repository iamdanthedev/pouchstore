export
function isNil(arg: any): arg is undefined | null {
    return typeof arg === 'undefined' || arg === 'null'
}

export
function isNewDocument<T extends PouchstoreModel>(
    arg: TDocument<T>,
):arg is TNewDocument<T> {
    return isNil(arg._rev)
}
