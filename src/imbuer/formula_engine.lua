-- formula_engine.lua — Lua twin of the Imbuer formula engine, executed LIVE!
-- Runs in browsers via Fengari (see fengari_formula.js) AND in plain Lua!
-- Pure logic, no I/O: takes a sheet table, returns the evaluated table!
-- Covers SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle safety!

local E = {}

function E.col_to_index(col)
  -- 0-based to match the other engines!
  local idx = 0
  for ch in string.upper(col):gmatch(".") do
    idx = idx * 26 + (string.byte(ch) - string.byte("A") + 1)
  end
  return idx - 1
end

function E.index_to_col(idx)
  local name = ""
  local c = idx
  while c >= 0 do
    name = string.char((c % 26) + string.byte("A")) .. name
    c = math.floor(c / 26) - 1
  end
  return name
end

function E.parse_cell_ref(ref)
  local s = tostring(ref):match("^%s*(.-)%s*$")
  local letters, digits = s:match("^([A-Za-z]+)(%d+)$")
  if not letters then return nil end
  return E.col_to_index(letters), tonumber(digits)
end

function E.cell_id(col, row)
  return E.index_to_col(col) .. tostring(row)
end

local function num_or_nil(v)
  return tonumber(tostring(v):match("^%s*(.-)%s*$"))
end

function E.get_range_values(data, start_ref, end_ref)
  local sc, sr = E.parse_cell_ref(start_ref)
  local ec, er = E.parse_cell_ref(end_ref)
  if not sc then return {} end
  local vals = {}
  for r = math.min(sr, er), math.max(sr, er) do
    for c = math.min(sc, ec), math.max(sc, ec) do
      -- Missing cells count as 0, like the other engines!
      local raw = data[E.cell_id(c, r)]
      if raw == nil then raw = "0" end
      if not tostring(raw):match("^=") then
        local n = num_or_nil(raw)
        if n ~= nil then vals[#vals + 1] = n end
      end
    end
  end
  return vals
end

-- NOTE: Lua patterns have no | alternation, so the name is checked by set!
local FNAMES = { SUM = true, AVG = true, MIN = true, MAX = true, COUNT = true }

function E.extract_range(formula)
  local inner = string.upper(tostring(formula):sub(2))
  local fn, sref, eref =
    inner:match("^%s*([A-Z]+)%(%s*([A-Za-z]+%d+)%s*:%s*([A-Za-z]+%d+)%s*%)%s*$")
  if not fn or not FNAMES[fn] then return nil end
  return fn, sref, eref
end

local function list_sum(vals)
  local s = 0.0
  for _, v in ipairs(vals) do s = s + v end
  return s
end

function E.compute_formula(formula, data)
  if not tostring(formula):match("^=") then return formula end
  local fn, sref, eref = E.extract_range(formula)
  if not fn then return "ERROR" end
  local vals = E.get_range_values(data or {}, sref, eref)
  if fn == "SUM" then return list_sum(vals) end
  if fn == "COUNT" then return #vals end
  if fn == "MIN" then
    if #vals == 0 then return 0 end
    local m = vals[1]
    for i = 2, #vals do m = math.min(m, vals[i]) end
    return m
  end
  if fn == "MAX" then
    if #vals == 0 then return 0 end
    local m = vals[1]
    for i = 2, #vals do m = math.max(m, vals[i]) end
    return m
  end
  if fn == "AVG" then
    if #vals == 0 then return 0 end
    return list_sum(vals) / #vals
  end
  return "ERROR"
end

function E.formula_deps(formula)
  if not tostring(formula):match("^=") then return {} end
  local _, sref, eref = E.extract_range(formula)
  if not sref then return {} end
  local sc, sr = E.parse_cell_ref(sref)
  local ec, er = E.parse_cell_ref(eref)
  if not sc then return {} end
  local deps = {}
  for r = math.min(sr, er), math.max(sr, er) do
    for c = math.min(sc, ec), math.max(sc, ec) do
      deps[#deps + 1] = E.cell_id(c, r)
    end
  end
  return deps
end

local function count_keys(t)
  local n = 0
  for _ in pairs(t) do n = n + 1 end
  return n
end

function E.evaluate_sheet(data)
  local result, pending = {}, {}
  for k, v in pairs(data) do
    if tostring(v):match("^=") then pending[k] = v else result[k] = v end
  end
  for _ = 1, count_keys(pending) + 1 do
    if count_keys(pending) == 0 then break end
    local progressed = false
    for k, f in pairs(pending) do
      local blocked = false
      for _, d in ipairs(E.formula_deps(f)) do
        if pending[d] ~= nil then blocked = true break end
      end
      if not blocked then
        local view = {}
        for rk, rv in pairs(result) do view[rk] = tostring(rv) end
        result[k] = E.compute_formula(f, view)
        pending[k] = nil
        progressed = true
      end
    end
    if not progressed then
      for k in pairs(pending) do result[k] = "ERROR:CYCLE" pending[k] = nil end
      break
    end
  end
  return result
end

-- Tiny JSON writer (fixed key order, numbers plain): the ONLY bridge out!
local function jesc(s)
  return '"' .. tostring(s):gsub('\\', '\\\\'):gsub('"', '\\"')
    :gsub('\n', '\\n'):gsub('\r', '\\r'):gsub('\t', '\\t') .. '"'
end

local function jnum(n)
  if n % 1 == 0 and math.abs(n) < 1e15 then
    return string.format("%d", math.tointeger(n))
  end
  return tostring(n)
end

local function jval(v)
  if type(v) == "string" then return jesc(v) end
  if type(v) == "number" then return jnum(v) end
  if type(v) == "boolean" then return v and "true" or "false" end
  return "null"
end

-- Entry point used through Fengari: JSON sheet in, JSON result out!
-- Small flat-map parser (handles \" \\ \n \r \t escapes the bridge emits)!
local function parse_map(s)
  local data, i, n = {}, 1, #s
  local function ws()
    while i <= n and s:sub(i, i):match("%s") do i = i + 1 end
  end
  local function parse_str()
    assert(s:sub(i, i) == '"', "want string")
    i = i + 1
    local buf = {}
    while i <= n do
      local c = s:sub(i, i)
      if c == '"' then
        i = i + 1
        return table.concat(buf)
      end
      if c == "\\" then
        local e = s:sub(i + 1, i + 1)
        i = i + 2
        if e == "n" then buf[#buf + 1] = "\n"
        elseif e == "r" then buf[#buf + 1] = "\r"
        elseif e == "t" then buf[#buf + 1] = "\t"
        else buf[#buf + 1] = e end
      else
        buf[#buf + 1] = c
        i = i + 1
      end
    end
    error("unterminated string")
  end
  local function parse_val()
    ws()
    if s:sub(i, i) == '"' then return parse_str() end
    local num = s:match("^-?%d+%.?%d*", i)
    if num and #num > 0 then
      i = i + #num
      return tonumber(num)
    end
    if s:sub(i, i + 3) == "true" then i = i + 4 return true end
    if s:sub(i, i + 4) == "false" then i = i + 5 return false end
    if s:sub(i, i + 3) == "null" then i = i + 4 return nil end
    error("bad value at " .. i)
  end
  ws()
  assert(s:sub(i, i) == "{")
  i = i + 1
  ws()
  if s:sub(i, i) == "}" then return data end
  while true do
    ws()
    local k = parse_str()
    ws()
    assert(s:sub(i, i) == ":")
    i = i + 1
    local v = parse_val()
    if v ~= nil then data[k] = v end
    ws()
    local c = s:sub(i, i)
    if c == "," then
      i = i + 1
    elseif c == "}" then
      break
    else
      error("want , or }")
    end
  end
  return data
end

function E.evaluate_sheet_json(input_json)
  local result = E.evaluate_sheet(parse_map(tostring(input_json)))
  local keys = {}
  for k in pairs(result) do keys[#keys + 1] = k end
  table.sort(keys)
  local parts = {}
  for _, k in ipairs(keys) do parts[#parts + 1] = jesc(k) .. ":" .. jval(result[k]) end
  return "{" .. table.concat(parts, ",") .. "}"
end

return E
