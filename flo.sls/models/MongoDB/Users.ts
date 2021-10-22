interface User {
  email: string;
  password: string;
}

import { getEnv } from '@helper/environment';
import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

const UserScheme = new mongoose.Schema<User>({
  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },
});

UserScheme.pre('save', async function () {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  // const user = this;
  this.password = await bcrypt.hash(this.password, Number(getEnv('SALTROUNDS', true)));
});

UserScheme.methods.isValidPassword = async function (password: string) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const user = this;
  return await bcrypt.compare(password, user.password);
};

const Users = mongoose.models.Users || mongoose.model('Users', UserScheme, 'Users');

export { Users };
