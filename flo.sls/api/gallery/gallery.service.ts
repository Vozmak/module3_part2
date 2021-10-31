import { GetItemCommand, GetItemInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { getEnv } from '@helper/environment';
import { DynamoClient } from '@services/dynamoDBClient';
import { S3Service } from '@services/s3.service';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { Gallery } from './gallery.interface';
import * as sharp from 'sharp';

export class GalleryService {
  async getImages(page: number, limit: number, filter: string): Promise<Gallery> {
    let images: Array<string | undefined>;
    let total: number;
    try {
      const params: GetItemInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        Key: {
          UserEmail: {
            S: filter,
          },
        },
        ProjectionExpression: 'Images',
      };

      const GetItem = new GetItemCommand(params);
      const { Item } = await DynamoClient.send(GetItem);
      if (!Item) {
        throw new HttpBadRequestError('User not found.');
      }

      const { Images } = unmarshall(Item);

      if (Images.length === 0) {
        throw new HttpBadRequestError('Пользователь загрузил 0 картинок');
      }

      if (limit === 0) {
        total = 1;
        images = Images.map((img) => img.Path);
      } else {
        total = Math.ceil(Images.length / limit);
        images = Images.slice((page - 1) * limit, page * limit).map((img) => img.Path);
      }

      if (page > total || page < 1) throw new HttpBadRequestError(`Страница не найдена`);
    } catch (e) {
      if (e instanceof HttpBadRequestError) throw new HttpBadRequestError(e.message);
      throw new HttpInternalServerError(e.message);
    }

    return {
      objects: images,
      page: page,
      total: total,
    };
  }

  async getPreSignedPutUrl(imageName: string, userUploadEmail: string): Promise<string> {
    let imagePutUrl: string;
    try {
      const S3 = new S3Service();
      const key = `${userUploadEmail}/${imageName}`;

      imagePutUrl = S3.getPreSignedPutUrl(key, getEnv('IMAGES_BUCKET_NAME'));

      const paramsUser: UpdateItemCommandInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': {
            L: [
              {
                M: {
                  Path: {
                    S: imagePutUrl.split('?', 1)[0],
                  },
                  Status: {
                    S: 'OPEN',
                  },
                },
              },
            ],
          },
          ':emptyList': {
            L: [],
          },
        },
        Key: {
          UserEmail: {
            S: userUploadEmail,
          },
        },
        UpdateExpression: 'SET #I = list_append(if_not_exists(#I, :emptyList), :imgInfo)',
      };
      const paramsAll: UpdateItemCommandInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': {
            L: [
              {
                M: {
                  Path: {
                    S: imagePutUrl.split('?', 1)[0],
                  },
                  Status: {
                    S: 'OPEN',
                  },
                },
              },
            ],
          },
          ':emptyList': {
            L: [],
          },
        },
        Key: {
          UserEmail: {
            S: 'all',
          },
        },
        UpdateExpression: 'SET #I = list_append(if_not_exists(#I, :emptyList), :imgInfo)',
      };

      const UpdateItemUser = new UpdateItemCommand(paramsUser);
      const UpdateItemAll = new UpdateItemCommand(paramsAll);

      await DynamoClient.send(UpdateItemUser);
      await DynamoClient.send(UpdateItemAll);
    } catch (e) {
      if (e instanceof HttpBadRequestError) {
        throw new HttpBadRequestError(e.message);
      }

      throw new HttpInternalServerError(e.message);
    }

    return imagePutUrl;
  }

  async saveImgToDB(key: string, metadata: GetObjectOutput, S3: S3Service): Promise<void> {
    const userEmail = key.split('/', 1)[0];
    const imgGetURL: string = S3.getPreSignedGetUrl(key, getEnv('IMAGES_BUCKET_NAME')).split('?', 1)[0];

    const params: GetItemInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      Key: {
        UserEmail: {
          S: userEmail,
        },
      },
      ProjectionExpression: 'Images',
    };
    const getItemCommand = new GetItemCommand(params);
    const { Item } = await DynamoClient.send(getItemCommand);
    if (!Item) {
      throw new HttpBadRequestError('User not found.');
    }

    const { Images } = unmarshall(Item);
    const imageIndex = Images.findIndex((path) => path.Path === imgGetURL);

    const paramsUser: UpdateItemCommandInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      ExpressionAttributeNames: {
        '#I': 'Images',
      },
      ExpressionAttributeValues: {
        ':imgInfo': {
          M: {
            Path: {
              S: imgGetURL,
            },
            Metadata: {
              S: 'JSON.stringify(metadata)',
            },
            Status: {
              S: 'CLOSED',
            },
          },
        },
      },
      Key: {
        UserEmail: {
          S: userEmail,
        },
      },
      UpdateExpression: `SET #I[${imageIndex}] = :imgInfo`,
    };
    const paramsAll: UpdateItemCommandInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      ExpressionAttributeNames: {
        '#I': 'Images',
      },
      ExpressionAttributeValues: {
        ':imgInfo': {
          L: [
            {
              M: {
                Path: {
                  S: imgGetURL,
                },
                Metadata: {
                  S: 'JSON.stringify(metadata)',
                },
                Status: {
                  S: 'CLOSED',
                },
              },
            },
          ],
        },
        ':emptyList': {
          L: [],
        },
      },
      Key: {
        UserEmail: {
          S: 'all',
        },
      },
      UpdateExpression: `SET #I[${imageIndex}] = :imgInfo`,
    };

    const UpdateItemUser = new UpdateItemCommand(paramsUser);
    const UpdateItemAll = new UpdateItemCommand(paramsAll);

    await DynamoClient.send(UpdateItemUser);
    await DynamoClient.send(UpdateItemAll);

    return;
  }
}
