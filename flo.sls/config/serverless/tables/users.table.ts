import { AWSPartitial } from '../types';

export const TableConfig: AWSPartitial = {
  provider: {
    environment: {
      USERS_TABLE_NAME: '${self:custom.tablesNames.UsersTable.${self:provider.stage}}',
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
              'dynamodb:CreateTable',
              'dynamodb:UpdateTable',
            ],
            Resource: ['arn:aws:dynamodb:*:*:table/${file(env.yml):${self:provider.stage}.USERS_TABLE_NAME}'],
          },
        ],
      },
    },
  },
  resources: {
    Resources: {
      UserTable: {
        Type: 'AWS::DynamoDB::Table',
        DeletionPolicy: 'Retain',
        Properties: {
          AttributeDefinitions: [
            {
              AttributeName: 'UserEmail',
              AttributeType: 'S',
            },
          ],
          // ProvisionedThroughput: {
          //   ReadCapacityUnits: 4,
          //   WriteCapacityUnits: 2,
          // },
          KeySchema: [
            {
              AttributeName: 'UserEmail',
              KeyType: 'HASH',
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: '${self:custom.tablesNames.UsersTable.${self:provider.stage}}',
          StreamSpecification: {
            StreamViewType: 'NEW_AND_OLD_IMAGES',
          },
        },
      },
    },
  },
  custom: {
    tablesNames: {
      UsersTable: {
        local: '${self:service}-local-gallery',
        dev: '${self:service}-dev-gallery',
        test: '${self:service}-test-gallery',
        prod: '${self:service}-prod-gallery',
      },
    },
  },
};
