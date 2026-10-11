# MainkeyEngine.jl — build-time database logic mirroring mainkey/app.js!
# JS does inline case-insensitive substring filter on every keystroke!
# Julia prebuilds a lowercase search index plus sort and aggregation!

module MainkeyEngine

export filter_records, sort_records, aggregate_numeric, build_index

function row_text(rec::Dict{String,Any})::String
    return lowercase(join([string(v) for (_, v) in rec], " "))
end

function filter_records(records::Vector{Dict{String,Any}}, query::AbstractString)::Vector{Dict{String,Any}}
    q = lowercase(strip(query))
    isempty(q) && return records
    return filter(r -> occursin(q, row_text(r)), records)
end

function sort_records(records::Vector{Dict{String,Any}}, field::AbstractString; asc::Bool=true)::Vector{Dict{String,Any}}
    return sort(records, by=r -> string(get(r, field, "")), rev=!asc)
end

function aggregate_numeric(records::Vector{Dict{String,Any}}, field::AbstractString)::Dict{String,Float64}
    vals = Float64[]
    for r in records
        v = tryparse(Float64, string(get(r, field, "")))
        v !== nothing && push!(vals, v)
    end
    isempty(vals) && return Dict("count" => 0.0, "sum" => 0.0, "avg" => 0.0, "min" => 0.0, "max" => 0.0)
    return Dict(
        "count" => float(length(vals)),
        "sum" => sum(vals),
        "avg" => sum(vals) / length(vals),
        "min" => minimum(vals),
        "max" => maximum(vals),
    )
end

function build_index(records::Vector{Dict{String,Any}}, fields::Vector{Dict{String,Any}})::Dict{String,Any}
    search_index = [Dict("id" => get(r, "id", i), "text" => row_text(r)) for (i, r) in enumerate(records)]
    histograms = Dict{String,Any}()
    for f in fields
        fid = string(f["id"])
        counts = Dict{String,Int}()
        for r in records
            key = string(get(r, fid, ""))
            counts[key] = get(counts, key, 0) + 1
        end
        histograms[fid] = counts
    end
    return Dict(
        "app" => "Radii Base",
        "version" => "1.0",
        "record_count" => length(records),
        "field_ids" => [string(f["id"]) for f in fields],
        "search_index" => search_index,
        "histograms" => histograms,
        "value_stats" => aggregate_numeric(records, "value"),
    )
end

end # module
