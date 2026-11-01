module SourcePage exposing (main)

{-| The Source Code page: download the whole site, with live file counts and sizes!
-}

import Browser
import Html exposing (Html, a, code, div, h1, h2, p, section, text)
import Html.Attributes exposing (attribute, class, href)
import Http
import Json.Decode as D
import Layout


type alias Info =
    { zipFiles : Int
    , zipBytes : Int
    , kcFiles : Int
    , kcBytes : Int
    }


type Model
    = Loading
    | Loaded Info
    | Unavailable


type Msg
    = GotInfo (Result Http.Error Info)


main : Program () Model Msg
main =
    Browser.element
        { init = \_ -> ( Loading, fetchInfo )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


fetchInfo : Cmd Msg
fetchInfo =
    Http.get
        { url = "/downloads/source-info.json"
        , expect = Http.expectJson GotInfo infoDecoder
        }


infoDecoder : D.Decoder Info
infoDecoder =
    D.map4 Info
        (D.field "zipFiles" D.int)
        (D.field "zipBytes" D.int)
        (D.field "kcFiles" D.int)
        (D.field "kcBytes" D.int)


update : Msg -> Model -> ( Model, Cmd Msg )
update msg _ =
    case msg of
        GotInfo (Ok info) ->
            ( Loaded info, Cmd.none )

        GotInfo (Err _) ->
            ( Unavailable, Cmd.none )


{-| 26843545 bytes → "25.6 MB"!
-}
megabytes : Int -> String
megabytes bytes =
    let
        tenths =
            round (toFloat bytes / 1048576 * 10)
    in
    String.fromInt (tenths // 10) ++ "." ++ String.fromInt (modBy 10 tenths) ++ " MB"


meta : Model -> String -> (Info -> ( Int, Int )) -> String
meta model fallback pick =
    case model of
        Loaded info ->
            let
                ( files, bytes ) =
                    pick info
            in
            String.fromInt files ++ " files · " ++ megabytes bytes

        Loading ->
            "Counting files…"

        Unavailable ->
            fallback


view : Model -> Html Msg
view model =
    Layout.page Layout.Source
        [ h1 [] [ text "Source Code" ]
        , p [ class "sub" ] [ text "Every app in the Radii Office suite is plain HTML, CSS and JavaScript, so you can read it, run it and remix it! Grab the whole site below, as a regular ZIP or as a Cabinet drawer (.kc)!" ]
        , div [ class "grid" ]
            [ section [ class "card" ]
                [ h2 [] [ text "Full site (.zip)" ]
                , p [] [ text "Every page, app, font and image, ready to unzip and open. Host the folder anywhere, or open ", code [] [ text "index.html" ], text " through a local web server!" ]
                , div [ class "meta" ] [ text (meta model "ZIP archive" (\i -> ( i.zipFiles, i.zipBytes ))) ]
                , a [ class "btn", href "/downloads/radii-office-source.zip", attribute "download" "" ] [ text "Download ZIP" ]
                ]
            , section [ class "card" ]
                [ h2 [] [ text "Cabinet drawer (.kc)" ]
                , p [] [ text "All the code plus the small images as one readable bundle, with a folder for every app! Open it in ", a [ href "/cabinet/" ] [ text "Cabinet" ], text " with Open Drawer to browse it, or share it with a friend live!" ]
                , div [ class "meta" ] [ text (meta model "Cabinet drawer" (\i -> ( i.kcFiles, i.kcBytes ))) ]
                , a [ class "btn kc", href "/downloads/radii-office-source.kc", attribute "download" "" ] [ text "Download .kc" ]
                ]
            ]
        , div [ class "note" ]
            [ text "The ZIP holds the whole site; the .kc leaves out the font files, music, large images and the huge Bitbook synth libraries to stay under 25 MB. Check "
            , code [] [ text "ATTRIBUTIONS.md" ]
            , text " and the "
            , code [] [ text "LICENSE-*.txt" ]
            , text " files inside for the licenses that apply to the code, fonts and art!"
            ]
        , div [ class "note" ]
            [ text "Mostly JavaScript, with a few guests: Inkpath's curve math is "
            , a [ href "https://github.com/patientduck394/Radii-Office/tree/main/src/rust" ] [ text "Rust" ]
            , text " compiled to WebAssembly, and this page (plus the Code of Conduct and Not Found pages) is written in "
            , a [ href "https://github.com/patientduck394/Radii-Office/tree/main/src/elm" ] [ text "Elm" ]
            , text ", in the "
            , code [] [ text "elm/" ]
            , text " folder!"
            ]
        ]
