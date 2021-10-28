import { GetItemCommand, GetItemInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { AttributeValue } from '@aws-sdk/client-dynamodb/dist-types/ts3.4';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { getEnv } from '@helper/environment';
import { DynamoClient } from '@services/dynamoDBClient';
import { S3Service } from '@services/s3.service';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { MultipartFile, MultipartRequest } from 'lambda-multipart-parser';
import { Gallery, ResponseSuccess } from './gallery.interface';
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
      const imgURLs: AttributeValue | undefined = (await DynamoClient.send(GetItem)).Item?.Images;

      if (!imgURLs) {
        throw new HttpBadRequestError('Пользователь загрузил 0 картинок');
      }

      if (limit === 0) {
        total = 1;
        images = imgURLs.L!.map((img) => img.M!.Path.S);
      } else {
        total = Math.ceil(imgURLs.L!.length / limit);
        images = imgURLs!.L!.slice((page - 1) * limit, page * limit).map((img) => img.M!.Path.S);
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

  async uploadImages(images: MultipartRequest, userUploadId: string): Promise<ResponseSuccess> {
    let uploadImages: Array<string>;
    try {
      uploadImages = await this.saveImages(images, userUploadId);
    } catch (e) {
      if (e instanceof HttpBadRequestError) {
        throw new HttpBadRequestError(e.message);
      }

      throw new HttpInternalServerError(e.message);
    }

    return {
      statusCode: 200,
      body: `Загружены следующие изображения:\n${uploadImages.join('\n')}`,
    };
  }

  async saveImages(files: MultipartRequest, userUploadEmail: string): Promise<Array<string>> {
    const filesArray: Array<MultipartFile> = files.files;
    const uploadImages: Array<string> = [];
    const uploadURL: Array<{ Path: AttributeValue; Metadata: AttributeValue }> = [];

    try {
      const S3 = new S3Service();

      for (const img of filesArray) {
        const metadata = img.contentType; //await sharp(img.content).metadata();
        const user: string = userUploadEmail.replace(/@.+/, '');
        const key = `${user}/${img.filename}`;

        const findImage: GetObjectOutput | null = await S3.get(key, getEnv('IMAGES_BUCKET_NAME'))
          .then((res) => res)
          .catch((e) => {
            if (e.code !== 'NoSuchKey') throw e;
            return null;
          });

        if (findImage) {
          continue;
        }

        await S3.put(key, img.content, getEnv('IMAGES_BUCKET_NAME'), img.contentType);
        const imageURL: string = S3.getPreSignedGetUrl(key, getEnv('IMAGES_BUCKET_NAME')).split('?', 1)[0];

        uploadImages.push(img.filename);
        uploadURL.push({ Path: { S: imageURL }, Metadata: { S: JSON.stringify(metadata) } });
      }

      if (uploadURL.length === 0) {
        throw new HttpBadRequestError('Нет изображений для загрузки, либо изображение уже существует.');
      }

      const paramsUser: UpdateItemCommandInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':imgInfo': {
            L: [
              {
                M: uploadURL[0],
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
                M: uploadURL[0],
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
    } catch (err) {
      if (err instanceof HttpBadRequestError) {
        throw new HttpBadRequestError(err.message);
      }

      throw new HttpInternalServerError(err);
    }

    return uploadImages;
  }
}
