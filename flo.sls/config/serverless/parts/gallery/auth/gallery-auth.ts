import { AWSPartitial } from '../../../types';

export const authConfig: AWSPartitial = {
  functions: {
    signUp: {
      handler: 'api/gallery/auth/handler.signUp',
      memorySize: 128,
      events: [
        {
          http: {
            path: '/signup',
            method: 'post',
            integration: 'lambda',
            cors: true,
            response: {
              headers: {
                'Access-Control-Allow-Origin': "'*'",
                'Content-Type': "'application/json'",
              },
              template: "$input.json('$')",
            },
          },
        },
      ],
    },
    login: {
      handler: 'api/gallery/auth/handler.login',
      memorySize: 128,
      events: [
        {
          http: {
            path: '/login',
            method: 'post',
            integration: 'lambda',
            cors: true,
            response: {
              headers: {
                'Access-Control-Allow-Origin': "'*'",
                'Content-Type': "'application/json'",
              },
              template: "$input.json('$')",
            },
          },
        },
      ],
    },
  },
};
