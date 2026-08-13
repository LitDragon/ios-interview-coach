import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("./index.html", import.meta.url), "utf8");
const mainFields = html.match(/<div class="fields">([\s\S]*?)<\/div>\s*<details>/)?.[1] ?? "";

assert.match(mainFields, /id="baseCooldown"/, "技能基础冷却输入框必须位于主输入区");
assert.match(html, /baseCooldown:\s*numberValue\(fields\.baseCooldown/, "基础冷却必须进入计算状态");
assert.match(html, /baseCooldownFrames\s*=\s*state\.baseCooldown\s*\*\s*FPS/, "基础冷却必须参与帧数计算");
assert.match(html, /\{ min: 201, max: 233, frames: 11 \}/, "204% 急速必须落在 11f 档位");
assert.doesNotMatch(html, /const BASE_COOLDOWN_SECONDS\s*=/, "基础冷却不能继续固定为常量");

console.log("CALCULATOR_REGRESSION_OK: base cooldown is editable; 204% haste maps to 11f");
