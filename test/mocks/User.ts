/**
 * User Model
 */
import { ItemModel } from '../../src';
import * as faker from 'faker';
import * as uuid from 'uuid';
import { Item } from '../../src/Item';
import { ITodo, Todo } from './Todo';
import { TodoCollection } from './TodoCollection';
import { JsonSchema } from '../../src/JsonSchema';

export interface IUser extends  ItemModel {
  type: 'user';
  id: string;
  username: string;
  todos: string[];
}

export class User extends Item<IUser> {

  get username(): string {
    return this._doc.username;
  }

  get todos(): Todo[] {
    const todos = this.$db.getCollection('todos') as TodoCollection;

    if (!todos) {
      throw new Error('Collection "todos" does not exist');
    }

    return todos.all.filter(todo => this._doc.todos.includes(todo.id));
  }
}

export const userSchema: JsonSchema<IUser> = {
  $id: 'http://github.com/rasdaniil/pouchstore/schema/user.json#',
  type: 'object',
  required: ['type', 'id', 'username'],
  properties: {

    type: {
      type: 'string',
      const: 'user',
    },

    id: {
      type: 'string',
      format: 'uuid',
      primary: true,
    },

    username: {
      type: 'string',
      maxLength: 100,
    },

    todos: {
      type: 'array',
      default: [],
      items: {
        type: 'string',
        format: 'uuid',
      },
    }

  },
};


export function genUser(num: number, todos: ITodo[] = []): IUser[] {
  return [...Array(num).keys()].map(v => ({
      type: 'user',
      id: uuid(),
      username: faker.helpers.userCard().username,
      todos: todos.map(t => t.id)
    } as IUser)
  );
}
