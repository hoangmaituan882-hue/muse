import { z } from "zod";

const mediaUrl = z
  .string()
  .refine(
    (value) => /^(https?:\/\/|data:(image|video)\/|\/assets\/)/u.test(value),
    "不支持的素材地址",
  );
export const assetSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1).max(200),
    kind: z.enum(["image", "video", "link"]),
    url: mediaUrl,
    preview: mediaUrl.optional(),
    source: z.string(),
    tags: z.array(z.string()).max(50),
    collections: z.array(z.string()),
    favorite: z.boolean(),
    createdAt: z.number(),
    deleted: z.boolean(),
    x: z.number().finite(),
    y: z.number().finite(),
    ratio: z.number().positive().max(10),
  })
  .refine(
    (asset) => asset.kind !== "link" || /^https?:\/\//u.test(asset.url),
    "链接必须使用 http 或 https",
  );
export const collectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(60),
  color: z.string().regex(/^#[\da-f]{6}$/iu),
});
export const librarySchema = z.object({
  version: z.literal(1),
  assets: z.array(assetSchema).max(20000),
  collections: z.array(collectionSchema).max(2000),
});
export type Asset = z.infer<typeof assetSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type Library = z.infer<typeof librarySchema>;

const sample = (
  id: string,
  title: string,
  kind: Asset["kind"],
  file: string,
  ratio: number,
  tags: string[],
  collection: string,
  source = "Unsplash",
): Asset => ({
  id,
  title,
  kind,
  url: `/assets/${file}`,
  source,
  tags,
  collections: [collection],
  favorite: ["01", "04", "07", "11"].includes(id),
  createdAt: 1793145600000 - Number(id) * 3600000,
  deleted: false,
  x: 90 + ((Number(id) - 1) % 4) * 330,
  y: 70 + Math.floor((Number(id) - 1) / 4) * 360,
  ratio,
});
export const initialLibrary: Library = {
  version: 1,
  collections: [
    { id: "design", name: "设计的日常", color: "#9b9e7d" },
    { id: "space", name: "空间与建筑", color: "#d2b19d" },
    { id: "type", name: "字里行间", color: "#9596be" },
    { id: "nature", name: "去自然里", color: "#8fa695" },
  ],
  assets: [
    sample(
      "01",
      "光落在建筑上的时候",
      "image",
      "architecture.jpg",
      0.8,
      ["建筑", "光影", "极简"],
      "space",
    ),
    sample(
      "02",
      "Less, but better.",
      "image",
      "less.svg",
      0.79,
      ["排版", "平面设计"],
      "type",
      "MUSE Studio",
    ),
    {
      ...sample(
        "03",
        "风里的日常 · 影像片段",
        "video",
        "flower.mp4",
        1.32,
        ["自然", "风景", "影像"],
        "nature",
        "MDN · CC0",
      ),
      preview: "/assets/flower.jpg",
    },
    {
      ...sample(
        "04",
        "A space for good design",
        "link",
        "interior.jpg",
        1.48,
        ["设计", "空间"],
        "design",
        "The Modern House",
      ),
      url: "https://www.themodernhouse.com/",
      preview: "/assets/interior.jpg",
    },
    sample("05", "一把椅子的温柔", "image", "chair.jpg", 0.94, ["家具", "产品设计"], "design"),
    sample(
      "06",
      "Still life, slow life",
      "image",
      "still-life.jpg",
      0.79,
      ["静物", "色彩"],
      "design",
    ),
    sample(
      "07",
      "THE ART OF NOTICING",
      "image",
      "noticing.svg",
      0.84,
      ["海报", "排版", "灵感"],
      "type",
      "MUSE Studio",
    ),
    sample("08", "留一点绿色给生活", "image", "plant.jpg", 0.88, ["植物", "生活"], "nature"),
    sample("09", "日常的另一种角度", "image", "stairs.jpg", 0.76, ["建筑", "几何"], "space"),
    sample(
      "10",
      "Form follows feeling",
      "image",
      "form.svg",
      1.2,
      ["平面设计", "色彩"],
      "design",
      "MUSE Studio",
    ),
    sample(
      "11",
      "海浪，是时间的形状",
      "image",
      "ocean.jpg",
      1.05,
      ["自然", "海洋", "蓝色"],
      "nature",
    ),
    {
      ...sample(
        "12",
        "把好设计放进日常",
        "link",
        "objects.jpg",
        1.25,
        ["产品设计", "灵感"],
        "design",
        "Are.na",
      ),
      url: "https://www.are.na/",
      preview: "/assets/objects.jpg",
    },
    sample("13", "柔软的秩序", "image", "fabric.jpg", 0.9, ["材质", "纹理"], "design"),
    sample("14", "走进山的呼吸", "image", "mountain.jpg", 1.25, ["山野", "自然"], "nature"),
    sample("15", "A little room to think", "image", "room.jpg", 0.85, ["室内", "空间"], "space"),
    sample(
      "16",
      "世界很大，慢慢收集。",
      "image",
      "curiosity.svg",
      1.05,
      ["海报", "灵感"],
      "type",
      "MUSE Studio",
    ),
  ],
};
export function httpUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
export function isVideo(asset: Asset) {
  return asset.kind === "video" && !asset.url.endsWith(".jpg");
}
export function readFile(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("无法读取文件"));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}
let database: Promise<IDBDatabase> | undefined;
function db() {
  database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open("muse-library", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("library");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开本地素材库"));
  });
  return database;
}
export async function loadLibrary(): Promise<Library> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const request = connection.transaction("library").objectStore("library").get("current");
    request.onsuccess = () => {
      const parsed = librarySchema.safeParse(request.result);
      if (request.result === undefined) resolve(initialLibrary);
      else if (parsed.success) resolve(parsed.data);
      else reject(new Error("本地素材库格式有误，请从备份恢复"));
    };
    request.onerror = () => reject(new Error("读取素材库失败"));
  });
}
export async function saveLibrary(library: Library) {
  const connection = await db();
  return new Promise<void>((resolve, reject) => {
    const transaction = connection.transaction("library", "readwrite");
    transaction.objectStore("library").put(library, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("保存失败，存储空间可能不足。请导出备份。"));
    transaction.onabort = () => reject(new Error("保存未完成，请导出备份。"));
  });
}
