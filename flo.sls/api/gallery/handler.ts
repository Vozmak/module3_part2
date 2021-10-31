import { S3Handler } from 'aws-lambda';
import { Handler } from 'aws-lambda/handler';
import { Gallery, Image, Query } from './gallery.interface';
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

export const getPreSignedUrl: Handler<APIGatewayLambdaEvent<Image>, string> = async (event) => {
  log(event);

  try {
    const manager = new GalleryManager();

    const { imageName } = event.body;
    //@ts-ignore
    const userUploadEmail: string = event.enhancedAuthContext.context;

    return await manager.getPreSignedPutUrl(imageName, userUploadEmail);
  } catch (error) {
    return errorHandler(error);
  }
};

export const saveImgToDB: S3Handler = async (event) => {
  log(event);

  try {
    const manager = new GalleryManager();

    const uploadInfo = event.Records[0];

    return await manager.saveImgToDB(uploadInfo);
  } catch (error) {
    return errorHandler(error);
  }
};
