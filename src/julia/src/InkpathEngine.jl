# InkpathEngine.jl — build-time vector geometry mirroring inkpath/app.js!
# JS buildPathData emits: M x y C cx2 cy2, cx1 cy1, x y per segment!
# Julia adds arc-length approximation, bounding boxes, and flattening!

module InkpathEngine

export BezNode, cubic_point, cubic_length, path_length, path_bbox, flatten_path, build_path_data

struct BezNode
    x::Float64
    y::Float64
    cx1::Float64
    cy1::Float64
    cx2::Float64
    cy2::Float64
end

BezNode(x, y) = BezNode(float(x), float(y), float(x), float(y), float(x), float(y))

function cubic_point(p0::BezNode, p1::BezNode, t::Float64)::Tuple{Float64,Float64}
    u = 1.0 - t
    x = u^3 * p0.x + 3u^2 * t * p0.cx2 + 3u * t^2 * p1.cx1 + t^3 * p1.x
    y = u^3 * p0.y + 3u^2 * t * p0.cy2 + 3u * t^2 * p1.cy1 + t^3 * p1.y
    return (x, y)
end

function cubic_length(p0::BezNode, p1::BezNode; n::Int=32)::Float64
    total = 0.0
    px, py = p0.x, p0.y
    for i in 1:n
        x, y = cubic_point(p0, p1, i / n)
        total += hypot(x - px, y - py)
        px, py = x, y
    end
    return total
end

function path_length(nodes::Vector{BezNode})::Float64
    length(nodes) < 2 && return 0.0
    return sum(cubic_length(nodes[i-1], nodes[i]) for i in 2:length(nodes))
end

function path_bbox(nodes::Vector{BezNode})::Dict{String,Float64}
    isempty(nodes) && return Dict("x" => 0.0, "y" => 0.0, "w" => 10.0, "h" => 10.0)
    xs = Float64[]
    ys = Float64[]
    for n in nodes
        append!(xs, [n.x, n.cx1, n.cx2])
        append!(ys, [n.y, n.cy1, n.cy2])
    end
    x0, x1 = minimum(xs), maximum(xs)
    y0, y1 = minimum(ys), maximum(ys)
    return Dict("x" => x0, "y" => y0, "w" => max(x1 - x0, 1.0), "h" => max(y1 - y0, 1.0))
end

function flatten_path(nodes::Vector{BezNode}; segments::Int=16)::Vector{Dict{String,Float64}}
    isempty(nodes) && return Dict{String,Float64}[]
    pts = [Dict("x" => nodes[1].x, "y" => nodes[1].y)]
    for i in 2:length(nodes)
        for j in 1:segments
            x, y = cubic_point(nodes[i-1], nodes[i], j / segments)
            push!(pts, Dict("x" => x, "y" => y))
        end
    end
    return pts
end

function build_path_data(nodes::Vector{BezNode})::String
    isempty(nodes) && return ""
    d = "M $(nodes[1].x) $(nodes[1].y)"
    for i in 2:length(nodes)
        d *= " C $(nodes[i-1].cx2) $(nodes[i-1].cy2), $(nodes[i].cx1) $(nodes[i].cy1), $(nodes[i].x) $(nodes[i].y)"
    end
    return d
end

end # module
