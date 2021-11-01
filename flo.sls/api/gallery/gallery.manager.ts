import { HttpBadRequestError } from '@errors/http';
import { getEnv } from '@helper/environment';
import { S3Service } from '@services/s3.service';
import { S3EventRecord } from 'aws-lambda';
import { GetObjectOutput } from 'aws-sdk/clients/s3';
import { Gallery, Query } from './gallery.interface';
import { GalleryService } from './gallery.service';

export class GalleryManager {
  private readonly service: GalleryService;

  constructor() {
    this.service = new GalleryService();
  }

  getImages(querystring: Query): Promise<Gallery> {
    const page: string = querystring?.page || '1';
    const limit: string = querystring?.limit || '0';
    const filter: string = querystring?.filter || 'all';

    const numberPage = Number(page);
    const numberLimit = Number(limit);

    return this.service.getImages(numberPage, numberLimit, filter);
  }

  async getPreSignedPutUrl(imageName: string, userUploadEmail: string): Promise<string> {
    if (!imageName) {
      throw new HttpBadRequestError('Нет изображений для загрузки');
    }

    return this.service.getPreSignedPutUrl(imageName, userUploadEmail);
  }

  async saveImgToDB(uploadInfo: S3EventRecord): Promise<void> {
    const S3 = new S3Service();
    const key = decodeURIComponent(uploadInfo.s3.object.key);

    if (!key) {
      throw new HttpBadRequestError('Key is required');
    }

    const imageMetadata: GetObjectOutput | null = await S3.get(key, getEnv('IMAGES_BUCKET_NAME'))
      .then((res) => res)
      .catch((e) => {
        if (e.code !== 'NoSuchKey') throw e;
        throw new HttpBadRequestError('Image not found');
      });

    return this.service.saveImgToDB(key, imageMetadata, S3);
  }
}
