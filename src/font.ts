import { continueRender, delayRender, staticFile } from "remotion";

let loaded = false;

export const loadFont = () => {
  if (loaded || typeof document === "undefined") return;
  loaded = true;
  const handle = delayRender("Loading Nunito");
  const face = new FontFace("Nunito", `url(${staticFile("fonts/Nunito.ttf")})`, {
    weight: "200 1000",
    style: "normal",
  });
  face
    .load()
    .then((f) => {
      (document.fonts as unknown as { add: (f: FontFace) => void }).add(f);
      continueRender(handle);
    })
    .catch((e) => {
      console.error(e);
      continueRender(handle);
    });
};
