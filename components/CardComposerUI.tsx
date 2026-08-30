"use client";

import { useEffect, useRef, useState } from "react";

type ToneKey = "blue" | "orange" | "silver" | "green" | "sunset";
type RareType = "ノーマル" | "レア" | "キラ" | "にじ" | "でんせつ";
type Weather = "晴れ" | "くもり" | "雨" | "雪";

type CardData = {
  name: string;
  comment: string;
  tone: ToneKey;
  rare: RareType;
  date: string;
  weather: Weather;
  temperature: number | null;
};

const tones: Record<ToneKey, { label: string; stops: [string, string, string] }> = {
  blue: { label: "青系", stops: ["#eaf6ff", "#4cc3ff", "#0b5fb0"] },
  orange: { label: "オレンジ系", stops: ["#ffe8d1", "#ff9a4d", "#c8430f"] },
  silver: { label: "シルバー系", stops: ["#ffffff", "#c7d0d8", "#79838d"] },
  green: { label: "緑系", stops: ["#eafbea", "#7fd68a", "#256b3c"] },
  sunset: { label: "夕焼け系", stops: ["#ffe6da", "#ffb37a", "#c73f66"] },
};

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const weatherOptions: Weather[] = ["晴れ", "くもり", "雨", "雪"];

function hashText(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

function rollRare(seed: number): RareType {
  const n = seed % 100;
  if (n < 40) return "ノーマル";
  if (n < 68) return "レア";
  if (n < 86) return "キラ";
  if (n < 97) return "にじ";
  return "でんせつ";
}

function formatDate(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}.${m}.${day}`;
}

function buildCard(
  name: string,
  comment: string,
  tone: ToneKey,
  weather: Weather,
  temperature: number | null,
  seed: number
): CardData {
  return {
    name: name || "（ここに名前が入ります）",
    comment: comment.trim() || "（あればフリーコメントが入ります）",
    tone,
    rare: rollRare(seed + 17),
    date: formatDate(new Date()),
    weather,
    temperature,
  };
}

function sanitizeFileName(name: string) {
  return (name || "card").replace(/[\\/:*?"<>|]/g, "_");
}

export default function CardComposerUI() {
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [tone, setTone] = useState<ToneKey>("blue");
  const [weather, setWeather] = useState<Weather>("晴れ");
  const [temperatureInput, setTemperatureInput] = useState("");
  const [artUrl, setArtUrl] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const [seedTick, setSeedTick] = useState(1);
  const [card, setCard] = useState<CardData>(() => buildCard("", "", "blue", "晴れ", null, 1));

  const [imgOffset, setImgOffset] = useState({ x: 0, y: 0 });
  const [imgScale, setImgScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);

  const [isShiny, setIsShiny] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const doRoll = () => {
    setRolling(true);
    const seed = hashText(`${name}-${seedTick}-${Date.now()}`);
    const temperature = temperatureInput.trim() === "" ? null : Number(temperatureInput);
    const result = buildCard(name, comment, tone, weather, temperature, seed);
    setSeedTick((v) => v + 1);

    window.setTimeout(() => {
      setCard(result);
      setRolling(false);
    }, 650);
  };

  const resetAll = () => {
    setName("");
    setComment("");
    setArtUrl(null);
    setImgSize(null);
    setTone("blue");
    setWeather("晴れ");
    setTemperatureInput("");
    setCard(buildCard("", "", "blue", "晴れ", null, 1));
    setImgOffset({ x: 0, y: 0 });
    setImgScale(1);
    setIsShiny(false);
    setSeedTick(2);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!artUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    setIsDragging(true);
    setDragStart({
      x: e.clientX * scaleX - imgOffset.x,
      y: e.clientY * scaleY - imgOffset.y,
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !imgSize) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let newX = e.clientX * scaleX - dragStart.x;
    let newY = e.clientY * scaleY - dragStart.y;

    // 余白が出ないように限界値を計算してクランプ（制限）する
    const artW = canvas.width - 44;
    const artH = canvas.height - 44;
    const baseScale = Math.max(artW / imgSize.width, artH / imgSize.height);
    const currentScale = baseScale * imgScale;

    const drawW = imgSize.width * currentScale;
    const drawH = imgSize.height * currentScale;

    const maxOffsetX = Math.max(0, (drawW - artW) / 2);
    const maxOffsetY = Math.max(0, (drawH - artH) / 2);

    newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
    newY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newY));

    setImgOffset({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${sanitizeFileName(card.name)}_${card.rare}.png`;
    link.click();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    const drawRoundRect = (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      fill?: string | CanvasGradient,
      stroke?: string | CanvasGradient,
      lineWidth = 1
    ) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }
      if (stroke) {
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    };

    const drawOutlineText = (
      text: string,
      x: number,
      y: number,
      outlineColor: string,
      fillColor: string,
      lineWidth = 4,
      maxWidth?: number
    ) => {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = lineWidth;
      ctx.lineJoin = "round";
      if (maxWidth !== undefined) {
        ctx.strokeText(text, x, y, maxWidth);
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y, maxWidth);
      } else {
        ctx.strokeText(text, x, y);
        ctx.fillStyle = fillColor;
        ctx.fillText(text, x, y);
      }
    };

    const artX = 22;
    const artY = 22;
    const artW = W - 44;
    const artH = H - 44;

    const drawFallbackBg = () => {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#2c3e50");
      bg.addColorStop(1, "#000000");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2, 200, 200, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 60px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("NO IMAGE", W / 2, H / 2 + 20);
      ctx.textAlign = "left";
    };

    const drawRareOverlay = () => {
      if (card.rare === "ノーマル") return;

      ctx.globalCompositeOperation = "color-dodge";

      const isHighRare = card.rare === "にじ" || card.rare === "でんせつ";
      const particleCount = card.rare === "でんせつ" ? 80 : card.rare === "にじ" ? 50 : card.rare === "キラ" ? 30 : 15;

      for (let i = 0; i < particleCount; i += 1) {
        ctx.fillStyle = isHighRare
          ? `hsla(${(i * 50) % 360}, 100%, 70%, 0.5)`
          : `rgba(255,255,255,${card.rare === "キラ" ? 0.3 : 0.15})`;
        ctx.beginPath();
        const px = 40 + ((i * 137) % (W - 80));
        const py = 40 + ((i * 181) % (H - 80));
        ctx.arc(px, py, 2 + (i % 6), 0, Math.PI * 2);
        ctx.fill();
      }

      if (isHighRare) {
        const rb = ctx.createLinearGradient(0, 0, W, H);
        rb.addColorStop(0, `rgba(255, 0, 0, 0.15)`);
        rb.addColorStop(0.2, `rgba(255, 165, 0, 0.15)`);
        rb.addColorStop(0.4, `rgba(255, 255, 0, 0.15)`);
        rb.addColorStop(0.6, `rgba(0, 128, 0, 0.15)`);
        rb.addColorStop(0.8, `rgba(0, 0, 255, 0.15)`);
        rb.addColorStop(1, `rgba(128, 0, 128, 0.15)`);
        ctx.fillStyle = rb;
        ctx.fillRect(artX, artY, artW, artH);

        ctx.lineWidth = 2;
        const lineSpacing = 30;
        for (let i = -H; i < W; i += lineSpacing) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + (i % 3) * 0.05})`;
          ctx.moveTo(i, 0);
          ctx.lineTo(i + H, H);
          ctx.stroke();
        }
      }

      if (card.rare === "でんせつ") {
        for (let i = 0; i < 40; i += 1) {
          const x = 30 + ((i * 113) % (W - 60));
          const y = 30 + ((i * 157) % (H - 60));
          ctx.strokeStyle = "rgba(255,215,0,0.6)";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x - 15, y);
          ctx.lineTo(x + 15, y);
          ctx.moveTo(x, y - 15);
          ctx.lineTo(x, y + 15);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const drawMeta = () => {
      // 1. Name (top-left)
      ctx.textAlign = "left";
      ctx.font = "italic bold 52px sans-serif";
      const maxNameWidth = W - 40 - 160;
      drawOutlineText(card.name, 40, 80, "#ffffff", "#000000", 6, maxNameWidth);
      drawOutlineText(card.name, 40, 80, "#000000", "#ffffff", 2, maxNameWidth);

      // 1.5 Free comment (below name, smaller font)
      ctx.font = "bold 24px sans-serif";
      const maxCommentWidth = W - 80;
      drawOutlineText(card.comment, 40, 122, "#ffffff", "#000000", 4, maxCommentWidth);
      drawOutlineText(card.comment, 40, 122, "#000000", "#ffffff", 1.5, maxCommentWidth);

      // 2. Tone accent chip (top-right)
      const toneStopsChip = tones[card.tone].stops;
      const chipX = W - 90;
      const chipY = 80;
      const chipR = 27;
      const chip = ctx.createRadialGradient(chipX, chipY, 4, chipX, chipY, chipR);
      chip.addColorStop(0, "#ffffff");
      chip.addColorStop(0.35, toneStopsChip[1]);
      chip.addColorStop(1, toneStopsChip[2]);
      ctx.fillStyle = chip;
      ctx.beginPath();
      ctx.arc(chipX, chipY, chipR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 3. Meta info (date / weather / temperature) — bottom-right corner, one line, small, unobtrusive
      const metaParts = [card.date, `天気：${card.weather}`];
      if (card.temperature !== null) {
        metaParts.push(`気温：${card.temperature}℃`);
      }
      const metaLines = [metaParts.join("  ・  ")];

      const lineHeight = 26;
      const padX = 16;
      const padY = 12;
      ctx.font = "bold 20px sans-serif";
      const boxW = Math.max(...metaLines.map((l) => ctx.measureText(l).width)) + padX * 2;
      const boxH = metaLines.length * lineHeight + padY * 2 - 6;
      const boxX = artX + artW - boxW - 16;
      const boxY = artY + artH - boxH - 16;

      drawRoundRect(boxX, boxY, boxW, boxH, 0, "rgba(0,0,0,0.55)");
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      metaLines.forEach((line, index) => {
        ctx.fillText(line, boxX + padX, boxY + padY + lineHeight * (index + 1) - 8);
      });
    };

    const drawOuterFrame = () => {
      const toneStopsFrame = tones[card.tone].stops;

      if (isShiny) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.rect(artX, artY, artW, artH);
        ctx.clip("evenodd");

        const createMetallicGradient = (x1: number, y1: number, x2: number, y2: number) => {
          const grad = ctx.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, toneStopsFrame[0]);
          grad.addColorStop(0.2, toneStopsFrame[1]);
          grad.addColorStop(0.5, toneStopsFrame[2]);
          grad.addColorStop(0.8, toneStopsFrame[1]);
          grad.addColorStop(1, toneStopsFrame[0]);
          return grad;
        };

        ctx.fillStyle = createMetallicGradient(0, 0, W, H);
        ctx.fillRect(0, 0, W, H);

        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
        ctx.strokeRect(10, 10, W - 20, H - 20);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.strokeRect(14, 14, W - 28, H - 28);

        ctx.lineWidth = 6;
        ctx.strokeStyle = createMetallicGradient(W, 0, 0, H);
        ctx.strokeRect(4, 4, W - 8, H - 8);

        const drawOrnament = (cx: number, cy: number, signX: number, signY: number) => {
          ctx.save();
          ctx.translate(cx, cy);

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(signX * 80, 0);
          ctx.lineTo(signX * 90, signY * 25);
          ctx.lineTo(signX * 25, signY * 90);
          ctx.lineTo(0, signY * 80);
          ctx.closePath();
          ctx.fillStyle = createMetallicGradient(0, 0, signX * 90, signY * 90);
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffffff";
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(signX * 20, signY * 20);
          ctx.lineTo(signX * 45, signY * 15);
          ctx.lineTo(signX * 50, signY * 40);
          ctx.lineTo(signX * 25, signY * 45);
          ctx.closePath();
          ctx.fillStyle = toneStopsFrame[0];
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = toneStopsFrame[1];
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(signX * 25, signY * 25);
          ctx.lineTo(signX * 40, signY * 20);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.restore();
        };

        drawOrnament(0, 0, 1, 1);
        drawOrnament(W, 0, -1, 1);
        drawOrnament(0, H, 1, -1);
        drawOrnament(W, H, -1, -1);

        const drawFlare = (fx: number, fy: number, size: number) => {
          ctx.globalCompositeOperation = "screen";
          const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, size);
          grad.addColorStop(0, "rgba(255, 255, 255, 1)");
          grad.addColorStop(0.2, hexToRgba(toneStopsFrame[1], 0.9));
          grad.addColorStop(1, hexToRgba(toneStopsFrame[1], 0));
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(fx, fy, size, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
          ctx.lineWidth = size * 0.15;
          ctx.moveTo(fx - size * 2.5, fy);
          ctx.lineTo(fx + size * 2.5, fy);
          ctx.moveTo(fx, fy - size * 2.5);
          ctx.lineTo(fx, fy + size * 2.5);
          ctx.stroke();

          ctx.beginPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
          ctx.lineWidth = size * 0.08;
          ctx.moveTo(fx - size * 1.5, fy - size * 1.5);
          ctx.lineTo(fx + size * 1.5, fy + size * 1.5);
          ctx.moveTo(fx - size * 1.5, fy + size * 1.5);
          ctx.lineTo(fx + size * 1.5, fy - size * 1.5);
          ctx.stroke();

          ctx.globalCompositeOperation = "source-over";
        };

        drawFlare(20, 20, 60);
        drawFlare(W - 20, 20, 75);
        drawFlare(20, H - 20, 65);
        drawFlare(W - 20, H - 20, 55);
        drawFlare(W / 2, 20, 40);
        drawFlare(W / 2, H - 20, 40);
        drawFlare(20, H / 2, 40);
        drawFlare(W - 20, H / 2, 40);

        for (let i = 0; i < 120; i++) {
          const px = Math.random() * W;
          const py = Math.random() * H;
          drawFlare(px, py, Math.random() * 10 + 5);
        }

        ctx.restore();

        const innerStroke = ctx.createLinearGradient(0, H, W, 0);
        innerStroke.addColorStop(0, toneStopsFrame[0]);
        innerStroke.addColorStop(0.5, "#ffffff");
        innerStroke.addColorStop(1, toneStopsFrame[2]);
        drawRoundRect(artX, artY, artW, artH, 0, undefined, innerStroke, 4);
        drawRoundRect(artX - 2, artY - 2, artW + 4, artH + 4, 0, undefined, "rgba(255,255,255,0.8)", 2);
      } else {
        const frameStroke = ctx.createLinearGradient(0, 0, W, H);
        frameStroke.addColorStop(0, toneStopsFrame[0]);
        frameStroke.addColorStop(0.5, toneStopsFrame[1]);
        frameStroke.addColorStop(1, toneStopsFrame[2]);

        ctx.strokeStyle = frameStroke;
        ctx.lineWidth = 36;
        ctx.strokeRect(0, 0, W, H);

        const glowStroke = ctx.createLinearGradient(artX, artY, W - artX, H - artY);
        glowStroke.addColorStop(0, "rgba(255,255,255,0.9)");
        glowStroke.addColorStop(0.5, hexToRgba(toneStopsFrame[0], 0.5));
        glowStroke.addColorStop(1, "rgba(255,255,255,0.9)");
        drawRoundRect(artX - 6, artY - 6, artW + 12, artH + 12, 0, undefined, glowStroke, 2);

        const drawCornerAccent = (cx: number, cy: number) => {
          const s = 14;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = toneStopsFrame[2];
          ctx.fillRect(-s / 2, -s / 2, s, s);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.strokeRect(-s / 2, -s / 2, s, s);
          ctx.restore();
        };
        const cornerInset = 20;
        drawCornerAccent(cornerInset, cornerInset);
        drawCornerAccent(W - cornerInset, cornerInset);
        drawCornerAccent(cornerInset, H - cornerInset);
        drawCornerAccent(W - cornerInset, H - cornerInset);
      }
    };

    if (artUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.save();
        drawRoundRect(artX, artY, artW, artH, 0);
        ctx.clip();

        ctx.fillStyle = "#eef4f8";
        ctx.fillRect(artX, artY, artW, artH);

        const baseScale = Math.max(artW / img.width, artH / img.height);
        const currentScale = baseScale * imgScale;

        const drawW = img.width * currentScale;
        const drawH = img.height * currentScale;

        const drawX = artX + (artW - drawW) / 2 + imgOffset.x;
        const drawY = artY + (artH - drawH) / 2 + imgOffset.y;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        ctx.restore();

        drawOuterFrame();
        drawRareOverlay();
        drawMeta();
      };
      img.src = artUrl;
    } else {
      ctx.save();
      drawRoundRect(artX, artY, artW, artH, 0);
      ctx.clip();
      drawFallbackBg();
      ctx.restore();

      drawOuterFrame();
      drawRareOverlay();
      drawMeta();
    }
  }, [artUrl, card, imgOffset, imgScale, isShiny]);

  return (
    <div className="page-shell">
      <div className="page-grid">
        <div className="panel left-panel">
          <h1 className="title">記念カード作成</h1>
          <p className="sub">
            名前と写真を入れて、
            記念カードを作ります。
          </p>

          <div className="block">
            <label className="label">名前を入れる</label>
            <input
              className="text-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="名前"
              style={{ marginBottom: "10px" }}
            />

            <label className="label">コメント（任意）</label>
            <input
              className="text-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="（あればフリーコメントが入ります）"
            />
          </div>

          <div className="block">
            <label className="label">トーン（色味）</label>
            <select
              className="text-input"
              value={tone}
              onChange={(e) => setTone(e.target.value as ToneKey)}
              style={{ marginBottom: "10px" }}
            >
              {Object.entries(tones).map(([key, t]) => (
                <option key={key} value={key}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="label">天気</label>
            <select
              className="text-input"
              value={weather}
              onChange={(e) => setWeather(e.target.value as Weather)}
              style={{ marginBottom: "10px" }}
            >
              {weatherOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            <label className="label">気温（任意）</label>
            <input
              className="text-input"
              type="number"
              value={temperatureInput}
              onChange={(e) => setTemperatureInput(e.target.value)}
              placeholder="例：18（空欄でもOK）"
            />
          </div>

          <div className="block">
            <label
              className="label"
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "bold" }}
            >
              <input
                type="checkbox"
                checked={isShiny}
                onChange={(e) => setIsShiny(e.target.checked)}
                style={{ width: "20px", height: "20px" }}
              />
              ラメ仕上げ（豪華枠）
            </label>
          </div>

          <div className="block">
            <input
              ref={fileRef}
              className="hidden-file"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const url = URL.createObjectURL(file);

                const img = new Image();
                img.onload = () => {
                  setImgSize({ width: img.width, height: img.height });
                };
                img.src = url;

                setArtUrl(url);
                setImgOffset({ x: 0, y: 0 });
                setImgScale(1);
              }}
            />
            <button className="upload-btn" onClick={() => fileRef.current?.click()}>
              画像をえらぶ
            </button>
          </div>

          {artUrl && (
            <div className="block">
              <label className="label">画像のズーム: {imgScale.toFixed(2)}x</label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={imgScale}
                onChange={(e) => {
                  const newScale = parseFloat(e.target.value);
                  setImgScale(newScale);
                  if (imgSize) {
                    const canvas = canvasRef.current;
                    if (canvas) {
                      const artW = canvas.width - 44;
                      const artH = canvas.height - 44;
                      const baseScale = Math.max(artW / imgSize.width, artH / imgSize.height);
                      const currentScale = baseScale * newScale;
                      const drawW = imgSize.width * currentScale;
                      const drawH = imgSize.height * currentScale;
                      const maxOffsetX = Math.max(0, (drawW - artW) / 2);
                      const maxOffsetY = Math.max(0, (drawH - artH) / 2);

                      setImgOffset((prev) => ({
                        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, prev.x)),
                        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, prev.y)),
                      }));
                    }
                  }
                }}
                className="range-input"
                style={{ width: "100%", marginTop: "5px" }}
              />
              <p className="sub" style={{ fontSize: "12px", marginTop: "5px", color: "#666" }}>
                ※ 下のプレビュー画像をドラッグすると位置を移動できます。
              </p>
            </div>
          )}

          <div className="actions">
            <button
              className={`action-btn roll-btn ${rolling ? "rolling" : ""}`}
              onClick={doRoll}
              disabled={rolling}
            >
              {rolling ? "生成中..." : "生成する"}
            </button>

            <button className="action-btn reset-btn" onClick={resetAll}>
              戻す
            </button>

            <button className="action-btn save-btn" onClick={saveImage}>
              保存
            </button>
          </div>
        </div>

        <div className="panel right-panel">
          <div className="preview-title">できあがり</div>
          <div className="preview-wrap">
            <canvas
              ref={canvasRef}
              width={744}
              height={1039}
              className="preview-canvas"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                cursor: artUrl ? (isDragging ? "grabbing" : "grab") : "default",
                touchAction: "none",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
