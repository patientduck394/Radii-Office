-- build_data.lua — build-time data entry point, pure Lua, zero dependencies!
-- Run from repo root: lua lua/build_data.lua
-- Emits: imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!
-- (Replaces the removed julia/scripts/build.jl with identical sample inputs!)

local script_dir = debug.getinfo(1, "S").source:match("@(.*/)") or "lua/"
local root = script_dir .. "../"
local imbuer = dofile(script_dir .. "engines/imbuer.lua")
local mainkey = dofile(script_dir .. "engines/mainkey.lua")
local inkpath = dofile(script_dir .. "engines/inkpath.lua")

local function esc(s)
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"')
    :gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t') .. '"'
end

local function num(n)
  if math.type(n) == "integer" then return string.format("%d", n) end
  return string.format("%.17g", n)
end

local function write(path, content)
  local f = assert(io.open(path, "w"))
  f:write(content)
  f:close()
end

-- 1. Imbuer: same sample sheet the old Julia build used!
local sheet = {
  A1 = "10", A2 = "20", A3 = "30",
  A4 = "=SUM(A1:A3)", A5 = "=AVG(A1:A4)",
  B1 = "=MIN(A1:A3)", B2 = "=MAX(A1:A3)", B3 = "=COUNT(A1:A5)",
}
local evaluated = imbuer.evaluate_sheet(sheet)
local eval_str = {}
for k, v in pairs(evaluated) do eval_str[k] = tostring(v) end
local avec = imbuer.get_range_values(eval_str, "A1", "A5")
local stats = imbuer.column_stats(avec)

local order = { "A1", "A4", "B3", "A2", "A3", "B1", "B2", "A5" }
local eval_parts = {}
for _, k in ipairs(order) do
  local v = evaluated[k]
  local enc = type(v) == "string" and esc(v) or num(v)
  eval_parts[#eval_parts + 1] = esc(k) .. ":" .. enc
end
local imbuer_json = '{"generator":"lua-build","column_A_stats":'
  .. '{"mean":' .. num(stats.mean) .. ',"min":' .. num(stats.min)
  .. ',"sum":' .. num(stats.sum) .. ',"max":' .. num(stats.max)
  .. ',"count":' .. num(stats.count) .. '},"evaluated":{'
  .. table.concat(eval_parts, ",") .. "}}"
write(root .. "imbuer/computed.json", imbuer_json)
print("imbuer: A4=" .. tostring(evaluated.A4) .. " A5=" .. tostring(evaluated.A5)
  .. " B1=" .. tostring(evaluated.B1) .. " B2=" .. tostring(evaluated.B2)
  .. " B3=" .. tostring(evaluated.B3) .. "!")

-- 2. Mainkey: same sample records the old Julia build used!
local fields = {
  { id = "title", name = "Title", type = "text" },
  { id = "status", name = "Status", type = "tag" },
  { id = "value", name = "Value", type = "number" },
}
local records = {
  { id = 1, title = "Project Alpha", status = "In Progress", value = 1200 },
  { id = 2, title = "Radii Game Asset", status = "Completed", value = 450 },
  { id = 3, title = "Project Beta", status = "In Progress", value = 800 },
}
local index = mainkey.build_index(records, fields)
local filtered = mainkey.filter_records(records, "alpha")
local sorted = mainkey.sort_records(records, "value")

local function rec_json(r)
  return '{"title":' .. esc(r.title) .. ',"id":' .. num(r.id)
    .. ',"status":' .. esc(r.status) .. ',"value":' .. num(r.value) .. "}"
end
local function rec_list(list)
  local parts = {}
  for i, r in ipairs(list) do parts[i] = rec_json(r) end
  return "[" .. table.concat(parts, ",") .. "]"
end
local si_parts = {}
for i, e in ipairs(index.search_index) do
  si_parts[i] = '{"id":' .. num(e.id) .. ',"text":' .. esc(e.text) .. "}"
end
local hist_parts = {}
for _, fid in ipairs(index.field_ids) do
  local keys = {}
  for k in pairs(index.histograms[fid]) do keys[#keys + 1] = k end
  table.sort(keys)
  local kv = {}
  for _, k in ipairs(keys) do kv[#kv + 1] = esc(k) .. ":" .. num(index.histograms[fid][k]) end
  hist_parts[#hist_parts + 1] = esc(fid) .. ":{" .. table.concat(kv, ",") .. "}"
end
local vs = index.value_stats
local fid_parts = {}
for i, f in ipairs(index.field_ids) do fid_parts[i] = esc(f) end
local mainkey_json = '{"record_count":' .. num(index.record_count)
  .. ',"search_index":[' .. table.concat(si_parts, ",") .. ']'
  .. ',"version":"1.0","value_stats":{"min":' .. num(vs.min)
  .. ',"sum":' .. num(vs.sum) .. ',"max":' .. num(vs.max)
  .. ',"avg":' .. num(vs.avg) .. ',"count":' .. num(vs.count) .. "}"
  .. ',"filtered_alpha":' .. rec_list(filtered)
  .. ',"sorted_by_value":' .. rec_list(sorted)
  .. ',"histograms":{' .. table.concat(hist_parts, ",") .. "}"
  .. ',"field_ids":[' .. table.concat(fid_parts, ",") .. ']'
  .. ',"app":"Radii Base"}'
write(root .. "mainkey/index.json", mainkey_json)
print("mainkey: records=" .. index.record_count
  .. " alpha_hits=" .. #filtered .. " value_sum=" .. vs.sum .. "!")

-- 3. Inkpath: same 3-node curve the old Julia build used!
local N = inkpath.node
local nodes = {
  N(0.0, 0.0, 0.0, 0.0, 25.0, 50.0),
  N(100.0, 100.0, 75.0, 50.0, 75.0, 150.0),
  N(200.0, 0.0, 125.0, 50.0, 200.0, 0.0),
}
local d = inkpath.build_path_data(nodes)
local len = inkpath.path_length(nodes)
local bb = inkpath.path_bbox(nodes)
local flat = inkpath.flatten_path(nodes, 8)
local pt_parts = {}
for i, p in ipairs(flat) do
  pt_parts[i] = '{"y":' .. num(p.y) .. ',"x":' .. num(p.x) .. "}"
end
local inkpath_json = '{"d":' .. esc(d)
  .. ',"bbox":{"w":' .. num(bb.w) .. ',"h":' .. num(bb.h)
  .. ',"y":' .. num(bb.y) .. ',"x":' .. num(bb.x) .. "}"
  .. ',"flattened":[' .. table.concat(pt_parts, ",") .. "]"
  .. ',"length":' .. num(len) .. ',"generator":"lua-build"}'
write(root .. "inkpath/path_data.json", inkpath_json)
print("inkpath: length=" .. string.format("%.2f", len)
  .. " points=" .. #flat .. "!")
print("Wrote imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!")
