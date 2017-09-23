import { DB, Item, ItemModel, Store } from '../../src';
import { ITodo, Todo, TodoValidator } from './todo';

export class TodoCollection extends Store<ITodo, Todo>
{

  constructor(db: DB)
  {
    super({
      type: 'todo',
      validator: TodoValidator,
      factory: (doc, collection) => new Todo(doc, collection),
      idField: 'id',
    }, db);
  }
}




class TestDB extends DB
{

}
