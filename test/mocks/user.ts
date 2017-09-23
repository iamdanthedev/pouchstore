import { ItemModel } from '../../src';
import * as faker from 'faker';
import * as uuid from 'uuid';
import { Item } from '../../src/Item';
import { Todo } from './todo';
import { TodoCollection } from './db';

export interface IUser extends  ItemModel
{
  type: 'user';
  id: string;
  username: string;
  todos: string[];
}

export class User extends Item<IUser>
{
  get username(): string
  {
    return this._doc.username;
  }

  get todos(): Todo[]
  {
    const todos = this.$db.getCollection('todo') as TodoCollection;
    return todos.all.filter(todo => this._doc.todos.includes(todo.id));
  }

}

export function userValidator(data: Partial<IUser>): IUser
{
  return {
    type: 'user',
    id: data.id || uuid(),
    username: faker.helpers.userCard().username,
    todos: data.todos || [],
  }

}
