import { Handler } from 'aws-lambda/handler';
import * as parser from 'lambda-multipart-parser';
import { MultipartRequest } from 'lambda-multipart-parser';
import { Gallery, Query } from './gallery.interface';
import { log } from '@helper/logger';
import { errorHandler } from '@helper/rest-api/error-handler';
import { APIGatewayLambdaEvent } from '@interfaces/api-gateway-lambda.interface';
import { GalleryManager } from './gallery.manager';

export const getGallery: Handler<APIGatewayLambdaEvent<null>, Gallery> = async (event) => {
  log(event);

  try {
    const manager = new GalleryManager();

    const querystring: Query = event.query!;

    return await manager.getImages(querystring);
  } catch (error) {
    return errorHandler(error);
  }
};

export const addImageGallery: Handler<APIGatewayLambdaEvent<null>, string> = async (event) => {
  // log(event);

  try {
    const manager = new GalleryManager();

    // @ts-ignore
    const images: MultipartRequest = await parser.parse(event);
    //@ts-ignore
    const userUploadEmail: string = event.requestContext!.authorizer.context;

    return await manager.uploadImages(images, userUploadEmail);
  } catch (error) {
    return errorHandler(error);
  }
};
