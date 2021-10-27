import { DynamoDBClient, PutItemCommand, PutItemInput } from '@aws-sdk/client-dynamodb';
import { HttpInternalServerError } from '@errors/http';
import { getEnv } from '@helper/environment';
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { SuccessSignup, Token, User } from './auth.interface';

export class AuthService {
  async logIn(verifyUserEmail: string): Promise<Token> {
    let token: Token;

    try {
      token = { token: this.getJWTToken(verifyUserEmail) };
    } catch (e) {
      throw new HttpInternalServerError(e.message);
    }

    return token;
  }

  async signUp(user: User, DynamoClient: DynamoDBClient): Promise<SuccessSignup> {
    try {
      const params: PutItemInput = {
        TableName: getEnv('USERS_TABLE_NAME'),
        Item: {
          UserEmail: {
            S: user.email,
          },
          Password: {
            S: await bcryptjs.hash(user.password, Number(getEnv('SALTROUNDS', true))),
          },
        },
      };

      const PutItem = new PutItemCommand(params);
      await DynamoClient.send(PutItem);
    } catch (e) {
      throw new HttpInternalServerError(e.message);
    }

    return {
      message: `${user.email} успешно зарегистрирован!`,
    };
  }

  getJWTToken(email: string): string {
    const body = { email: email };
    return jwt.sign({ user: body }, getEnv('SECRET', true));
  }
}
