# BitLang Julia server (Oxygen.jl)
#
# BitLang programs that say "use julia" send their julia("...") code to this little server.
#
# First time only (installs the packages):
#     julia -e 'using Pkg; Pkg.add(["Oxygen", "HTTP", "JSON3"])'
# Start it:
#     julia bitlang_julia_server.jl
# It prints an address and a token. Paste both into BitLang when it asks.
#
# Safety: it only listens on this computer (127.0.0.1) and refuses requests without the token.
# Whoever has the token can run Julia code on your computer, so keep it private and only
# allow programs you trust.

using Oxygen, HTTP, JSON3, Random

const TOKEN = get(ENV, "BITLANG_TOKEN", randstring(24))
const PORT = parse(Int, get(ENV, "BITLANG_PORT", "8080"))
const TIME_LIMIT = parse(Float64, get(ENV, "BITLANG_TIME_LIMIT", "20"))   # seconds

const CORS_HEADERS = [
    "Access-Control-Allow-Origin" => "*",
    "Access-Control-Allow-Headers" => "Content-Type",
    "Access-Control-Allow-Methods" => "POST, OPTIONS",
    "Access-Control-Allow-Private-Network" => "true",
]

function CorsMiddleware(handler)
    return function (req::HTTP.Request)
        if req.method == "OPTIONS"
            return HTTP.Response(204, CORS_HEADERS)
        end
        res = handler(req)
        for h in CORS_HEADERS
            HTTP.setheader(res, h)
        end
        return res
    end
end

# BitLang can read numbers, text, true/false, nothing, lists and maps. Everything else is shown as text.
plainval(x::Nothing) = nothing
plainval(x::Bool) = x
plainval(x::Integer) = x
plainval(x::AbstractFloat) = isfinite(x) ? x : string(x)
plainval(x::Real) = plainval(float(x))
plainval(x::AbstractString) = String(x)
plainval(x::Symbol) = String(x)
plainval(x::AbstractDict) = Dict(string(k) => plainval(v) for (k, v) in x)
plainval(x::Union{AbstractVector,Tuple,AbstractSet}) = [plainval(v) for v in x]
plainval(x::AbstractMatrix) = [[plainval(x[i, j]) for j in 1:size(x, 2)] for i in 1:size(x, 1)]
plainval(x) = repr(x)

const SANDBOX = Module(:BitLangUser)

function run_user_code(code::String, vars)
    for (k, v) in vars
        Core.eval(SANDBOX, :($(Symbol(k)) = $(v)))
    end
    tmp = tempname()
    result = nothing
    try
        open(tmp, "w") do io
            redirect_stdout(io) do
                result = include_string(SANDBOX, code)
            end
        end
        return (ok = true, result = plainval(result), stdout = read(tmp, String))
    finally
        rm(tmp; force = true)
    end
end

jsonresp(status, body) = HTTP.Response(status, ["Content-Type" => "application/json"], JSON3.write(body))

@post "/julia" function (req::HTTP.Request)
    body = try
        JSON3.read(String(req.body))
    catch
        return jsonresp(400, (ok = false, error = "that was not JSON"))
    end
    if get(body, :token, "") != TOKEN
        return jsonresp(401, (ok = false, error = "wrong token"))
    end
    code = String(get(body, :code, ""))
    vars = Dict{String,Any}()
    if haskey(body, :vars)
        for (k, v) in pairs(body[:vars])
            vars[String(k)] = JSON3.read(JSON3.write(v), Any)
        end
    end
    task = @async try
        run_user_code(code, vars)
    catch e
        (ok = false, error = sprint(showerror, e), stdout = "")
    end
    if timedwait(() -> istaskdone(task), TIME_LIMIT) == :timed_out
        return jsonresp(200, (ok = false, error = "the code took longer than $(TIME_LIMIT) seconds", stdout = ""))
    end
    return jsonresp(200, fetch(task))
end

println("BitLang Julia server is ready!")
println("  Address: http://127.0.0.1:", PORT)
println("  Token:   ", TOKEN)
serve(; middleware = [CorsMiddleware], host = "127.0.0.1", port = PORT, docs = false, metrics = false, show_banner = false)
