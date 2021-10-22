import { getEnv } from '@helper/environment';
import { log } from '@helper/logger';
import * as mongoose from 'mongoose';

let MongoConnect;

async function dbConnect() {
  console.log(MongoConnect);
  return new Promise((resolve, reject) => {
    if (MongoConnect) {
      console.log(3);
      resolve(MongoConnect);
    } else {
      console.log(2);
      mongoose.connect(getEnv('MONGODB'));
      MongoConnect = mongoose.connection;

      MongoConnect.on('error', (error) => {
        log(error);
        reject(error);
      });

      MongoConnect.on('open', () => {
        log('Connect to DB success.');
        resolve(MongoConnect);
      });
    }
  });
}

export { dbConnect };
