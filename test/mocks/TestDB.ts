import { DB, Item, ItemModel } from '../../src';
import { TodoCollection } from './TodoCollection';
import { UserCollection } from './UserCollection';

/**
 * Test DB to test inheriting from DB class
 */
export class TestDB extends DB {

  public todos: TodoCollection;
  public users: UserCollection;

  protected _init(): void {

    this.todos = new TodoCollection(this);
    this.users = new UserCollection(this);

    this._collections.set('todos', this.todos);
    this._collections.set('users', this.users);
  }

}
