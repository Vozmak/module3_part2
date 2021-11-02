import {
  PutItemCommand,
  PutItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ScanCommand,
  ScanCommandInput,
  ScanCommandOutput,
  UpdateItemCommand,
  UpdateItemCommandInput,
} from '@aws-sdk/client-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { HttpError } from '@errors/http/http-error';
import { getEnv } from '@helper/environment';
import { DynamoClient } from '@services/dynamoDBClient';
import { S3Service } from '@services/s3.service';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import * as crypto from 'crypto';
import { Gallery, UploadValues } from './gallery.interface';

export class GalleryService {
  async getImages(page: number, limit: number, filter: string): Promise<Gallery> {
    let images: Array<string | undefined>;
    let total: number;

    try {
      const { Items } = await this.getImagesFromDB(filter);
      if (!Items) {
        throw new HttpError(404, 'Not Found', 'User not found.');
      } else if (Items.length === 0) {
        throw new HttpBadRequestError('User(s) upload 0 images');
      }

      if (limit === 0) {
        total = 1;
        images = Items.map((img) => img.URL.S);
      } else {
        total = Math.ceil(Items.length / limit);
        images = Items.slice((page - 1) * limit, page * limit).map((img) => img.URL.S);
      }

      if (page > total || page < 1) throw new HttpBadRequestError(`Page not found`);
    } catch (e) {
      if (e instanceof HttpBadRequestError) throw new HttpBadRequestError(e.message);
      else if (e instanceof HttpError) throw new HttpError(e.statusCode, e.name, e.message);
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

      const putValues: UploadValues = {
        Path: imagePutUrl.split('?', 1)[0],
        Status: 'OPEN',
      };
      await this.updateValueDB(userUploadEmail, imageName, putValues);
    } catch (e) {
      if (e instanceof HttpBadRequestError) {
        throw new HttpBadRequestError(e.message);
      }

      throw new HttpInternalServerError(e.message);
    }

    return imagePutUrl;
  }

  async saveImgToDB(key: string, metadata: GetObjectOutput, S3: S3Service): Promise<void> {
    const [userEmail, imageName] = key.split('/', 2);
    const imgGetURL: string = S3.getPreSignedGetUrl(key, getEnv('IMAGES_BUCKET_NAME')).split('?', 1)[0];
    const { ContentLength, ContentType } = metadata;

    console.log(userEmail, imageName, imgGetURL);

    const params: QueryCommandInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      ExpressionAttributeNames: {
        '#IN': 'imageName',
        '#UD': 'UserData',
        '#UE': 'UserEmail',
        '#S': 'Status',
      },
      ExpressionAttributeValues: {
        ':userData': {
          S: 'Image_',
        },
        ':imageName': {
          S: imageName,
        },
        ':userEmail': {
          S: userEmail,
        },
        ':status': {
          S: 'OPEN',
        },
      },
      FilterExpression: '#IN = :imageName AND #S = :status',
      KeyConditionExpression: '#UE = :userEmail AND begins_with(#UD, :userData)',
    };
    const queryCommand = new QueryCommand(params);
    const { Items } = await DynamoClient.send(queryCommand);
    if (!Items) {
      throw new HttpError(404, 'Not Found', 'User not found.');
    } else if (Items.length === 0) {
      throw new HttpError(404, 'Not Found', 'Image not found.');
    }

    const updateValue: UploadValues = {
      Path: imgGetURL,
      Metadata: JSON.stringify({
        ContentLength: ContentLength,
        ContentType: ContentType,
      }),
      Status: 'CLOSED',
    };
    await this.updateValueDB(userEmail, imageName, updateValue, true);

    return;
  }

  async updateValueDB(userEmail: string, imageName: string, values: UploadValues, exists = false): Promise<void> {
    // let paramsAll: UpdateItemCommandInput | undefined;

    try {
      console.log(1);
      const imgHash = crypto.createHash('sha1').update(imageName).digest('hex');
      console.log(imgHash);
      if (exists) {
        const paramsUser: UpdateItemCommandInput = {
          TableName: getEnv('USERS_TABLE_NAME'),
          ExpressionAttributeNames: {
            '#S': 'Status',
            '#M': 'Metadata',
          },
          ExpressionAttributeValues: {
            ':status': {
              S: values.Status,
            },
            ':metadata': {
              S: values.Metadata || JSON.stringify({ message: 'Metadata not found' }),
            },
          },
          Key: {
            UserEmail: {
              S: userEmail,
            },
            UserData: {
              S: `Image_${imgHash}`,
            },
          },
          UpdateExpression: `SET #S = :status, #M = :metadata`,
        };
        const updateCommand = new UpdateItemCommand(paramsUser);
        await DynamoClient.send(updateCommand);
        // paramsAll = {
        //   TableName: getEnv('USERS_TABLE_NAME'),
        //   ExpressionAttributeNames: {
        //     '#I': 'Images',
        //   },
        //   ExpressionAttributeValues: {
        //     ':imgInfo': {
        //       L: [putValues],
        //     },
        //     ':emptyList': {
        //       L: [],
        //     },
        //   },
        //   Key: {
        //     UserEmail: {
        //       S: 'all',
        //     },
        //   },
        //   UpdateExpression: 'SET #I = list_append(if_not_exists(#I, :emptyList), :imgInfo)',
        // };
      } else {
        const paramsUser: PutItemCommandInput = {
          TableName: getEnv('USERS_TABLE_NAME'),
          Item: {
            UserEmail: {
              S: userEmail,
            },
            UserData: {
              S: `Image_${imgHash}`,
            },
            imageName: {
              S: imageName,
            },
            URL: {
              S: values.Path,
            },
            Status: {
              S: values.Status,
            },
          },
        };
        const PutCommand = new PutItemCommand(paramsUser);
        await DynamoClient.send(PutCommand);
      }
    } catch (err) {
      throw new HttpInternalServerError(err.message);
    }

    return;
  }

  async getImagesFromDB(filter: string): Promise<ScanCommandOutput | QueryCommandOutput> {
    let dynamoCommand: ScanCommand | QueryCommand;

    if (filter.toLowerCase() === 'all') {
      const params: ScanCommandInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ProjectionExpression: '#URL',
        ExpressionAttributeNames: {
          '#UD': 'UserData',
          '#S': 'Status',
          '#URL': 'URL',
        },
        ExpressionAttributeValues: {
          ':userData': {
            S: 'Image_',
          },
          ':status': {
            S: 'CLOSED',
          },
        },
        FilterExpression: 'begins_with(#UD, :userData) AND #S = :status',
      };

      dynamoCommand = new ScanCommand(params);
    } else {
      const params: QueryCommandInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ProjectionExpression: '#URL',
        ExpressionAttributeNames: {
          '#UE': 'UserEmail',
          '#UD': 'UserData',
          '#S': 'Status',
          '#URL': 'URL',
        },
        ExpressionAttributeValues: {
          ':userEmail': {
            S: filter,
          },
          ':userData': {
            S: 'Image_',
          },
          ':status': {
            S: 'CLOSED',
          },
        },
        KeyConditionExpression: '#UE = :userEmail AND begins_with ( #UD, :userData )',
        FilterExpression: '#S = :status',
      };

      dynamoCommand = new QueryCommand(params);
    }
    return await DynamoClient.send(dynamoCommand);
  }
}
