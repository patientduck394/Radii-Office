-- engines/imbuer.lua — build-time spreadsheet logic (replaces julia/src/ImbuerEngine.jl)!
-- SUM, AVG, MIN, MAX, COUNT plus dependency ordering and cycle detection!

local E = {}

function E.col_to_index(col)
  local idx = 0
  for ch in string.upper(col):gmatch(".") do
    idx = idx * 26 + (string.byte(ch) - string.byte("A") + 1)
  end
  return idx - 1 -- 0-based to match the old Julia engine!
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
  local letters, digits = string.match(ref:match("^%s*(.-)%s*$"), "^([A-Za-z]+)(%d+)$")
  if not letters then return nil end
  return E.col_to_index(letters), tonumber(digits)
end

function E.cell_id(col, row)
  return E.index_to_col(col) .. tostring(row)
end

function E.get_range_values(data, start_ref, end_ref)
  local sc, sr = E.parse_cell_ref(start_ref)
  local ec, er = E.parse_cell_ref(end_ref)
  if not sc then return {} end
  local vals = {}
  for r = math.min(sr, er), math.max(sr, er) do
    for c = math.min(sc, ec), math.max(sc, ec) do
      local raw = data[E.cell_id(c, r)]
      if raw == nil then raw = "0" end -- missing counts as 0, like the old engine!
      if not tostring(raw):match("^=") then
        local n = tonumber(raw)
        if n ~= nil then vals[#vals + 1] = n end
      end
    end
  end
  return vals
end

local FNAMES = { SUM = true, AVG = true, MIN = true, MAX = true, COUNT = true }

function E.extract_range(formula)
  -- NOTE: Lua patterns have no | alternation, so capture the name then check it!
  local inner = string.upper(tostring(formula):sub(2))
  local fn, sref, eref =
    string.match(inner, "^%s*([A-Z]+)%(%s*([A-Za-z]+%d+)%s*:%s*([A-Za-z]+%d+)%s*%)%s*$")
  if not fn or not FNAMES[fn] then return nil end
  return fn, sref, eref
end

local function sum(vals)
  local s = 0.0
  for _, v in ipairs(vals) do s = s + v end
  return s
end

function E.compute_formula(formula, data)
  if not tostring(formula):match("^=") then return formula end
  local fn, sref, eref = E.extract_range(formula)
  if not fn then return "ERROR" end
  local vals = E.get_range_values(data or {}, sref, eref)
  if fn == "SUM" then return sum(vals) end
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
    return sum(vals) / #vals
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

function E.column_stats(values)
  if #values == 0 then
    return { count = 0.0, sum = 0.0, mean = 0.0, min = 0.0, max = 0.0 }
  end
  local s, mn, mx = 0.0, values[1], values[1]
  for _, v in ipairs(values) do
    s = s + v mn = math.min(mn, v) mx = math.max(mx, v)
  end
  return { count = #values + 0.0, sum = s, mean = s / #values, min = mn, max = mx }
end

return E
