/**
 * UserCollection
 */
import { Collection, DB } from '../../src';
import { IUser, User, userValidator } from './User';

export class UserCollection extends Collection<IUser, User> {

  constructor(db: DB) {
    super(
      {
        type: 'todo',
        validator: userValidator,
        factory: (doc, collection) => new User(doc, collection),
        idField: 'id',
      },
      db,
    );
  }
}
