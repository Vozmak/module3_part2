import { lambdaUrl } from '../../env.js';
import { getUser } from "../helpers/getUser.js";

interface User {
    email: string;
    password: string;
}

const signUpButton = <HTMLButtonElement>document.querySelector('#signup');
const signUpForm = <HTMLFormElement>document.querySelector('#authorization');

signUpButton.addEventListener('click', async event => {
    event.preventDefault();

    const user: User = getUser(signUpForm);

    const result = await signUp(user);

    if ('errorMessage' in result && result.errorMessage) {
        return alert(result.errorMessage);
    }

    alert(result.message);

    window.location.reload();
});


async function signUp(user: User) {
    const response: Response = await fetch(`${lambdaUrl}signup`, {
        method: "POST",
        headers: {
            "Content-type": 'application/json'
        },
        body: JSON.stringify(user)
    });

    return await response.json();
}
