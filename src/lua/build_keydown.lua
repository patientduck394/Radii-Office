-- build_keydown.lua — build-time entry point, pure Lua, zero dependencies!
-- Run from repo root: lua lua/build_keydown.lua
-- Emits: imbuer/keydown.json, formly/keydown.json (committed data artifacts)!

local script_dir = debug.getinfo(1, "S").source:match("@(.*/)") or "lua/"
local root = script_dir .. "../"
local kd = dofile(script_dir .. "keydown.lua")

-- Minimal JSON writer with FIXED key order for stable diffs!
local function esc(s)
  return '"' .. s:gsub('\\', '\\\\'):gsub('"', '\\"')
    :gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t') .. '"'
end

local function def_to_json(d)
  local parts = { '"open":' .. esc(d.open), '"close":' .. esc(d.close) }
  if d.className then parts[#parts + 1] = '"className":' .. esc(d.className) end
  if d.tagName then parts[#parts + 1] = '"tagName":' .. esc(d.tagName) end
  if d.isItalic ~= nil then
    parts[#parts + 1] = '"isItalic":' .. (d.isItalic and "true" or "false")
  end
  return "{" .. table.concat(parts, ",") .. "}"
end

local function bundle_to_json(list)
  local items = {}
  for i, d in ipairs(list) do items[i] = def_to_json(d) end
  return "[" .. table.concat(items, ",") .. "]"
end

local function write(path, content)
  local f = assert(io.open(path, "w"))
  f:write(content)
  f:close()
end

local apps = { "imbuer", "formly" }
for _, app in ipairs(apps) do
  local list = assert(kd[app], "unknown app bundle: " .. app)
  write(root .. app .. "/keydown.json", bundle_to_json(list))
  print(app .. ": " .. #list .. " definitions -> " .. app .. "/keydown.json!")
end
print("Wrote imbuer/keydown.json, formly/keydown.json!")
