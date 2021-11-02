import { AWSPartitial } from '../types';

export const BucketConfig: AWSPartitial = {
  provider: {
    environment: {
      IMAGES_BUCKET_NAME: '${self:custom.bucketsNames.ImageBucket.${self:provider.stage}}',
    },
    iam: {
      role: {
        statements: [
          {
            Effect: 'Allow',
            Action: [
              's3:CreateBucket',
              's3:ListBuckets',
              's3:GetBucketCors',
              's3:GetBucket',
              's3:GetObject',
              's3:GetObjectAcl',
              's3:PutObject',
              's3:PutObjectAcl',
            ],
            Resource: [
              'arn:aws:s3:::${file(env.yml):${self:provider.stage}.IMAGES_BUCKET_NAME}',
              'arn:aws:s3:::${file(env.yml):${self:provider.stage}.IMAGES_BUCKET_NAME}/*',
            ],
          },
        ],
      },
    },
  },
  resources: {
    Resources: {
      imagesBucket: {
        Type: 'AWS::S3::Bucket',
        DeletionPolicy: 'Retain',
        Properties: {
          AccessControl: 'PublicReadWrite',
          BucketName: '${file(env.yml):${self:provider.stage}.IMAGES_BUCKET_NAME}',
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'HEAD', 'POST', 'DELETE'],
                AllowedOrigins: ['*'],
              },
            ],
          },
        },
      },
    },
  },
  custom: {
    bucketsNames: {
      ImageBucket: {
        local: '${self:service}-local-gallerys3',
        dev: '${self:service}-dev-gallerys3',
        test: '${self:service}-test-gallerys3',
        prod: '${self:service}-prod-gallerys3',
      },
    },
  },
};
