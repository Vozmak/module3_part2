import { log } from '@helper/logger';
import { Handler } from 'aws-lambda';
import { errorHandler } from '@helper/rest-api/error-handler';
import { APIGatewayLambdaEvent } from '@interfaces/api-gateway-lambda.interface';
import { SuccessSignup, Token, User } from './auth.interface';
import { AuthManager } from './auth.manager';

export const login: Handler<APIGatewayLambdaEvent<User>, Token> = async (event) => {
  log(event);

  try {
    const manager = new AuthManager();

    const user: User = event.body;

    return await manager.logIn(user);
  } catch (error) {
    return errorHandler(error);
  }
};

export const signUp: Handler<APIGatewayLambdaEvent<User>, SuccessSignup> = async (event) => {
  log(event);

  try {
    const manager = new AuthManager();

    const user: User = event.body;

    return await manager.signUp(user);
  } catch (error) {
    return errorHandler(error);
  }
};
