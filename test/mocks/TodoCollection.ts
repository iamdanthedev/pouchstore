/**
 * TodoCollection
 */
import * as Ajv from 'ajv';
import { Collection, DB } from '../../src';
import { ITodo, Todo, todoSchema, todoValidator } from './Todo';

const ajv = new Ajv({ useDefaults: true, allErrors: true });

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
