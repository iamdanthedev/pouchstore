/**
 * UserCollection
 */
import { Collection, DB } from '../../src';
import { IUser, User, userSchema } from './User';

export class UserCollection extends Collection<IUser, User> {

  constructor(db: DB) {
    super(
      {
        factory: (doc, collection) => new User(doc, collection),
        schema: userSchema,
      },
      db,
    );
  }
}
