import { createStore, del, get, set } from "idb-keyval";
const store = () => createStore("slatelogic-storyboard", "frames");
export const saveImage = (key: string, dataUrl: string) => set(key, dataUrl, store());
export const loadImage = (key: string) => get<string>(key, store());
export const deleteImage = (key: string) => del(key, store());
