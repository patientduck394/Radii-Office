# build.jl — build-time entry point, stdlib only, no Pkg dependencies!
# Run: julia --project=julia julia/scripts/build.jl
# Emits: imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!

include(joinpath(@__DIR__, "..", "src", "ImbuerEngine.jl"))
include(joinpath(@__DIR__, "..", "src", "MainkeyEngine.jl"))
include(joinpath(@__DIR__, "..", "src", "InkpathEngine.jl"))

using .ImbuerEngine
using .MainkeyEngine
using .InkpathEngine

# --- Minimal JSON writer (Base only)! ---
function json_escape(s::String)::String
    s = replace(s, "\\" => "\\\\", "\"" => "\\\"", "\n" => "\\n", "\r" => "\\r", "\t" => "\\t")
    return "\"" * s * "\""
end

to_json(x::Nothing) = "null"
to_json(x::Bool) = x ? "true" : "false"
to_json(x::Number) = isfinite(float(x)) ? repr(x) : "null"
to_json(x::AbstractString) = json_escape(string(x))
to_json(x::AbstractVector) = "[" * join([to_json(v) for v in x], ",") * "]"
function to_json(x::AbstractDict)
    parts = ["$(to_json(string(k))):$(to_json(v))" for (k, v) in x]
    return "{" * join(parts, ",") * "}"
end

function write_json(path::String, data)
    mkpath(dirname(path))
    open(path, "w") do io
        write(io, to_json(data))
    end
end

root = joinpath(@__DIR__, "..", "..")

# --- 1. Imbuer: sample sheet exercising SUM/AVG/MIN/MAX/COUNT + cycle! ---
sheet = Dict{String,String}(
    "A1" => "10", "A2" => "20", "A3" => "30",
    "A4" => "=SUM(A1:A3)",    # 60!
    "A5" => "=AVG(A1:A4)",    # (10+20+30+60)/4 = 30!
    "B1" => "=MIN(A1:A3)",    # 10!
    "B2" => "=MAX(A1:A3)",    # 30!
    "B3" => "=COUNT(A1:A5)",  # 5!
)
evaluated = ImbuerEngine.evaluate_sheet(sheet)
vals = ImbuerEngine.get_range_values(Dict(k => string(v) for (k, v) in evaluated), "A1", "A5")
stats = ImbuerEngine.column_stats([Float64(v) for v in vals if v isa Number])
imbuer_out = Dict("evaluated" => evaluated, "column_A_stats" => stats, "generator" => "julia-build")
write_json(joinpath(root, "imbuer", "computed.json"), imbuer_out)

# --- 2. Mainkey: sample records mirroring mainkey/app.js defaults! ---
fields = [
    Dict{String,Any}("id" => "title", "name" => "Title", "type" => "text"),
    Dict{String,Any}("id" => "status", "name" => "Status", "type" => "tag"),
    Dict{String,Any}("id" => "value", "name" => "Value", "type" => "number"),
]
records = [
    Dict{String,Any}("id" => 1, "title" => "Project Alpha", "status" => "In Progress", "value" => 1200),
    Dict{String,Any}("id" => 2, "title" => "Radii Game Asset", "status" => "Completed", "value" => 450),
    Dict{String,Any}("id" => 3, "title" => "Project Beta", "status" => "In Progress", "value" => 800),
]
index = MainkeyEngine.build_index(records, fields)
index["filtered_alpha"] = MainkeyEngine.filter_records(records, "alpha")
index["sorted_by_value"] = MainkeyEngine.sort_records(records, "value")
write_json(joinpath(root, "mainkey", "index.json"), index)

# --- 3. Inkpath: sample 3-node curve, matches JS buildPathData format! ---
nodes = [
    InkpathEngine.BezNode(0.0, 0.0, 0.0, 0.0, 25.0, 50.0),
    InkpathEngine.BezNode(100.0, 100.0, 75.0, 50.0, 75.0, 150.0),
    InkpathEngine.BezNode(200.0, 0.0, 125.0, 50.0, 200.0, 0.0),
]
inkpath_out = Dict(
    "d" => InkpathEngine.build_path_data(nodes),
    "length" => InkpathEngine.path_length(nodes),
    "bbox" => InkpathEngine.path_bbox(nodes),
    "flattened" => InkpathEngine.flatten_path(nodes; segments=8),
    "generator" => "julia-build",
)
write_json(joinpath(root, "inkpath", "path_data.json"), inkpath_out)

println("Imbuer evaluated A4=$(evaluated["A4"]) A5=$(evaluated["A5"]) B1=$(evaluated["B1"]) B2=$(evaluated["B2"]) B3=$(evaluated["B3"])!")
println("Mainkey records=$(index["record_count"]) alpha_hits=$(length(index["filtered_alpha"])) value_sum=$(index["value_stats"]["sum"])!")
println("Inkpath d=$(inkpath_out["d"])!")
println("Inkpath length=$(round(inkpath_out["length"], digits=2)) bbox=$(inkpath_out["bbox"]) points=$(length(inkpath_out["flattened"]))!")
println("Wrote imbuer/computed.json, mainkey/index.json, inkpath/path_data.json!")
