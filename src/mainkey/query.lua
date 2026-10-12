-- query.lua — Lua twin of the Mainkey query engine, executed for real!
-- Runs in plain Lua (lua mainkey/query.lua self-tests) AND embeds anywhere!
-- Substring filter, sort, numeric aggregation, search index and histograms!

local Q = {}

-- Deterministic lowercase text: id, then title, status, value!
function Q.row_text(rec)
  return string.lower(table.concat({
    tostring(rec.id or ""), tostring(rec.title or ""),
    tostring(rec.status or ""), tostring(rec.value or ""),
  }, " "))
end

function Q.filter_records(records, query)
  local q = string.lower(query:match("^%s*(.-)%s*$"))
  if q == "" then
    local copy = {}
    for _, r in ipairs(records) do copy[#copy + 1] = r end
    return copy
  end
  local out = {}
  for _, r in ipairs(records) do
    if Q.row_text(r):find(q, 1, true) then out[#out + 1] = r end
  end
  return out
end

function Q.sort_records(records, field)
  local out = {}
  for _, r in ipairs(records) do out[#out + 1] = r end
  table.sort(out, function(a, b)
    return tostring(a[field] or "") < tostring(b[field] or "")
  end)
  return out
end

function Q.aggregate_numeric(records, field)
  local vals = {}
  for _, r in ipairs(records) do
    local v = tonumber(r[field])
    if v ~= nil then vals[#vals + 1] = v end
  end
  if #vals == 0 then
    return { count = 0.0, sum = 0.0, avg = 0.0, min = 0.0, max = 0.0 }
  end
  local s, mn, mx = 0.0, vals[1], vals[1]
  for _, v in ipairs(vals) do
    s = s + v mn = math.min(mn, v) mx = math.max(mx, v)
  end
  return { count = #vals + 0.0, sum = s, avg = s / #vals, min = mn, max = mx }
end

function Q.build_index(records, fields)
  local field_ids = {}
  for _, f in ipairs(fields) do field_ids[#field_ids + 1] = f.id end
  local search_index = {}
  for i, r in ipairs(records) do
    search_index[i] = { id = r.id or i, text = Q.row_text(r) }
  end
  local histograms = {}
  for _, f in ipairs(fields) do
    local counts = {}
    for _, r in ipairs(records) do
      local key = tostring(r[f.id] or "")
      counts[key] = (counts[key] or 0) + 1
    end
    histograms[f.id] = counts
  end
  return {
    app = "Radii Base",
    version = "1.0",
    record_count = #records,
    field_ids = field_ids,
    search_index = search_index,
    histograms = histograms,
    value_stats = Q.aggregate_numeric(records, "value"),
  }
end

return Q
