interface User {
  email: string;
  password: string;
}

function userValidation({ email, password }: User): boolean {
  const emailRegExp = /^[a-z\d]+@[a-z]+\.[a-z]+$/i;
  const passRegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])[a-zA-Z\d]{8,}$/;

  return emailRegExp.test(email) && passRegExp.test(password);
}

export { userValidation };
