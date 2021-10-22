import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { getEnv } from '@helper/environment';

// export class DynamoClient {
//   private dynamodb: DynamoDBClient;
//
//   public getDynamoClient() {
//     if (!this.dynamodb) {
//       this.dynamodb = new DynamoDBClient({ region: getEnv('REGION') });
//     }
//
//     return this.dynamodb;
//   }
// }

const DynamoClient = new DynamoDBClient({ region: getEnv('REGION') });

export { DynamoClient };
