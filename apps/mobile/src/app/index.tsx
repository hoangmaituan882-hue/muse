import { File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import Storage from "expo-sqlite/kv-store";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import type { ImageSourcePropType } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Item = {
  id: string;
  title: string;
  uri: string;
  kind: "image" | "video" | "link";
  favorite: boolean;
  collection: string;
  x: number;
  y: number;
};
function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      player={player}
      nativeControls
      style={{ width: "100%", height: 260, borderRadius: 10 }}
    />
  );
}
type Collection = { id: string; name: string };
type Data = { items: Item[]; collections: Collection[] };
const sampleImages: Record<string, ImageSourcePropType> = {
  a: require("../../../web/public/assets/architecture.jpg"),
  b: require("../../../web/public/assets/chair.jpg"),
  c: require("../../../web/public/assets/plant.jpg"),
  d: require("../../../web/public/assets/ocean.jpg"),
};
const initial: Data = {
  collections: [
    { id: "design", name: "设计的日常" },
    { id: "nature", name: "去自然里" },
  ],
  items: [
    {
      id: "a",
      title: "光落在建筑上的时候",
      uri: "sample:a",
      kind: "image",
      favorite: true,
      collection: "design",
      x: 20,
      y: 20,
    },
    {
      id: "b",
      title: "一把椅子的温柔",
      uri: "sample:b",
      kind: "image",
      favorite: false,
      collection: "design",
      x: 210,
      y: 100,
    },
    {
      id: "c",
      title: "留一点绿色给生活",
      uri: "sample:c",
      kind: "image",
      favorite: false,
      collection: "nature",
      x: 20,
      y: 290,
    },
    {
      id: "d",
      title: "海浪，是时间的形状",
      uri: "sample:d",
      kind: "image",
      favorite: true,
      collection: "nature",
      x: 210,
      y: 380,
    },
  ],
};
function validate(value: unknown): value is Data {
  if (
    !value ||
    typeof value !== "object" ||
    !("items" in value) ||
    !("collections" in value) ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.collections)
  )
    return false;
  return (
    value.items.every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "string" &&
        "title" in item &&
        typeof item.title === "string" &&
        "uri" in item &&
        typeof item.uri === "string" &&
        "kind" in item &&
        ["image", "video", "link"].includes(String(item.kind)) &&
        "favorite" in item &&
        typeof item.favorite === "boolean" &&
        "collection" in item &&
        typeof item.collection === "string" &&
        "x" in item &&
        typeof item.x === "number" &&
        "y" in item &&
        typeof item.y === "number",
    ) &&
    value.collections.every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        "id" in item &&
        typeof item.id === "string" &&
        "name" in item &&
        typeof item.name === "string",
    )
  );
}
const imageSource = (item: Item): ImageSourcePropType => sampleImages[item.id] ?? { uri: item.uri };
function Card({ item, open }: { item: Item; open: () => void }) {
  return (
    <Pressable onPress={open} style={{ flex: 1, margin: 6 }}>
      <View
        style={{
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: "#e3e7da",
          height: item.id === "a" || item.id === "c" ? 240 : 195,
        }}
      >
        {item.kind === "image" ? (
          <Image source={imageSource(item)} style={{ width: "100%", height: "100%" }} />
        ) : (
          <View style={{ padding: 20, flex: 1, justifyContent: "center" }}>
            <Text style={{ fontSize: 28, color: "#697754" }}>
              {item.kind === "link" ? "↗" : "▷"}
            </Text>
            <Text style={{ fontSize: 16, color: "#697754", marginTop: 16 }}>{item.title}</Text>
          </View>
        )}
        {item.favorite && (
          <Text style={{ position: "absolute", right: 10, top: 9, color: "#fff", fontSize: 18 }}>
            ♥
          </Text>
        )}
      </View>
      <Text numberOfLines={1} style={{ fontSize: 11, color: "#484e40", marginTop: 9 }}>
        {item.title}
      </Text>
      <Text style={{ fontSize: 9, color: "#a0a691", marginTop: 5 }}>
        {item.uri.startsWith("sample:") ? "MUSE 精选" : "我的收藏"}
      </Text>
    </Pressable>
  );
}
function CanvasCard({
  item,
  update,
  open,
}: {
  item: Item;
  update: (x: number, y: number) => void;
  open: () => void;
}) {
  const latest = useRef({ item, update, open });
  latest.current = { item, update, open };
  const drag = useRef({ x: item.x, y: item.y });
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        drag.current = { x: latest.current.item.x, y: latest.current.item.y };
      },
      onPanResponderMove: (_, gesture) =>
        latest.current.update(
          Math.max(0, drag.current.x + gesture.dx),
          Math.max(0, drag.current.y + gesture.dy),
        ),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) + Math.abs(gesture.dy) < 5) latest.current.open();
      },
    }),
  ).current;
  return (
    <View
      {...responder.panHandlers}
      style={{ position: "absolute", left: item.x, top: item.y, width: 160 }}
    >
      <Card item={item} open={open} />
    </View>
  );
}
export default function Home() {
  const [data, setData] = useState<Data>(initial);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("grid");
  const [infinityPages, setInfinityPages] = useState(3);
  const [add, setAdd] = useState(false);
  const [detail, setDetail] = useState<Item | null>(null);
  const [newCollection, setNewCollection] = useState(false);
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    Storage.getItem("muse-native-v1")
      .then((value) => {
        if (value) {
          const parsed: unknown = JSON.parse(value);
          if (!validate(parsed)) throw new Error("素材库格式有误");
          setData(parsed);
        }
        setLoaded(true);
      })
      .catch(() => {
        setLoadError(true);
        Alert.alert("素材库读取失败", "请重启应用重试，现有数据不会被覆盖。");
      });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => {
      Storage.setItem("muse-native-v1", JSON.stringify(data)).catch(() =>
        Alert.alert("保存失败", "请检查设备存储空间。"),
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [data, loaded]);
  const items = data.items.filter(
    (item) =>
      (tab === "all" || (tab === "favorites" ? item.favorite : item.collection === tab)) &&
      item.title.toLowerCase().includes(query.toLowerCase()),
  );
  const update = (id: string, values: Partial<Item>) => {
    setData((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...values } : item)),
    }));
    if (detail?.id === id) setDetail((item) => (item ? { ...item, ...values } : null));
  };
  const importImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        quality: 1,
      });
      if (result.canceled) return;
      setSaving(true);
      const added: Item[] = await Promise.all(
        result.assets.map(async (asset, index): Promise<Item> => {
          const id = `${Date.now()}-${index}`;
          const file = new File(asset.uri);
          const extension =
            asset.fileName?.split(".").pop() ?? (asset.type === "video" ? "mp4" : "jpg");
          const destination = new File(Paths.document, `muse-${id}.${extension}`);
          await file.copy(destination);
          return {
            id,
            title: asset.fileName ?? "新的灵感",
            uri: destination.uri,
            kind: asset.type === "video" ? "video" : "image",
            favorite: false,
            collection: ["all", "favorites"].includes(tab) ? "" : tab,
            x: 20 + index * 30,
            y: 20 + index * 30,
          };
        }),
      );
      setData((current) => ({ ...current, items: [...added, ...current.items] }));
      setAdd(false);
      setTab("all");
    } catch {
      Alert.alert("导入失败", "请确认相册可用并检查剩余空间。");
    } finally {
      setSaving(false);
    }
  };
  const addLink = () => {
    try {
      const parsed = new URL(url);
      if (!["https:", "http:"].includes(parsed.protocol)) throw new Error();
      const item: Item = {
        id: String(Date.now()),
        title: name.trim() || parsed.hostname,
        uri: parsed.href,
        kind: "link",
        favorite: false,
        collection: ["all", "favorites"].includes(tab) ? "" : tab,
        x: 20,
        y: 20,
      };
      setData((current) => ({ ...current, items: [item, ...current.items] }));
      setAdd(false);
      setUrl("");
      setName("");
      setTab("all");
    } catch {
      Alert.alert("链接有误", "请输入完整的 http:// 或 https:// 地址。");
    }
  };
  const button = (label: string, onPress: () => void, primary = false) => (
    <Pressable
      onPress={onPress}
      disabled={loadError || !loaded}
      style={{
        backgroundColor: primary ? "#697854" : "#eef0e7",
        padding: 13,
        borderRadius: 8,
        alignItems: "center",
        marginTop: 13,
      }}
    >
      <Text style={{ color: primary ? "white" : "#687654", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
  const fieldStyle = {
    backgroundColor: "#f5f6f1",
    borderRadius: 8,
    padding: 13,
    fontSize: 13,
    marginTop: 13,
    color: "#454c3d",
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fcfcfa" }}>
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 13,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderColor: "#eceee5",
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 30, fontWeight: "700", letterSpacing: -1.5, color: "#49533d" }}>
          ✳ muse.
        </Text>
        <Pressable accessibilityLabel="添加素材" onPress={() => setAdd(true)}>
          <Text
            style={{
              color: "white",
              backgroundColor: "#6b7b55",
              paddingHorizontal: 15,
              paddingVertical: 10,
              borderRadius: 8,
              fontSize: 12,
            }}
          >
            ＋ 添加素材
          </Text>
        </Pressable>
      </View>
      <View style={{ padding: 20, paddingBottom: 10 }}>
        <Text style={{ fontSize: 8, letterSpacing: 2, color: "#a0a88f" }}>
          YOUR INSPIRATION, COLLECTED.
        </Text>
        <Text style={{ marginTop: 10, fontSize: 25, color: "#3e4734", fontWeight: "600" }}>
          {tab === "all"
            ? "全部素材"
            : tab === "favorites"
              ? "我的喜欢"
              : data.collections.find((collection) => collection.id === tab)?.name}{" "}
          <Text style={{ fontSize: 14, color: "#a0aa90" }}>{items.length}</Text>
        </Text>
        <Text style={{ color: "#a0a591", fontSize: 11, marginTop: 9 }}>
          收集让你心动的瞬间，让灵感有迹可循。
        </Text>
        <TextInput
          accessibilityLabel="搜索素材"
          value={query}
          onChangeText={setQuery}
          placeholder="⌕  搜索你的灵感…"
          placeholderTextColor="#a1a995"
          style={{ ...fieldStyle, padding: 11, marginTop: 19 }}
        />
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingVertical: 8 }}
        >
          {[
            { id: "all", name: "全部素材" },
            { id: "favorites", name: "♥ 喜欢" },
            ...data.collections,
          ].map((collection) => (
            <Pressable
              key={collection.id}
              onPress={() => setTab(collection.id)}
              style={{
                backgroundColor: tab === collection.id ? "#e9eddf" : "#f4f5ef",
                paddingHorizontal: 12,
                paddingVertical: 9,
                borderRadius: 7,
              }}
            >
              <Text style={{ fontSize: 11, color: tab === collection.id ? "#65754f" : "#9ca58e" }}>
                {collection.name}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              setName("");
              setNewCollection(true);
            }}
            style={{ padding: 9 }}
          >
            <Text style={{ color: "#8a9878", fontSize: 12 }}>＋ 收藏集</Text>
          </Pressable>
        </ScrollView>
      </View>
      {mode === "canvas" ? (
        <ScrollView horizontal>
          <ScrollView
            contentContainerStyle={{ width: 1600, height: 2000, backgroundColor: "#f4f5ef" }}
          >
            {items.map((item) => (
              <CanvasCard
                key={item.id}
                item={item}
                open={() => setDetail(item)}
                update={(x, y) => update(item.id, { x, y })}
              />
            ))}
          </ScrollView>
        </ScrollView>
      ) : (
        <FlatList
          key={mode}
          data={
            mode === "infinity" ? Array.from({ length: infinityPages }, () => items).flat() : items
          }
          numColumns={2}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ padding: 12, paddingBottom: 85 }}
          onEndReached={
            mode === "infinity" ? () => setInfinityPages((pages) => pages + 1) : undefined
          }
          renderItem={({ item }) => <Card item={item} open={() => setDetail(item)} />}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#9ca58e", padding: 50 }}>
              给灵感留一个位置，添加第一份收藏。
            </Text>
          }
        />
      )}
      <View
        style={{
          position: "absolute",
          bottom: 24,
          alignSelf: "center",
          flexDirection: "row",
          backgroundColor: "#f0f2e9",
          padding: 5,
          borderRadius: 11,
          borderWidth: 1,
          borderColor: "#e0e5d6",
          gap: 3,
        }}
      >
        {[
          { id: "grid", name: "▦ 网格" },
          { id: "canvas", name: "✥ 画布" },
          { id: "infinity", name: "∞ Infinity" },
        ].map((view) => (
          <Pressable
            key={view.id}
            onPress={() => setMode(view.id)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: mode === view.id ? "white" : "transparent",
              borderRadius: 7,
            }}
          >
            <Text style={{ fontSize: 11, color: "#6f7d5c" }}>{view.name}</Text>
          </Pressable>
        ))}
      </View>
      <Modal
        transparent
        visible={add || newCollection || !!detail}
        animationType="slide"
        onRequestClose={() => {
          setAdd(false);
          setDetail(null);
          setNewCollection(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#27351e66", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: "#fcfcfa",
              padding: 24,
              paddingBottom: 40,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              maxHeight: "88%",
            }}
          >
            <Pressable
              onPress={() => {
                setAdd(false);
                setDetail(null);
                setNewCollection(false);
              }}
              style={{ position: "absolute", right: 20, top: 14, zIndex: 5 }}
            >
              <Text style={{ fontSize: 24, color: "#a1a98f" }}>×</Text>
            </Pressable>
            <ScrollView>
              {detail ? (
                <>
                  <Text style={{ fontSize: 19, color: "#465039", marginBottom: 15 }}>
                    {detail.title}
                  </Text>
                  {detail.kind === "image" && (
                    <Image
                      source={imageSource(detail)}
                      style={{ width: "100%", height: 260, borderRadius: 10 }}
                      resizeMode="contain"
                    />
                  )}
                  {detail.kind === "link" &&
                    button("↗ 打开原始链接", () => {
                      void Linking.openURL(detail.uri);
                    })}
                  {detail.kind === "video" && <VideoPreview uri={detail.uri} />}
                  {button(detail.favorite ? "♥ 已加入喜欢" : "♡ 加入喜欢", () =>
                    update(detail.id, { favorite: !detail.favorite }),
                  )}
                  <Text style={{ color: "#96a084", fontSize: 11, marginTop: 23 }}>放入收藏集</Text>
                  {data.collections.map((collection) =>
                    button(
                      `${detail.collection === collection.id ? "✓ " : ""}${collection.name}`,
                      () =>
                        update(detail.id, {
                          collection: detail.collection === collection.id ? "" : collection.id,
                        }),
                    ),
                  )}
                  <TextInput
                    style={fieldStyle}
                    value={detail.title}
                    onChangeText={(title) => update(detail.id, { title })}
                  />
                </>
              ) : newCollection ? (
                <>
                  <Text style={{ fontSize: 20, color: "#465039", marginBottom: 12 }}>
                    为灵感建一个收藏集
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={fieldStyle}
                    placeholder="收藏集名称"
                    maxLength={60}
                  />
                  {button(
                    "创建收藏集",
                    () => {
                      if (!name.trim()) return;
                      const id = String(Date.now());
                      setData((current) => ({
                        ...current,
                        collections: [...current.collections, { id, name: name.trim() }],
                      }));
                      setNewCollection(false);
                      setTab(id);
                    },
                    true,
                  )}
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 20, color: "#465039" }}>收集一份新灵感</Text>
                  <Text style={{ fontSize: 11, color: "#a1a98f", marginTop: 10 }}>
                    留住此刻打动你的图片、视频或链接。
                  </Text>
                  {button(
                    saving ? "正在导入…" : "＋ 从相册导入图片与视频",
                    () => {
                      void importImages();
                    },
                    true,
                  )}
                  <Text
                    style={{ textAlign: "center", color: "#a1a98f", fontSize: 10, marginTop: 23 }}
                  >
                    或保存一个喜欢的链接
                  </Text>
                  <TextInput
                    value={url}
                    onChangeText={setUrl}
                    style={fieldStyle}
                    autoCapitalize="none"
                    keyboardType="url"
                    placeholder="https://"
                  />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    style={fieldStyle}
                    placeholder="标题（可选）"
                  />
                  {button("保存链接", addLink)}
                  <Text
                    style={{ textAlign: "center", fontSize: 9, color: "#a1a98f", marginTop: 23 }}
                  >
                    文件保存在当前设备，由你掌控。
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
