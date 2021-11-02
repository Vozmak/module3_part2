// import { getPage } from './helpers/getPage';

import { lambdaUrl } from '../../env.js';

const imgForm = <HTMLFormElement>document.querySelector('.sendImg');
const imgInput = <HTMLInputElement>document.querySelector('#addImg');

imgForm.addEventListener('submit', async (event: Event) => {
    event.preventDefault();

    if (imgInput.files == null || imgInput.files.length === 0) {
        return alert('Image not selected');
    }

    const image: File = imgInput.files[0];
    console.log(image);

    const preSignedURL: Response = await fetch(`${lambdaUrl}gallery/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.token}`,
            "Content-type": "application/json"
        },
        body: JSON.stringify({ imageName: image.name }),
    });

    if (preSignedURL.status !== 200) {
        return alert(preSignedURL.statusText);
    }

    const imgPutURL = await preSignedURL.json();

    const uploadImg: Response = await fetch(imgPutURL, {
        method: "PUT",
        headers: {
            "Content-Type": `${image.type}`
        },
        body: image,
    });

    if (uploadImg.status !== 200) {
        return alert(uploadImg.statusText);
    }

    alert(`Image ${imgInput.files[0].name} success upload`);
    window.location.reload();
});
