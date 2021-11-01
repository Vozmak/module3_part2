import {
  AttributeValue,
  GetItemCommand,
  GetItemInput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { getEnv } from '@helper/environment';
import { DynamoClient } from '@services/dynamoDBClient';
import { S3Service } from '@services/s3.service';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { Gallery } from './gallery.interface';

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

      if (!Images || Images.length === 0) {
        throw new HttpBadRequestError('User(s) upload 0 images');
      }

      if (limit === 0) {
        total = 1;
        images = Images.map((img) => img.Path);
      } else {
        total = Math.ceil(Images.length / limit);
        images = Images.slice((page - 1) * limit, page * limit).map((img) => img.Path);
      }

      if (page > total || page < 1) throw new HttpBadRequestError(`Page not found`);
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

      const updateAttributeValue = {
        M: {
          Path: { S: imagePutUrl.split('?', 1)[0] },
          Status: { S: 'OPEN' },
        },
      };
      await this.updateValueDB(userUploadEmail, updateAttributeValue);
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
    const { ContentLength, ContentType } = metadata;

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
    const imageIndex = Images.findIndex((image) => image.Path === imgGetURL && image.Status === 'OPEN');

    if (imageIndex === -1) {
      throw new HttpBadRequestError('Image data not found');
    }

    const updateAttributeValue = {
      M: {
        Path: { S: imgGetURL },
        Metadata: {
          S: JSON.stringify({
            ContentLength: ContentLength,
            ContentType: ContentType,
          }),
        },
        Status: { S: 'CLOSED' },
      },
    };
    await this.updateValueDB(userEmail, updateAttributeValue, imageIndex);

    return;
  }

  async updateValueDB(userEmail: string, attributeValue: AttributeValue, index?: number): Promise<void> {
    let paramsUser: UpdateItemCommandInput;
    let paramsAll: UpdateItemCommandInput | undefined;

    if (index) {
      paramsUser = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': attributeValue,
        },
        Key: {
          UserEmail: {
            S: userEmail,
          },
        },
        UpdateExpression: `SET #I[${index}] = :imgInfo`,
      };
      paramsAll = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': {
            L: [attributeValue],
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
    } else {
      paramsUser = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': {
            L: [attributeValue],
          },
          ':emptyList': {
            L: [],
          },
        },
        Key: {
          UserEmail: {
            S: userEmail,
          },
        },
        UpdateExpression: 'SET #I = list_append(if_not_exists(#I, :emptyList), :imgInfo)',
      };
    }

    try {
      const updateCommand = new UpdateItemCommand(paramsUser);
      await DynamoClient.send(updateCommand);
      if (paramsAll) {
        const updateCommandAll = new UpdateItemCommand(paramsAll);
        await DynamoClient.send(updateCommandAll);
      }
    } catch (err) {
      throw new HttpInternalServerError(err.message);
    }

    return;
  }
}
