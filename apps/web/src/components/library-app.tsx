import {
  ArrowDownToLine,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Columns3,
  ExternalLink,
  Folder,
  FolderPlus,
  Heart,
  ImagePlus,
  Image as ImageIcon,
  Inbox,
  Infinity as InfinityIcon,
  LayoutGrid,
  Link,
  Menu,
  MoreHorizontal,
  Move,
  Plus,
  Search,
  Settings2,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode } from "react";

import { DesktopUpdates } from "#src/components/desktop-updates.tsx";
import {
  httpUrl,
  initialLibrary,
  isVideo,
  librarySchema,
  loadLibrary,
  readFile,
  saveLibrary,
} from "#src/lib/library.ts";
import type { Asset, Library } from "#src/lib/library.ts";

type View = "grid" | "canvas" | "infinity";
type Modal = "add" | "collection" | "settings" | "help" | "edit-collection" | null;
const colors = ["#9b9e7d", "#d2b19d", "#9596be", "#8fa695", "#be8b92", "#89a7ba"];
const kindLabels = { image: "图片", video: "视频", link: "链接" };
const message = (error: unknown) => (error instanceof Error ? error.message : "操作失败，请重试");
function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`icon-button ${active ? "active" : ""} ${className}`}
    >
      <Icon size={18} strokeWidth={1.65} />
    </button>
  );
}
function ModalFrame({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const reference = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = reference.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={reference}
      className={`dialog ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <IconButton icon={X} label="关闭" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
function Preview({ asset, detail = false }: { asset: Asset; detail?: boolean }) {
  if (isVideo(asset))
    return (
      <video
        src={asset.url}
        poster={asset.preview}
        controls={detail}
        muted={!detail}
        preload={detail ? "metadata" : "none"}
        playsInline
        aria-label={asset.title}
      />
    );
  if (asset.kind === "link" && !asset.preview)
    return (
      <div className="link-cover">
        <Link size={34} strokeWidth={1.2} />
        <span>{asset.source}</span>
        <p>{asset.title}</p>
      </div>
    );
  return (
    <img
      src={asset.preview ?? asset.url}
      alt={asset.title}
      loading={detail ? "eager" : "lazy"}
      draggable={false}
      onError={(event) => {
        event.currentTarget.style.visibility = "hidden";
      }}
    />
  );
}

export function LibraryApp() {
  const [library, setLibrary] = useState<Library>(initialLibrary);
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("正在打开素材库");
  const [active, setActive] = useState("all");
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<View>("grid");
  const [gridSize, setGridSize] = useState(260);
  const [modal, setModal] = useState<Modal>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [transform, setTransform] = useState({ x: 40, y: 30, zoom: 0.8 });
  const [stageSize, setStageSize] = useState({ width: 1300, height: 900 });
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formColor, setFormColor] = useState(colors[0] ?? "#9b9e7d");
  const [addTab, setAddTab] = useState("file");
  const [formError, setFormError] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("muse-theme") ?? "light");
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    asset?: Asset;
    moved: boolean;
  } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);

  useEffect(() => {
    let mounted = true;
    loadLibrary()
      .then((data) => {
        if (mounted) {
          setLibrary(data);
          setReady(true);
        }
      })
      .catch((error: unknown) => {
        if (mounted) {
          setSaveStatus("素材库读取失败");
          notify(message(error));
        }
      });
    return () => {
      mounted = false;
    };
  }, [notify]);
  useEffect(() => {
    if (!ready) return;
    setSaveStatus("正在保存…");
    const timer = setTimeout(() => {
      saveLibrary(library)
        .then(() => setSaveStatus("已保存到本机"))
        .catch((error: unknown) => {
          setSaveStatus("保存失败，请导出备份");
          notify(message(error));
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [library, ready, notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("muse-theme", theme);
  }, [theme]);
  useEffect(() => {
    const element = workspaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        modal ||
        detailId
      )
        return;
      if (event.key.toLowerCase() === "n") setModal("add");
      if (event.key === "1") setView("grid");
      if (event.key === "2") setView("canvas");
      if (event.key === "3") setView("infinity");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, detailId]);
  useEffect(() => {
    if (import.meta.env.PROD && "serviceWorker" in navigator && !("desktop" in window))
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Offline is optional when the host disables service workers. */
      });
  }, []);

  const currentCollection = library.collections.find((item) => item.id === active);
  const alive = library.assets.filter((asset) => !asset.deleted);
  const favoriteCount = alive.filter((asset) => asset.favorite).length;
  const inboxCount = alive.filter((asset) => asset.collections.length === 0).length;
  const deletedCount = library.assets.filter((asset) => asset.deleted).length;
  const allTags = [...new Set(alive.flatMap((asset) => asset.tags))];
  const scope = useMemo(
    () =>
      library.assets.filter((asset) => {
        if (active === "trash") return asset.deleted;
        if (asset.deleted) return false;
        if (active === "favorites") return asset.favorite;
        if (active === "inbox") return asset.collections.length === 0;
        return active === "all" || asset.collections.includes(active);
      }),
    [library, active],
  );
  const visible = useMemo(() => {
    const result = scope.filter(
      (asset) =>
        (filter === "all" || asset.kind === filter) &&
        (!tagFilter || asset.tags.includes(tagFilter)) &&
        `${asset.title} ${asset.source} ${asset.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    if (shuffleOrder)
      return result.sort((a, b) => shuffleOrder.indexOf(a.id) - shuffleOrder.indexOf(b.id));
    return result.sort((a, b) =>
      sort === "name"
        ? a.title.localeCompare(b.title, "zh-CN")
        : sort === "oldest"
          ? a.createdAt - b.createdAt
          : b.createdAt - a.createdAt,
    );
  }, [scope, filter, tagFilter, query, sort, shuffleOrder]);
  const detail = library.assets.find((asset) => asset.id === detailId);
  const title =
    currentCollection?.name ??
    { all: "全部素材", inbox: "收件箱", favorites: "我的喜欢", trash: "回收站" }[active] ??
    "全部素材";
  const updateAsset = (id: string, update: Partial<Asset>) =>
    setLibrary((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.id === id ? { ...asset, ...update } : asset)),
    }));
  const navigate = (id: string) => {
    setActive(id);
    setQuery("");
    setFilter("all");
    setTagFilter("");
    setSidebarOpen(false);
  };
  const openModal = (value: Modal) => {
    setFormError("");
    setFormName(value === "edit-collection" ? (currentCollection?.name ?? "") : "");
    setFormUrl("");
    setFormColor(currentCollection?.color ?? colors[0] ?? "#9b9e7d");
    setModal(value);
  };
  const newCollection = () => {
    const name = formName.trim();
    if (!name) {
      setFormError("给收藏集起一个名字吧");
      return;
    }
    if (modal === "edit-collection" && currentCollection)
      setLibrary((current) => ({
        ...current,
        collections: current.collections.map((item) =>
          item.id === active ? { ...item, name, color: formColor } : item,
        ),
      }));
    else {
      const id = crypto.randomUUID();
      setLibrary((current) => ({
        ...current,
        collections: [...current.collections, { id, name, color: formColor }],
      }));
      navigate(id);
    }
    setModal(null);
    notify("收藏集已保存");
  };
  const deleteCollection = () => {
    setLibrary((current) => ({
      ...current,
      collections: current.collections.filter((item) => item.id !== active),
      assets: current.assets.map((asset) => ({
        ...asset,
        collections: asset.collections.filter((id) => id !== active),
      })),
    }));
    navigate("all");
    setModal(null);
    notify("收藏集已移除，素材仍在素材库中");
  };
  const addAssets = async (files: File[]) => {
    const supported = files.filter((file) => /^(image|video)\//u.test(file.type));
    if (!supported.length) {
      notify("请选择图片或视频文件");
      return;
    }
    if (supported.some((file) => file.size > 100 * 1024 * 1024)) {
      notify("单个文件请小于 100 MB");
      return;
    }
    setBusy(true);
    try {
      const added = await Promise.all(
        supported.map(async (file, index): Promise<Asset> => ({
          id: crypto.randomUUID(),
          title: file.name.replace(/\.[^.]+$/u, ""),
          kind: file.type.startsWith("video") ? "video" : "image",
          url: await readFile(file),
          source: "本地导入",
          tags: [],
          collections: currentCollection ? [currentCollection.id] : [],
          favorite: false,
          deleted: false,
          createdAt: Date.now() + index,
          x: 80 + index * 40,
          y: 80 + index * 40,
          ratio: 1,
        })),
      );
      setLibrary((current) => ({ ...current, assets: [...added, ...current.assets] }));
      setModal(null);
      if (["trash", "favorites"].includes(active)) navigate("inbox");
      notify(`已收集 ${added.length} 份新灵感`);
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const addLink = () => {
    const url = httpUrl(formUrl.trim());
    if (!url) {
      setFormError("请输入以 https:// 或 http:// 开头的有效链接");
      return;
    }
    const asset: Asset = {
      id: crypto.randomUUID(),
      title: formName.trim() || new URL(url).hostname,
      kind: "link",
      url,
      source: new URL(url).hostname.replace(/^www\./u, ""),
      tags: [],
      collections: currentCollection ? [currentCollection.id] : [],
      favorite: false,
      deleted: false,
      createdAt: Date.now(),
      x: 100,
      y: 100,
      ratio: 1.3,
    };
    setLibrary((current) => ({ ...current, assets: [asset, ...current.assets] }));
    setModal(null);
    if (["trash", "favorites"].includes(active)) navigate("inbox");
    notify("链接已收入素材库");
  };
  const exportLibrary = async () => {
    setBusy(true);
    try {
      const assets = await Promise.all(
        library.assets.map(async (asset) => {
          const embed = async (url: string) =>
            url.startsWith("/assets/") ? readFile(await (await fetch(url)).blob()) : url;
          return {
            ...asset,
            url: await embed(asset.url),
            ...(asset.preview ? { preview: await embed(asset.preview) } : {}),
          };
        }),
      );
      const blob = new Blob([JSON.stringify({ ...library, assets })], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `MUSE-素材库-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      notify("素材库已导出，包含本地图片与视频");
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
    }
  };
  const importLibrary = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const input: unknown = JSON.parse(await file.text());
      const parsed = librarySchema.safeParse(input);
      if (!parsed.success) throw new Error("备份格式不正确，请选择 MUSE 导出的 JSON 文件");
      const incoming = parsed.data;
      setReady(true);
      setLibrary((current) => ({
        version: 1,
        assets: [
          ...current.assets,
          ...incoming.assets.filter(
            (item) => !current.assets.some((existing) => existing.id === item.id),
          ),
        ],
        collections: [
          ...current.collections,
          ...incoming.collections.filter(
            (item) => !current.collections.some((existing) => existing.id === item.id),
          ),
        ],
      }));
      notify("备份已合并，重复素材已跳过");
    } catch (error) {
      notify(message(error));
    } finally {
      setBusy(false);
      if (backupRef.current) backupRef.current.value = "";
    }
  };
  const shuffle = () => {
    const order = visible.map((asset) => asset.id);
    for (let index = order.length - 1; index > 0; index--) {
      const random = Math.floor(Math.random() * (index + 1));
      const first = order[index];
      const second = order[random];
      if (first !== undefined && second !== undefined) {
        order[index] = second;
        order[random] = first;
      }
    }
    setShuffleOrder(order);
    notify("换个顺序，遇见新的灵感");
  };

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    const id = event.target.closest<HTMLElement>("[data-asset]")?.dataset.asset;
    const asset = visible.find((item) => item.id === id);
    pointer.current = {
      x: event.clientX,
      y: event.clientY,
      tx: transform.x,
      ty: transform.y,
      ...(asset ? { asset } : {}),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = pointer.current;
    if (!drag) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.asset && view === "canvas")
      updateAsset(drag.asset.id, {
        x: drag.asset.x + dx / transform.zoom,
        y: drag.asset.y + dy / transform.zoom,
      });
    else setTransform((current) => ({ ...current, x: drag.tx + dx, y: drag.ty + dy }));
  };
  const pointerUp = () => {
    if (pointer.current?.asset && !pointer.current.moved) setDetailId(pointer.current.asset.id);
    pointer.current = null;
  };
  const changeView = (next: View) => {
    setView(next);
    setTransform({ x: 40, y: 30, zoom: 0.8 });
  };
  const stageAssets = () => {
    if (view === "canvas")
      return visible.map((asset) => (
        <div
          key={asset.id}
          data-asset={asset.id}
          className="stage-card"
          role="button"
          tabIndex={0}
          aria-label={`查看 ${asset.title}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setDetailId(asset.id);
            }
          }}
          style={{ left: asset.x, top: asset.y, width: 270 }}
        >
          <Preview asset={asset} />
          <span>{asset.title}</span>
        </div>
      ));
    const cellW = 330;
    const cellH = 350;
    const startCol = Math.floor(-transform.x / transform.zoom / cellW) - 1;
    const startRow = Math.floor(-transform.y / transform.zoom / cellH) - 1;
    const cols = Math.ceil(stageSize.width / transform.zoom / cellW) + 2;
    const rows = Math.ceil(stageSize.height / transform.zoom / cellH) + 2;
    return Array.from({ length: cols * rows }, (_, index) => {
      const col = startCol + (index % cols);
      const row = startRow + Math.floor(index / cols);
      const assetIndex = (((row * 7 + col) % visible.length) + visible.length) % visible.length;
      const asset = visible[assetIndex];
      return asset ? (
        <div
          key={`${col},${row}`}
          data-asset={asset.id}
          className="stage-card infinity-card"
          role="button"
          tabIndex={0}
          aria-label={`查看 ${asset.title}`}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setDetailId(asset.id);
            }
          }}
          style={{
            left: col * cellW + (row % 2) * 55,
            top: row * cellH + (col % 2) * 35,
            width: 255,
          }}
        >
          <Preview asset={asset} />
        </div>
      ) : null;
    });
  };
  const navButton = (id: string, label: string, Icon: LucideIcon, count: number) => (
    <button
      key={id}
      type="button"
      className={`nav-item ${active === id ? "selected" : ""}`}
      onClick={() => navigate(id)}
    >
      <Icon size={18} strokeWidth={1.65} />
      <span>{label}</span>
      <small>{count}</small>
    </button>
  );

  return (
    <div
      className="app-shell"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setDropActive(true);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        void addAssets(Array.from(event.dataTransfer.files));
      }}
    >
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <a className="brand" href="/" aria-label="MUSE 首页">
          <img src="/icon.svg" alt="" />
          <span>
            muse<span className="brand-dot">.</span>
          </span>
        </a>
        <button className="library-picker" type="button" onClick={() => openModal("settings")}>
          <span className="library-avatar">L</span>
          <span>
            我的灵感库<small>Personal workspace</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-caption">
          素材库 <span>LIBRARY</span>
        </div>
        <nav aria-label="素材库导航">
          {navButton("all", "全部素材", LayoutGrid, alive.length)}
          {navButton("inbox", "收件箱", Inbox, inboxCount)}
          {navButton("favorites", "我的喜欢", Heart, favoriteCount)}
          {navButton("trash", "回收站", Trash2, deletedCount)}
        </nav>
        <div className="nav-caption collection-caption">
          收藏集
          <IconButton icon={Plus} label="新建收藏集" onClick={() => openModal("collection")} />
        </div>
        <nav aria-label="收藏集">
          {library.collections.map((collection) => (
            <button
              type="button"
              key={collection.id}
              className={`nav-item ${active === collection.id ? "selected" : ""}`}
              onClick={() => navigate(collection.id)}
            >
              <Folder
                size={18}
                color={collection.color}
                fill={`${collection.color}22`}
                strokeWidth={1.65}
              />
              <span>{collection.name}</span>
              <small>
                {alive.filter((asset) => asset.collections.includes(collection.id)).length}
              </small>
            </button>
          ))}
          <button type="button" className="new-collection" onClick={() => openModal("collection")}>
            <Plus size={15} />
            新建收藏集
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="little-note">
            <Sparkles size={17} strokeWidth={1.4} />
            <p>
              保持好奇，慢慢收集。<span>Make room for inspiration.</span>
            </p>
          </div>
          <div className="sidebar-footer">
            <IconButton icon={Settings2} label="设置" onClick={() => openModal("settings")} />
            <span>
              <i />
              本地素材库
            </span>
            <IconButton icon={CircleHelp} label="使用帮助" onClick={() => openModal("help")} />
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb">
            <IconButton
              className="mobile-menu"
              icon={Menu}
              label="打开导航"
              onClick={() => setSidebarOpen(true)}
            />
            <Columns3 size={17} />
            <span>我的灵感库</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="top-actions">
            <div className="searchbox">
              <Search size={16} />
              <input
                ref={searchRef}
                aria-label="搜索素材"
                placeholder="搜索你的灵感…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query ? (
                <button aria-label="清空搜索" onClick={() => setQuery("")}>
                  <X size={13} />
                </button>
              ) : (
                <kbd>Ctrl K</kbd>
              )}
            </div>
            <span className="top-divider" />
            <button className="avatar" title="素材库设置" onClick={() => openModal("settings")}>
              L
            </button>
          </div>
        </header>
        <section className="library-heading">
          <div>
            <div className="eyebrow">YOUR INSPIRATION, COLLECTED.</div>
            <h1>
              {title}
              <span>{scope.length}</span>
              {currentCollection && (
                <IconButton
                  icon={MoreHorizontal}
                  label="编辑收藏集"
                  onClick={() => openModal("edit-collection")}
                />
              )}
            </h1>
            <p>
              {active === "trash"
                ? "暂时告别的灵感，随时可以找回来。"
                : currentCollection
                  ? "把属于同一个想法的灵感，放在一起。"
                  : "收集让你心动的瞬间，让灵感有迹可循。"}
            </p>
          </div>
          <button type="button" className="primary-button" onClick={() => openModal("add")}>
            <Plus size={17} />
            添加素材
            <span className="button-shortcut" aria-hidden="true">
              N
            </span>
          </button>
        </section>
        <div className="library-toolbar">
          <div className="type-tabs" role="group" aria-label="素材类型">
            {[
              { id: "all", label: "全部", icon: LayoutGrid },
              { id: "image", label: "图片", icon: ImageIcon },
              { id: "video", label: "视频", icon: Video },
              { id: "link", label: "链接", icon: Link },
            ].map(({ id, label, icon: Icon }) => (
              <button
                type="button"
                key={id}
                className={filter === id ? "selected" : ""}
                onClick={() => setFilter(id)}
              >
                <Icon size={15} />
                {label}
                <small>
                  {id === "all" ? scope.length : scope.filter((asset) => asset.kind === id).length}
                </small>
              </button>
            ))}
          </div>
          <div className="toolbar-actions">
            <label className="sort-control">
              <ArrowUpDown size={14} />
              <select
                aria-label="素材排序"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setShuffleOrder(null);
                }}
              >
                <option value="newest">最近添加</option>
                <option value="oldest">最早添加</option>
                <option value="name">名称排序</option>
              </select>
              <ChevronDown size={12} />
            </label>
            <IconButton
              icon={SlidersHorizontal}
              label="筛选标签"
              active={showFilters}
              onClick={() => setShowFilters(!showFilters)}
            />
          </div>
        </div>
        {showFilters && (
          <div className="tag-filter">
            <Tag size={15} />
            <button className={!tagFilter ? "selected" : ""} onClick={() => setTagFilter("")}>
              全部标签
            </button>
            {allTags.map((tag) => (
              <button
                className={tagFilter === tag ? "selected" : ""}
                key={tag}
                onClick={() => setTagFilter(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className={`workspace ${view !== "grid" ? "stage-workspace" : ""}`} ref={workspaceRef}>
          {visible.length === 0 ? (
            <div className="empty-state">
              <div>
                <Inbox size={32} strokeWidth={1.2} />
              </div>
              <h2>
                {query || tagFilter || filter !== "all" ? "还没有找到这份灵感" : "给灵感留一个位置"}
              </h2>
              <p>
                {query || tagFilter || filter !== "all"
                  ? "试试其他关键词，或调整筛选条件。"
                  : "拖入图片、视频，或收藏一个喜欢的链接。"}
              </p>
              <button
                className="secondary-button"
                onClick={() => {
                  if (query || tagFilter || filter !== "all") {
                    setQuery("");
                    setTagFilter("");
                    setFilter("all");
                  } else openModal("add");
                }}
              >
                {query || tagFilter || filter !== "all" ? "清除筛选" : "收集第一份灵感"}
              </button>
            </div>
          ) : view === "grid" ? (
            <div className="masonry" style={{ "--card-size": `${gridSize}px` } as CSSProperties}>
              {Array.from(
                { length: Math.max(2, Math.floor((stageSize.width + 19) / (gridSize + 19))) },
                (_, column) => (
                  <div className="masonry-column" key={column}>
                    {visible
                      .filter(
                        (_, index) =>
                          index %
                            Math.max(2, Math.floor((stageSize.width + 19) / (gridSize + 19))) ===
                          column,
                      )
                      .map((asset) => (
                        <article className="asset-card" key={asset.id}>
                          <div className="asset-visual" style={{ aspectRatio: asset.ratio }}>
                            <button
                              className="open-asset"
                              aria-label={`查看 ${asset.title}`}
                              onClick={() => setDetailId(asset.id)}
                            >
                              <Preview asset={asset} />
                            </button>
                            <div className="asset-actions">
                              <button
                                className={asset.favorite ? "liked" : ""}
                                aria-label={`${asset.favorite ? "取消喜欢" : "喜欢"} ${asset.title}`}
                                onClick={() => updateAsset(asset.id, { favorite: !asset.favorite })}
                              >
                                <Heart size={15} fill={asset.favorite ? "currentColor" : "none"} />
                              </button>
                            </div>
                            {asset.kind === "video" && (
                              <span className="media-badge">
                                <Video size={12} />
                                {isVideo(asset) ? "视频" : "影像参考"}
                              </span>
                            )}
                            {asset.kind === "link" && (
                              <span className="media-badge">
                                <Link size={11} />
                                链接
                              </span>
                            )}
                          </div>
                          <button className="asset-info" onClick={() => setDetailId(asset.id)}>
                            <strong>{asset.title}</strong>
                            <span>
                              {asset.source}
                              <span>{asset.tags[0] && `# ${asset.tags[0]}`}</span>
                            </span>
                          </button>
                        </article>
                      ))}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              className={`stage ${view}`}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={() => {
                pointer.current = null;
              }}
              onWheel={(event) => {
                if (event.ctrlKey || event.metaKey)
                  setTransform((current) => ({
                    ...current,
                    zoom: Math.min(1.6, Math.max(0.3, current.zoom - event.deltaY * 0.002)),
                  }));
                else
                  setTransform((current) => ({
                    ...current,
                    x: current.x - event.deltaX,
                    y: current.y - event.deltaY,
                  }));
              }}
            >
              <div
                className="stage-inner"
                style={{
                  transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
                }}
              >
                {stageAssets()}
              </div>
              <span className="stage-hint">
                <Move size={13} />
                {view === "canvas"
                  ? "拖动素材，自由编排 · 拖动空白处漫游"
                  : "随意漫游，与灵感不期而遇"}
              </span>
            </div>
          )}
        </div>
        <footer className="statusbar">
          <span className="save-status">
            <i className={saveStatus.includes("失败") ? "error" : ""} />
            {saveStatus}
          </span>
          <span>
            {query ? `找到 ${visible.length} 项` : `${visible.length} 份灵感，等一个好想法`}
          </span>
        </footer>
        <div className="view-dock">
          <div className="view-switcher" role="group" aria-label="浏览视图">
            {[
              { id: "grid", icon: LayoutGrid, label: "网格" },
              { id: "canvas", icon: Move, label: "画布" },
              { id: "infinity", icon: InfinityIcon, label: "Infinity" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                className={view === id ? "selected" : ""}
                aria-pressed={view === id}
                key={id}
                onClick={() => changeView(id as View)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <span className="dock-divider" />
          <IconButton icon={Shuffle} label="随机漫游" onClick={shuffle} />
        </div>
        <div className="zoom-dock">
          <IconButton
            icon={ZoomOut}
            label="缩小"
            onClick={() =>
              view === "grid"
                ? setGridSize((size) => Math.max(160, size - 40))
                : setTransform((current) => ({
                    ...current,
                    zoom: Math.max(0.3, current.zoom - 0.1),
                  }))
            }
          />
          <span>
            {view === "grid"
              ? `${Math.round((gridSize / 260) * 100)}%`
              : `${Math.round(transform.zoom * 100)}%`}
          </span>
          <IconButton
            icon={ZoomIn}
            label="放大"
            onClick={() =>
              view === "grid"
                ? setGridSize((size) => Math.min(480, size + 40))
                : setTransform((current) => ({
                    ...current,
                    zoom: Math.min(1.6, current.zoom + 0.1),
                  }))
            }
          />
          {view !== "grid" && (
            <button
              className="reset-view"
              onClick={() => setTransform({ x: 40, y: 30, zoom: 0.8 })}
            >
              归位
            </button>
          )}
        </div>
      </main>
      <input
        type="file"
        ref={fileRef}
        className="visually-hidden"
        accept="image/*,video/*"
        multiple
        onChange={(event) => void addAssets(Array.from(event.target.files ?? []))}
      />
      <input
        type="file"
        ref={backupRef}
        className="visually-hidden"
        accept="application/json,.json"
        onChange={(event) => void importLibrary(event.target.files?.[0])}
      />
      {modal === "add" && (
        <ModalFrame title="收集一份新灵感" onClose={() => setModal(null)}>
          <p className="dialog-description">留住此刻打动你的图片、视频或链接。</p>
          <div className="dialog-tabs">
            <button
              className={addTab === "file" ? "selected" : ""}
              onClick={() => setAddTab("file")}
            >
              <ImagePlus size={16} />
              本地文件
            </button>
            <button
              className={addTab === "link" ? "selected" : ""}
              onClick={() => setAddTab("link")}
            >
              <Link size={16} />
              网页链接
            </button>
          </div>
          {addTab === "file" ? (
            <>
              <button
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <div>
                  <Upload size={26} strokeWidth={1.3} />
                </div>
                <strong>{busy ? "正在收集…" : "点击选择，或把素材拖到这里"}</strong>
                <span>支持图片与视频 · 可一次添加多个文件</span>
                <small>单个文件最大 100 MB</small>
              </button>
              <p className="privacy-note">
                <span className="green-dot" />
                文件保存在当前设备，由你掌控。
              </p>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addLink();
              }}
            >
              <label className="field">
                链接地址
                <input
                  autoFocus
                  type="url"
                  placeholder="https://"
                  required
                  value={formUrl}
                  onChange={(event) => setFormUrl(event.target.value)}
                />
              </label>
              <label className="field">
                标题 <span>可选</span>
                <input
                  maxLength={200}
                  placeholder="为这份灵感起个名字"
                  value={formName}
                  onChange={(event) => setFormName(event.target.value)}
                />
              </label>
              {formError && <p className="form-error">{formError}</p>}
              <button type="submit" className="primary-button full-width">
                <Plus size={16} />
                保存链接
              </button>
            </form>
          )}
          {currentCollection && <p className="dialog-note">将添加到「{currentCollection.name}」</p>}
        </ModalFrame>
      )}
      {(modal === "collection" || modal === "edit-collection") && (
        <ModalFrame
          title={modal === "collection" ? "为灵感建一个收藏集" : "编辑收藏集"}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              newCollection();
            }}
          >
            <label className="field">
              收藏集名称
              <input
                autoFocus
                maxLength={60}
                placeholder="例如：下一次旅行的灵感"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
              />
            </label>
            <label className="field">选择一个颜色</label>
            <div className="color-picker">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`颜色 ${color}`}
                  style={{ background: color }}
                  onClick={() => setFormColor(color)}
                >
                  {color === formColor && <Check size={16} />}
                </button>
              ))}
            </div>
            {formError && <p className="form-error">{formError}</p>}
            <div className="dialog-buttons">
              {modal === "edit-collection" && (
                <button className="danger-text" type="button" onClick={deleteCollection}>
                  移除收藏集
                </button>
              )}
              <button type="submit" className="primary-button">
                {modal === "collection" ? "创建收藏集" : "保存更改"}
              </button>
            </div>
          </form>
        </ModalFrame>
      )}
      {modal === "settings" && (
        <ModalFrame title="我的灵感库" onClose={() => setModal(null)}>
          <p className="dialog-description">让这个小小的灵感空间，更像你。</p>
          <div className="setting-row">
            <span>
              <strong>界面外观</strong>
              <small>选择适合你的浏览方式</small>
            </span>
            <select
              aria-label="界面外观"
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
          <div className="setting-row">
            <span>
              <strong>备份素材库</strong>
              <small>导出素材、收藏集与标签，方便迁移</small>
            </span>
            <button
              disabled={busy}
              className="secondary-button"
              onClick={() => void exportLibrary()}
            >
              <ArrowDownToLine size={14} />
              {busy ? "处理中…" : "导出备份"}
            </button>
          </div>
          <div className="setting-row">
            <span>
              <strong>导入备份</strong>
              <small>合并 MUSE 备份，保留现有素材</small>
            </span>
            <button
              disabled={busy}
              className="secondary-button"
              onClick={() => backupRef.current?.click()}
            >
              <Upload size={14} />
              选择文件
            </button>
          </div>
          <div className="storage-note">
            <Folder size={19} />
            <p>
              <strong>灵感属于你</strong>
              <span>
                素材保存在当前设备。不同设备之间可用备份迁移；自动云同步尚未接入。清理浏览器数据前，请先导出备份。
              </span>
            </p>
          </div>
          <div className="settings-credit">
            MUSE 0.1.0 <span>Made for curious minds.</span>
          </div>
          <DesktopUpdates />
        </ModalFrame>
      )}
      {modal === "help" && (
        <ModalFrame title="给好奇心，留一点空间" onClose={() => setModal(null)}>
          <p className="dialog-description">你的图片、视频和链接，都可以在这里找到归处。</p>
          <div className="help-list">
            <p>
              <ImagePlus size={19} />
              <span>
                <strong>随手收集</strong>点击「添加素材」或直接拖入文件。
              </span>
            </p>
            <p>
              <FolderPlus size={19} />
              <span>
                <strong>慢慢整理</strong>打开素材，添加标签并放进收藏集。
              </span>
            </p>
            <p>
              <Move size={19} />
              <span>
                <strong>自由编排</strong>在画布里拖动素材，在 Infinity 中无限漫游。
              </span>
            </p>
          </div>
          <div className="shortcuts">
            <span>
              搜索 <kbd>Ctrl K</kbd>
            </span>
            <span>
              添加素材 <kbd>N</kbd>
            </span>
            <span>
              切换视图 <kbd>1 / 2 / 3</kbd>
            </span>
          </div>
        </ModalFrame>
      )}
      {detail && (
        <ModalFrame title={kindLabels[detail.kind]} onClose={() => setDetailId(null)} wide>
          <div className="detail-layout">
            <div className="detail-preview">
              <Preview asset={detail} detail />
            </div>
            <div className="detail-inspector">
              <label className="field">
                素材名称
                <input
                  aria-label="素材名称"
                  value={detail.title}
                  maxLength={200}
                  onChange={(event) => {
                    if (event.target.value) updateAsset(detail.id, { title: event.target.value });
                  }}
                />
              </label>
              <div className="detail-source">
                {detail.source}
                <span>{new Date(detail.createdAt).toLocaleDateString("zh-CN")}</span>
              </div>
              <button
                className={`like-button ${detail.favorite ? "liked" : ""}`}
                onClick={() => updateAsset(detail.id, { favorite: !detail.favorite })}
              >
                <Heart size={17} fill={detail.favorite ? "currentColor" : "none"} />
                {detail.favorite ? "已加入喜欢" : "加入喜欢"}
              </button>
              <label className="field">
                标签
                <input
                  aria-label="素材标签"
                  placeholder="用逗号分隔，例如：设计，自然"
                  defaultValue={detail.tags.join("，")}
                  key={detail.id}
                  onBlur={(event) =>
                    updateAsset(detail.id, {
                      tags: [
                        ...new Set(
                          event.target.value
                            .split(/[,，]/u)
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        ),
                      ].slice(0, 50),
                    })
                  }
                />
              </label>
              <div className="detail-tags">
                {detail.tags.map((tag) => (
                  <span key={tag}># {tag}</span>
                ))}
              </div>
              <div className="field">收藏集</div>
              <div className="collection-checkboxes">
                {library.collections.map((collection) => (
                  <label key={collection.id}>
                    <input
                      type="checkbox"
                      checked={detail.collections.includes(collection.id)}
                      onChange={(event) =>
                        updateAsset(detail.id, {
                          collections: event.target.checked
                            ? [...detail.collections, collection.id]
                            : detail.collections.filter((id) => id !== collection.id),
                        })
                      }
                    />
                    <Folder size={15} color={collection.color} />
                    {collection.name}
                  </label>
                ))}
              </div>
              {detail.kind === "link" && (
                <a
                  className="secondary-button full-width"
                  href={detail.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  打开原始链接
                </a>
              )}
              {detail.kind !== "link" && (
                <a
                  className="secondary-button full-width"
                  href={detail.url}
                  download={detail.title}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ArrowDownToLine size={15} />
                  保存素材
                </a>
              )}
              <button
                className="danger-text trash-button"
                onClick={() => {
                  updateAsset(detail.id, { deleted: !detail.deleted });
                  setDetailId(null);
                  notify(detail.deleted ? "素材已恢复" : "已移入回收站，可随时恢复");
                }}
              >
                <Trash2 size={15} />
                {detail.deleted ? "恢复素材" : "移入回收站"}
              </button>
            </div>
          </div>
        </ModalFrame>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="关闭提示" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {dropActive && (
        <div className="drop-overlay" onDragLeave={() => setDropActive(false)}>
          <div>
            <Upload size={40} strokeWidth={1.3} />
            <h2>松开，把灵感留下</h2>
            <p>图片与视频，将收进你的素材库</p>
          </div>
        </div>
      )}
    </div>
  );
}
