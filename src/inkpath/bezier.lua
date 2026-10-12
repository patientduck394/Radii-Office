-- bezier.lua — Lua twin of the Inkpath vector geometry, executed for real!
-- Runs in plain Lua (lua inkpath/bezier.lua self-tests) AND embeds anywhere!
-- Cubic Bezier eval, length, bbox, flatten, and SVG path builder!

local B = {}

function B.node(x, y, cx1, cy1, cx2, cy2)
  return { x = x, y = y,
    cx1 = cx1 or x, cy1 = cy1 or y, cx2 = cx2 or x, cy2 = cy2 or y }
end

function B.cubic_point(p0, p1, t)
  local u = 1.0 - t
  return
    u^3 * p0.x + 3 * u^2 * t * p0.cx2 + 3 * u * t^2 * p1.cx1 + t^3 * p1.x,
    u^3 * p0.y + 3 * u^2 * t * p0.cy2 + 3 * u * t^2 * p1.cy1 + t^3 * p1.y
end

function B.cubic_length(p0, p1, n)
  n = n or 32
  local total, px, py = 0.0, p0.x, p0.y
  for i = 1, n do
    local x, y = B.cubic_point(p0, p1, i / n)
    total = total + math.sqrt((x - px)^2 + (y - py)^2)
    px, py = x, y
  end
  return total
end

function B.path_length(nodes)
  if #nodes < 2 then return 0.0 end
  local total = 0.0
  for i = 2, #nodes do total = total + B.cubic_length(nodes[i - 1], nodes[i]) end
  return total
end

function B.path_bbox(nodes)
  if #nodes == 0 then return { x = 0.0, y = 0.0, w = 10.0, h = 10.0 } end
  local x0, y0 = math.huge, math.huge
  local x1, y1 = -math.huge, -math.huge
  for _, nd in ipairs(nodes) do
    for _, x in ipairs({ nd.x, nd.cx1, nd.cx2 }) do
      x0, x1 = math.min(x0, x), math.max(x1, x)
    end
    for _, y in ipairs({ nd.y, nd.cy1, nd.cy2 }) do
      y0, y1 = math.min(y0, y), math.max(y1, y)
    end
  end
  return { x = x0, y = y0, w = math.max(x1 - x0, 1.0), h = math.max(y1 - y0, 1.0) }
end

function B.flatten_path(nodes, segments)
  segments = segments or 16
  if #nodes == 0 then return {} end
  local pts = { { x = nodes[1].x, y = nodes[1].y } }
  for i = 2, #nodes do
    for j = 1, segments do
      local x, y = B.cubic_point(nodes[i - 1], nodes[i], j / segments)
      pts[#pts + 1] = { x = x, y = y }
    end
  end
  return pts
end

local function numstr(n)
  if math.type(n) == "integer" then return string.format("%d.0", n) end
  return tostring(n)
end

-- Matches the app's buildPathData format: "M x y C cx2 cy2, cx1 cy1, x y"!
function B.build_path_data(nodes)
  if #nodes == 0 then return "" end
  local d = "M " .. numstr(nodes[1].x) .. " " .. numstr(nodes[1].y)
  for i = 2, #nodes do
    d = d .. " C " .. numstr(nodes[i - 1].cx2) .. " " .. numstr(nodes[i - 1].cy2)
      .. ", " .. numstr(nodes[i].cx1) .. " " .. numstr(nodes[i].cy1)
      .. ", " .. numstr(nodes[i].x) .. " " .. numstr(nodes[i].y)
  end
  return d
end

return B
