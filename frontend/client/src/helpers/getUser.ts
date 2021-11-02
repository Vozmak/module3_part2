function getUser(form: HTMLFormElement) {
    const email = form.elements.namedItem('email') as HTMLInputElement;
    const password = form.elements.namedItem('password') as HTMLInputElement;
    return  {
        email: email.value,
        password: password.value
    };
}

export { getUser }