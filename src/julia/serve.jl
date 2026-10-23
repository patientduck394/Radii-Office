# serve.jl — Julia API backend powered by the Oxygen.jl package!
# Run: julia --project=julia julia/serve.jl  (serves http://localhost:8000!)
# The static site never calls it (no host for it) — this is the backend half
# of the multilingual story: real Julia executing over HTTP, verified below!

using Oxygen
using HTTP
using JSON3

# --- Compact formula engine (same semantics as the JS/Lua twins) ---
col_to_index(col) = foldl((a, c) -> a * 26 + (Int(c) - Int('A') + 1), uppercase(col), init=0) - 1

function index_to_col(idx)
    name = ""
    c = idx
    while c >= 0
        name = string(Char((c % 26) + Int('A'))) * name
        c = div(c, 26) - 1
    end
    return name
end

function parse_cell_ref(ref)
    m = match(r"^([A-Za-z]+)(\d+)$", strip(ref))
    m === nothing && return nothing
    return (col_to_index(m.captures[1]), parse(Int, m.captures[2]))
end

cell_id(col, row) = index_to_col(col) * string(row)

function range_values(data, sref, eref)
    s, e = parse_cell_ref(sref), parse_cell_ref(eref)
    (s === nothing || e === nothing) && return Float64[]
    vals = Float64[]
    for r in min(s[2], e[2]):max(s[2], e[2]), c in min(s[1], e[1]):max(s[1], e[1])
        raw = get(data, cell_id(c, r), "0")
        startswith(raw, "=") && continue
        n = tryparse(Float64, strip(raw))
        n !== nothing && push!(vals, n)
    end
    return vals
end

const FNAMES = Set(["SUM", "AVG", "MIN", "MAX", "COUNT"])

# Arithmetic parser: expr := term (('+'|'-') term)* etc., collecting deps!
mutable struct ArithParser
    text::String
    pos::Int
    refs::Vector{String}
end
ArithParser(text) = ArithParser(text, 1, String[])

function pskip!(p::ArithParser)
    while p.pos <= lastindex(p.text) && isspace(p.text[p.pos])
        p.pos = nextind(p.text, p.pos)
    end
end

function prange_cells(sref, eref)
    s, e = parse_cell_ref(sref), parse_cell_ref(eref)
    (s === nothing || e === nothing) && return String[]
    return [cell_id(c, r) for r in min(s[2], e[2]):max(s[2], e[2]) for c in min(s[1], e[1]):max(s[1], e[1])]
end

function ppref(p::ArithParser)
    pskip!(p)
    m = match(r"^([A-Za-z]+\d+)", p.text[p.pos:end])
    (m === nothing || parse_cell_ref(m.captures[1]) === nothing) && return nothing
    p.pos += ncodeunits(m.captures[1])
    return m.captures[1]
end

function pexpr!(p::ArithParser)
    l = pterm!(p)
    l === nothing && return nothing
    while true
        pskip!(p)
        p.pos > lastindex(p.text) && return l
        c = p.text[p.pos]
        (c == '+' || c == '-') || return l
        p.pos = nextind(p.text, p.pos)
        r = pterm!(p)
        r === nothing && return nothing
        l = (c == '+' ? (:add, l, r) : (:sub, l, r))
    end
end

function pterm!(p::ArithParser)
    l = pfactor!(p)
    l === nothing && return nothing
    while true
        pskip!(p)
        p.pos > lastindex(p.text) && return l
        c = p.text[p.pos]
        (c == '*' || c == '/') || return l
        p.pos = nextind(p.text, p.pos)
        r = pfactor!(p)
        r === nothing && return nothing
        l = (c == '*' ? (:mul, l, r) : (:div, l, r))
    end
end

function pfactor!(p::ArithParser)
    pskip!(p)
    p.pos > lastindex(p.text) && return nothing
    c = p.text[p.pos]
    if c == '('
        p.pos = nextind(p.text, p.pos)
        n = pexpr!(p)
        n === nothing && return nothing
        pskip!(p)
        (p.pos > lastindex(p.text) || p.text[p.pos] != ')') && return nothing
        p.pos = nextind(p.text, p.pos)
        return n
    end
    if c == '-'
        p.pos = nextind(p.text, p.pos)
        v = pfactor!(p)
        return v === nothing ? nothing : (:neg, v)
    end
    m = match(r"^([0-9]+(\.[0-9]+)?)", p.text[p.pos:end])
    if m !== nothing
        p.pos += ncodeunits(m.captures[1])
        return (:num, parse(Float64, m.captures[1]))
    end
    m = match(r"^([A-Za-z]+)", p.text[p.pos:end])
    if m !== nothing
        name = uppercase(m.captures[1])
        j = p.pos + ncodeunits(m.captures[1])
        while j <= lastindex(p.text) && isspace(p.text[j])
            j = nextind(p.text, j)
        end
        if j <= lastindex(p.text) && p.text[j] == '('
            name in FNAMES || return nothing
            p.pos = nextind(p.text, j)
            sref = ppref(p)
            sref === nothing && return nothing
            pskip!(p)
            (p.pos > lastindex(p.text) || p.text[p.pos] != ':') && return nothing
            p.pos = nextind(p.text, p.pos)
            eref = ppref(p)
            eref === nothing && return nothing
            pskip!(p)
            (p.pos > lastindex(p.text) || p.text[p.pos] != ')') && return nothing
            p.pos = nextind(p.text, p.pos)
            append!(p.refs, prange_cells(sref, eref))
            return (:call, name, uppercase(sref), uppercase(eref))
        end
        m2 = match(r"^([A-Za-z]+\d+)", p.text[p.pos:end])
        if m2 !== nothing && parse_cell_ref(m2.captures[1]) !== nothing
            p.pos += ncodeunits(m2.captures[1])
            ref = uppercase(m2.captures[1])
            push!(p.refs, ref)
            return (:ref, ref)
        end
        return nothing
    end
    return nothing
end

function parse_arithmetic(inner)
    p = ArithParser(uppercase(inner))
    node = pexpr!(p)
    node === nothing && return nothing
    pskip!(p)
    p.pos <= lastindex(p.text) && return nothing
    return (node=node, refs=p.refs)
end

function ref_value(cell, data)
    haskey(data, cell) || return 0.0 # missing counts as 0!
    raw = data[cell]
    raw isa Number && return isnan(Float64(raw)) ? 0.0 : Float64(raw)
    s = strip(string(raw))
    startswith(s, "=") && return 0.0 # unresolved formula counts as 0!
    n = tryparse(Float64, s)
    return n === nothing ? 0.0 : n # plain text counts as 0!
end

function eval_node(node, data)
    kind = node[1]
    kind == :num && return node[2]
    kind == :ref && return ref_value(node[2], data)
    kind == :neg && return -eval_node(node[2], data)
    kind == :add && return eval_node(node[2], data) + eval_node(node[3], data)
    kind == :sub && return eval_node(node[2], data) - eval_node(node[3], data)
    kind == :mul && return eval_node(node[2], data) * eval_node(node[3], data)
    kind == :div && return eval_node(node[2], data) / eval_node(node[3], data)
    vals = range_values(data, node[3], node[4])
    fn = node[2]
    fn == "SUM" && return sum(vals)
    fn == "COUNT" && return length(vals)
    fn == "MIN" && return isempty(vals) ? 0 : minimum(vals)
    fn == "MAX" && return isempty(vals) ? 0 : maximum(vals)
    return isempty(vals) ? 0 : sum(vals) / length(vals)
end
function compute_formula(formula, data)
    startswith(formula, "=") || return formula
    parsed = parse_arithmetic(strip(formula[2:end]))
    parsed === nothing && return "ERROR"
    result = eval_node(parsed.node, data)
    return isfinite(result) ? result : "ERROR"
end

function deps_of(formula)
    startswith(formula, "=") || return String[]
    parsed = parse_arithmetic(strip(formula[2:end]))
    parsed === nothing && return String[]
    return parsed.refs
end

function evaluate_sheet(data)
    result = Dict{String,Any}()
    pending = Dict(k => v for (k, v) in data if startswith(v, "="))
    for (k, v) in data
        startswith(v, "=") || (result[k] = v)
    end
    for _ in 1:(length(pending) + 1)
        isempty(pending) && break
        progressed = false
        for (k, f) in copy(pending)
            any(d -> haskey(pending, d), deps_of(f)) && continue
            view = Dict{String,String}(rk => string(rv) for (rk, rv) in result)
            result[k] = compute_formula(f, view)
            delete!(pending, k)
            progressed = true
        end
        if !progressed
            for (k, _) in pending
                result[k] = "ERROR:CYCLE"
            end
            break
        end
    end
    return result
end

function col_stats(vals)
    isempty(vals) && return Dict("count" => 0.0, "sum" => 0.0, "mean" => 0.0, "min" => 0.0, "max" => 0.0)
    return Dict("count" => float(length(vals)), "sum" => sum(vals),
                "mean" => sum(vals) / length(vals), "min" => minimum(vals), "max" => maximum(vals))
end

# --- Oxygen.jl routes (the package, serving real Julia over HTTP) ---
@get "/health" function()
    return Dict("status" => "ok", "engine" => "julia-oxygen")
end

@post "/api/evaluate" function(req::HTTP.Request)
    body = JSON3.read(String(req.body), Dict{String,String})
    return evaluate_sheet(body)
end

@post "/api/stats" function(req::HTTP.Request)
    body = JSON3.read(String(req.body), Dict{String,Vector{Float64}})
    return col_stats(get(body, "values", Float64[]))
end

serve(port=8000)
