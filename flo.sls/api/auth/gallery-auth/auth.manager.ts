import { GetItemCommand, GetItemInput, GetItemOutput } from '@aws-sdk/client-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
import { HttpError } from '@errors/http/http-error';
import { getEnv } from '@helper/environment';
import { userValidation } from '@helper/gallery/usersValidator';
import * as bcryptjs from 'bcryptjs';
import { SuccessSignup, Token, User, VerifyUser } from './auth.interface';
import { AuthService } from './auth.service';
import { DynamoClient } from '@services/dynamoDBClient';

export class AuthManager {
  private readonly service: AuthService;

  constructor() {
    this.service = new AuthService();
  }

  async logIn(user: User): Promise<Token> {
    let verifyUser: VerifyUser | undefined;

    try {
      if (!user || !user.email || !user.password) {
        throw new HttpBadRequestError('Email and password is required.');
      }

      const params: GetItemInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        Key: {
          UserEmail: {
            S: user.email,
          },
          UserData: {
            S: 'User',
          },
        },
      };
      const GetItem = new GetItemCommand(params);
      const userFindResult: GetItemOutput = await DynamoClient.send(GetItem);
      verifyUser = userFindResult.Item;

      if (!verifyUser) throw new HttpError(404, 'Not found', `User ${user.email} not found`);
      // @ts-ignore
      const validate: boolean = await bcryptjs.compare(user.password, userFindResult.Item.Password.S);
      if (!validate) throw new HttpBadRequestError('Invalid password');
    } catch (e) {
      if (e instanceof HttpBadRequestError) throw new HttpBadRequestError(e.message);
      else if (e instanceof HttpError) throw new HttpError(e.statusCode, e.name, e.message);

      throw new HttpInternalServerError(e.message);
    }

    // @ts-ignore
    return this.service.logIn(verifyUser.UserEmail.S);
  }

  async signUp(user: User): Promise<SuccessSignup> {
    if (!user || !user.email || !user.password) {
      throw new HttpBadRequestError('Email and password is required');
    }

    const params: GetItemInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      Key: {
        UserEmail: {
          S: user.email,
        },
        UserData: {
          S: 'User',
        },
      },
    };
    const GetItem = new GetItemCommand(params);
    const userFindResult: GetItemOutput = await DynamoClient.send(GetItem);
    const userVerify: VerifyUser | undefined = userFindResult.Item;
    if (userVerify) {
      throw new HttpBadRequestError('User already exist');
    }

    if (!userValidation(user)) {
      throw new HttpBadRequestError('Invalid email or password');
    }

    return this.service.signUp(user, DynamoClient);
  }
}
