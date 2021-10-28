import { HttpBadRequestError } from '@errors/http';
import { MultipartRequest } from 'lambda-multipart-parser';
import { Gallery, Query, ResponseSuccess } from './gallery.interface';
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

  async uploadImages(images: MultipartRequest, userUploadEmail: string): Promise<ResponseSuccess> {
    if (images.files.length === 0) {
      throw new HttpBadRequestError('Нет изображений для загрузки');
    }

    return this.service.uploadImages(images, userUploadEmail);
  }
}
