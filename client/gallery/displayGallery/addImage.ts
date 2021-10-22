// import { getPage } from './helpers/getPage';

const imgForm = <HTMLFormElement>document.querySelector('.sendImg');

imgForm.addEventListener('submit', async (event: Event) => {
    event.preventDefault();

    const uploadImg: Response = await fetch(`http://localhost:3000/local/gallery/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.token}`
        },
        body: new FormData(imgForm),
    })

    const uploadResult = await uploadImg.text();

    if (uploadImg.status !== 200) {
        alert(uploadResult);
        return;
    }

    alert(`${uploadResult}\nЗагружены следующие изображения:\n`);
    window.location.reload();
});
