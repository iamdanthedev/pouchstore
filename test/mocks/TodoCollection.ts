/**
 * TodoCollection
 */
import { Collection, DB } from '../../src';
import { ITodo, Todo, todoValidator } from './Todo';

export class TodoCollection extends Collection<ITodo, Todo> {

  constructor(db: DB) {
    super(
      {
        type: 'todo',
        validator: todoValidator,
        factory: (doc, collection) => new Todo(doc, collection),
        idField: 'id',
      },
      db,
    );
  }
}
