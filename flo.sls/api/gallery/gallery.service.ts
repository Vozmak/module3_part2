import { GetItemCommand, GetItemInput, UpdateItemCommand, UpdateItemCommandInput } from '@aws-sdk/client-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { DynamoClient } from '@services/dynamoDBClient';
import { S3Service } from '@services/s3.service';
import { MultipartFile, MultipartRequest } from 'lambda-multipart-parser';
import { Gallery } from './gallery.interface';

export class GalleryService {
  async getImages(page: number, limit: number, filter: string): Promise<Gallery> {
    let images: Array<string>;
    let total: number;
    try {
      const params: GetItemInput = {
        TableName: 'GalleryM3P2',
        Key: {
          UserEmail: {
            S: filter,
          },
        },
        ProjectionExpression: 'Images',
      };

      const GetItem = new GetItemCommand(params);
      const imgURLs: Array<string> | undefined = (await DynamoClient.send(GetItem)).Item?.Images.SS;

      if (!imgURLs) {
        throw new HttpBadRequestError('Пользователь загрузил 0 картинок');
      }

      if (limit === 0) {
        total = 1;
        images = imgURLs;
      } else {
        total = Math.ceil(imgURLs.length / limit);
        images = imgURLs.slice((page - 1) * limit, page * limit);
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

  async uploadImages(images: MultipartRequest, userUploadId: string): Promise<string> {
    let uploadImages: Array<string>;
    try {
      // // @ts-ignore
      uploadImages = await this.saveImages(images, userUploadId);
    } catch (e) {
      throw new HttpInternalServerError(e.message);
    }

    return `Загружены следующие изображения:\n${uploadImages.join('\n')}`;
  }

  async saveImages(files: MultipartRequest, userUploadEmail: string): Promise<Array<string>> {
    const filesArray: Array<MultipartFile> = files.files;
    const uploadImages: Array<string> = [];
    const uploadURL: Array<string> = [];
    try {
      const S3 = new S3Service();
      for (const img of filesArray) {
        const key = `module3_part2/${img.filename}`;
        const findImage = await S3.get(key, 'gallery-trainee')
          .then((res) => res)
          .catch((e) => {
            if (e.code !== 'NoSuchKey') throw e;
            return null;
          });

        if (findImage) {
          continue;
        }

        await S3.put(key, img.content, 'gallery-trainee', img.contentType);

        const imageURL = S3.getPreSignedGetUrl(key, 'gallery-trainee').split('?', 1)[0];

        uploadImages.push(img.filename);
        uploadURL.push(imageURL);
      }

      const paramsUser: UpdateItemCommandInput = {
        TableName: 'GalleryM3P2',
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':url': {
            SS: uploadURL,
          },
        },
        Key: {
          UserEmail: {
            S: userUploadEmail,
          },
        },
        UpdateExpression: 'ADD #I :url',
      };
      const paramsAll: UpdateItemCommandInput = {
        TableName: 'GalleryM3P2',
        ExpressionAttributeNames: {
          '#I': 'Images',
        },
        ExpressionAttributeValues: {
          ':url': {
            SS: uploadURL,
          },
        },
        Key: {
          UserEmail: {
            S: 'all',
          },
        },
        UpdateExpression: 'ADD #I :url',
      };

      const UpdateItemUser = new UpdateItemCommand(paramsUser);
      const UpdateItemAll = new UpdateItemCommand(paramsAll);

      await DynamoClient.send(UpdateItemUser);
      await DynamoClient.send(UpdateItemAll);
    } catch (err) {
      throw new HttpInternalServerError(err);
    }

    return uploadImages;
  }
}
