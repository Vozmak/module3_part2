import { AttributeValue } from '@aws-sdk/client-dynamodb';

export interface User {
  email: string;
  password: string;
}

export interface VerifyUser {
  [k: string]: AttributeValue;
}

export interface Token {
  token: string;
}

export interface SuccessSignup {
  message: string;
}
