import {getUser} from "../helpers/getUser.js";

if (localStorage.timestamp < Date.now()) {
  localStorage.removeItem("token");
  localStorage.removeItem("timestamp");
}

interface User {
  email: string;
  password: string;
}

interface ErrorMsg {
  errorMessage: string;
}

interface Token {
  token: string;
}

const form = document.getElementById("authorization") as HTMLFormElement;

form.addEventListener("submit", async event => {
  event.preventDefault()

  const user: User = getUser(form);

  const result: ErrorMsg | Token = await authorizationUser(user);

  if ('errorMessage' in result && result.errorMessage) return alert(result.errorMessage)

  const {token} = result as Token;

  if (!localStorage.token) {
    localStorage.setItem("token", token);
    localStorage.setItem("timestamp", `${Date.now() + 6e5}`);

    window.location.href = `gallery/gallery.html?page=${localStorage.page || 1}`;
  }
});

async function authorizationUser(user: User): Promise<ErrorMsg | Token>  {
  let response: Response = await fetch('http://localhost:3000/local/login', {
    method: "POST",
    headers: {
      "Content-type": "application/json"
    },
    body: JSON.stringify(user)
  });

  return await response.json()
}
