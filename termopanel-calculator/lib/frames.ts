// Каталог обрамлений окон (фото-референс для Gemini).
export type FrameItem = {
  id: string;
  name: string;
  image: string; // "/frames/{id}.jpg" — фото установленного обрамления (референс)
  hint: string; // текст-подсказка для Gemini
  color: string; // цвет обрамления (человекочит.) — для промпта
};

export const FRAMES: FrameItem[] = [
  {
    id: "frame1",
    name: "Классика",
    image: "/frames/frame1.jpg",
    hint: "white classic window trim with side pilasters and top cornice, like the reference photo",
    color: "white",
  },
  {
    id: "frame2",
    name: "Классика 2",
    image: "/frames/frame2.jpg",
    hint: "flat window surround, like the reference photo",
    color: "dark graphite grey / charcoal",
  },
  {
    id: "frame3",
    name: "Классика 3",
    image: "/frames/frame3.jpg",
    hint: "classic window trim, like the reference photo",
    color: "white",
  },
  {
    id: "frame4",
    name: "Термопанель КА-25",
    image: "/frames/frame4.jpg",
    color: "white",
    hint: "flat thin white thermopanel plank trim around the window, like the reference image",
  },
  {
    id: "frame5",
    name: "Термопанель КА-26",
    image: "/frames/frame5.jpg",
    color: "white",
    hint: "flat thin white thermopanel plank trim around the window, like the reference image",
  },
];

export const getFrame = (id?: string | null) =>
  id ? FRAMES.find((f) => f.id === id) : undefined;
