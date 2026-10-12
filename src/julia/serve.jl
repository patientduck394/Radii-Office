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

function compute_formula(formula, data)
    startswith(formula, "=") || return formula
    m = match(r"^(SUM|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)$", strip(uppercase(formula[2:end])))
    m === nothing && return "ERROR"
    fn, sref, eref = m.captures
    vals = range_values(data, sref, eref)
    fn == "SUM" && return sum(vals)
    fn == "COUNT" && return length(vals)
    fn == "MIN" && return isempty(vals) ? 0 : minimum(vals)
    fn == "MAX" && return isempty(vals) ? 0 : maximum(vals)
    fn == "AVG" && return isempty(vals) ? 0 : sum(vals) / length(vals)
    return "ERROR"
end

function deps_of(formula)
    startswith(formula, "=") || return String[]
    m = match(r"^(SUM|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)$", strip(uppercase(formula[2:end])))
    m === nothing && return String[]
    s, e = parse_cell_ref(m.captures[2]), parse_cell_ref(m.captures[3])
    (s === nothing || e === nothing) && return String[]
    return [cell_id(c, r) for r in min(s[2], e[2]):max(s[2], e[2]) for c in min(s[1], e[1]):max(s[1], e[1])]
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
