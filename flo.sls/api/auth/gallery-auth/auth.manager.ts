import { GetItemCommand, GetItemInput, GetItemOutput } from '@aws-sdk/client-dynamodb';
import { HttpBadRequestError, HttpInternalServerError } from '@errors/http';
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
        },
      };
      const GetItem = new GetItemCommand(params);
      const userFindResult: GetItemOutput = await DynamoClient.send(GetItem);
      verifyUser = userFindResult.Item;

      if (!verifyUser) throw new HttpBadRequestError(`Пользователь ${user.email} не найден`);
      // @ts-ignore
      const validate: boolean = await bcryptjs.compare(user.password, userFindResult.Item.Password.S);
      if (!validate) throw new HttpBadRequestError('Неверный пароль');
    } catch (e) {
      if (e instanceof HttpBadRequestError) throw new HttpBadRequestError(e.message);

      throw new HttpInternalServerError(e.message);
    }

    // @ts-ignore
    return this.service.logIn(verifyUser.UserEmail.S);
  }

  async signUp(user: User): Promise<SuccessSignup> {
    if (!user || !user.email || !user.password) {
      throw new HttpBadRequestError('Не указаны данные');
    }

    const params: GetItemInput = {
      TableName: getEnv('USERS_TABLE_NAME'),
      Key: {
        UserEmail: {
          S: user.email,
        },
      },
    };

    const GetItem = new GetItemCommand(params);
    const userFindResult: GetItemOutput = await DynamoClient.send(GetItem);

    const userVerify: VerifyUser | undefined = userFindResult.Item;
    if (userVerify) {
      throw new HttpBadRequestError('Пользователь уже зарегестрирован');
    }

    if (!userValidation(user)) {
      throw new HttpBadRequestError('Некорректный ввод email или пароля');
    }

    return this.service.signUp(user, DynamoClient);
  }
}
