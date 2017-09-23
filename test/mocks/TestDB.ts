import { DB, Item, ItemModel } from '../../src';
import { TodoCollection } from './TodoCollection';
import { UserCollection } from './UserCollection';

/**
 * Test DB to test inheriting from DB class
 */
export class TestDB extends DB {

  constructor() {
    super();

    const todos = new TodoCollection(this);
    const users = new UserCollection(this);

    this._collections.set('todos', todos);
    this._collections.set('users', users);
  }
}
