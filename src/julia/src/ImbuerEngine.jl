# ImbuerEngine.jl — build-time spreadsheet logic, superset of imbuer/app.js!
# JS currently handles only =SUM() and =AVG() with no cycle safety!
# This engine adds MIN, MAX, COUNT, stats, dependency ordering, and cycle detection!

module ImbuerEngine

export col_to_index, index_to_col, parse_cell_ref, get_range_values,
       compute_formula, evaluate_sheet, column_stats

function col_to_index(col::AbstractString)::Int
    idx = 0
    for ch in uppercase(col)
        idx = idx * 26 + (Int(ch) - Int('A') + 1)
    end
    return idx - 1  # 0-based to match JS!
end

function index_to_col(idx::Int)::String
    name = ""
    c = idx
    while c >= 0
        name = string(Char((c % 26) + Int('A'))) * name
        c = div(c, 26) - 1
    end
    return name
end

function parse_cell_ref(ref::AbstractString)
    m = match(r"^([A-Za-z]+)(\d+)$", strip(ref))
    m === nothing && return nothing
    col = col_to_index(m.captures[1])
    row = parse(Int, m.captures[2])
    return (col, row)
end

function cell_id(col::Int, row::Int)::String
    return index_to_col(col) * string(row)
end

function get_range_values(data::Dict{String,String}, start_ref::AbstractString, end_ref::AbstractString)::Vector{Float64}
    s = parse_cell_ref(start_ref)
    e = parse_cell_ref(end_ref)
    (s === nothing || e === nothing) && return Float64[]
    c0, c1 = minmax(s[1], e[1])
    r0, r1 = minmax(s[2], e[2])
    vals = Float64[]
    for r in r0:r1, c in c0:c1
        raw = get(data, cell_id(c, r), "0")
        # Resolve chained formulas shallowly: if it is a formula, skip unless already evaluated!
        startswith(raw, "=") && continue
        num = tryparse(Float64, strip(raw))
        num !== nothing && push!(vals, num)
    end
    return vals
end

function extract_range(formula::String)
    m = match(r"^(SUM|AVG|MIN|MAX|COUNT)\(\s*([A-Za-z]+\d+)\s*:\s*([A-Za-z]+\d+)\s*\)$", strip(uppercase(formula[2:end])))
    m === nothing && return nothing
    return (m.captures[1], m.captures[2], m.captures[3])
end

function compute_formula(formula::String, data::Dict{String,String})
    startswith(formula, "=") || return formula
    parsed = extract_range(formula)
    parsed === nothing && return "ERROR"
    (fn, sref, eref) = parsed
    vals = get_range_values(data, sref, eref)
    fn == "SUM" && return sum(vals)
    fn == "COUNT" && return length(vals)
    fn == "MIN" && return isempty(vals) ? 0 : minimum(vals)
    fn == "MAX" && return isempty(vals) ? 0 : maximum(vals)
    fn == "AVG" && return isempty(vals) ? 0 : sum(vals) / length(vals)
    return "ERROR"
end

function formula_deps(formula::String)::Vector{String}
    startswith(formula, "=") || return String[]
    parsed = extract_range(formula)
    parsed === nothing && return String[]
    (_, sref, eref) = parsed
    s = parse_cell_ref(sref)
    e = parse_cell_ref(eref)
    (s === nothing || e === nothing) && return String[]
    deps = String[]
    for r in minmax(s[2], e[2])[1]:minmax(s[2], e[2])[2], c in minmax(s[1], e[1])[1]:minmax(s[1], e[1])[2]
        push!(deps, cell_id(c, r))
    end
    return deps
end

function evaluate_sheet(data::Dict{String,String})::Dict{String,Any}
    result = Dict{String,Any}()
    # Pass 1: copy literals!
    for (k, v) in data
        startswith(v, "=") || (result[k] = v)
    end
    # Pass 2: iterate formulas to fixpoint (handles chains, detects cycles)!
    pending = Dict(k => v for (k, v) in data if startswith(v, "="))
    max_iters = length(pending) + 1
    for _ in 1:max_iters
        isempty(pending) && break
        progressed = false
        for (k, f) in copy(pending)
            deps = formula_deps(f)
            # A dep that is itself a pending formula blocks us this round!
            any(d -> haskey(pending, d), deps) && continue
            # Build resolved view: literals + already-computed formulas as strings!
            view = Dict{String,String}()
            for (rk, rv) in result
                view[rk] = string(rv)
            end
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

function column_stats(values::Vector{Float64})::Dict{String,Float64}
    isempty(values) && return Dict("count" => 0.0, "sum" => 0.0, "mean" => 0.0, "min" => 0.0, "max" => 0.0)
    return Dict(
        "count" => float(length(values)),
        "sum" => sum(values),
        "mean" => sum(values) / length(values),
        "min" => minimum(values),
        "max" => maximum(values),
    )
end

end # module
