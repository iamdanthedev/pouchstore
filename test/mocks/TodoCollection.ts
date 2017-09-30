/**
 * TodoCollection
 */
import * as Ajv from 'ajv';
import { Collection, DB } from '../../src';
import { ITodo, Todo, todoSchema } from './Todo';

export class TodoCollection extends Collection<ITodo, Todo> {

  constructor(db: DB) {
    super(
      {
        factory: (doc, collection) => new Todo(doc, collection),
        schema: todoSchema,
      },
      db,
    );
  }
}
