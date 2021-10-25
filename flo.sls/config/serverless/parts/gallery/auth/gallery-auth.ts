import { AWSPartitial } from '../../../types';

export const authConfig: AWSPartitial = {
  provider: {
    environment: {
      JOBS_TABLE_NAME: '${self:custom.tablesNames.JobsTable.${self:provider.stage}}',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:DescribeTable',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:DeleteItem',
              'dynamodb:UpdateItem',
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem',
            ],
            Resource: [
              'arn:aws:dynamodb:*:*:table/${file(env.yml):${self:provider.stage}.JOBS_TABLE}',
              'arn:aws:dynamodb:*:*:table/${file(env.yml):${self:provider.stage}.JOBS_TABLE}/index/*',
            ],
          },
        ],
      },
    },
  },
  // resources: {
  //   Resources: {
  //     usersTable: {
  //       Type: 'AWS::DynamoDB::Table',
  //       DeletionPolicy: 'Retain',
  //       Properties: {
  //         AttributeDefinitions: [
  //           {
  //             AttributeName: 'UserEmail',
  //             AttributeType: 'S',
  //           },
  //           {
  //             AttributeName: 'Password',
  //             AttributeType: 'S',
  //           },
  //           {
  //             AttributeName: 'Images',
  //             AttributeType: 'L',
  //           },
  //         ],
  //         ProvisionedThroughput: {
  //           ReadCapacityUnits: 4,
  //           WriteCapacityUnits: 2,
  //         },
  //         KeySchema: [
  //           {
  //             AttributeName: 'UserEmail',
  //             KeyType: 'HASH',
  //           },
  //         ],
  //         BillingMode: 'PAY_PER_REQUEST',
  //         TableName: '${self:custom.tablesNames.JobsTable.${self:provider.stage}}',
  //         StreamSpecification: {
  //           StreamViewType: 'NEW_AND_OLD_IMAGES',
  //         },
  //       },
  //     },
  //   },
  // },
  custom: {
    tablesNames: {
      JobsTable: {
        local: 'GalleryM3P2',
        dev: 'GalleryM3P2',
        test: 'Jobs-test',
        prod: 'Jobs',
      },
    },
  },
  functions: {
    signUp: {
      handler: 'api/gallery/auth/handler.signUp',
      memorySize: 128,
      events: [
        {
          http: {
            path: '/signup',
            method: 'post',
            integration: 'lambda',
            cors: true,
            response: {
              headers: {
                'Access-Control-Allow-Origin': "'*'",
                'Content-Type': "'application/json'",
              },
              template: "$input.json('$')",
            },
          },
        },
      ],
    },
    login: {
      handler: 'api/gallery/auth/handler.login',
      memorySize: 128,
      events: [
        {
          http: {
            path: '/login',
            method: 'post',
            integration: 'lambda',
            cors: true,
            response: {
              headers: {
                'Access-Control-Allow-Origin': "'*'",
                'Content-Type': "'application/json'",
              },
              template: "$input.json('$')",
            },
          },
        },
      ],
    },
  },
};
