// Каталог обрамлений окон (фото-референс для Gemini).
export type FrameItem = {
  id: string;
  name: string;
  image: string; // "/frames/{id}.jpg" — фото установленного обрамления (референс)
  hint: string; // текст-подсказка для Gemini
};

export const FRAMES: FrameItem[] = [
  {
    id: "frame1",
    name: "Классика",
    image: "/frames/frame1.jpg",
    hint: "white classic window trim with side pilasters and top cornice, like the reference photo",
  },
  {
    id: "frame2",
    name: "Классика 2",
    image: "/frames/frame2.jpg",
    hint: "white flat window surround, like the reference photo",
  },
  { id:"frame3", name:"Классика 3", image:"/frames/frame3.jpg",
  hint:"white classic window trim, like the reference photo" },
];

export const getFrame = (id?: string | null) =>
  id ? FRAMES.find((f) => f.id === id) : undefined;
