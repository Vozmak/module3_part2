function getPage(): string {
  const searchParams = new URL(window.location.href).searchParams;
  let page: string = searchParams.get('page') || localStorage.page || '1';

  // if (page === "1") previous.disabled = true
  // else if (page === "3") next.disabled = true

  return page;
}

export { getPage }
