module NotFound exposing (main)

{-| The Not Found page! It shows the address that was missing, guesses which page you meant
(so "/writout" suggests Writeout), and lists every app.
The address comes in as a flag from 404.html, which sends visitors here with ?from=/the/missing/path.
-}

import Browser
import Html exposing (Html, a, code, div, h1, h2, p, span, text)
import Html.Attributes exposing (class, href)
import Layout


type alias Place =
    { slug : String
    , name : String
    , what : String
    }


places : List Place
places =
    [ Place "writeout" "Writeout" "Documents"
    , Place "amber" "Amber" "Presentations"
    , Place "imbuer" "Imbuer" "Spreadsheets"
    , Place "mainkey" "Mainkey" "Databases"
    , Place "bitbook" "Bitbook" "Notes"
    , Place "inkpath" "Inkpath" "Vector art"
    , Place "omicron" "Omicron" "Web builder"
    , Place "formly" "Formly" "Forms"
    , Place "opendb" "OpenDB" "Knowledge"
    , Place "peeker" "Peeker" "PDFs"
    , Place "cabinet" "Cabinet" "Drive"
    , Place "phosphor" "Phosphor" "Messaging"
    , Place "hexa" "Hexa" "Calendar"
    , Place "taskra" "Taskra" "To-dos"
    , Place "zonerider" "Zonerider" "3D editor"
    , Place "yuzu" "Yuzu" "Email"
    , Place "delta" "Delta" "Math"
    , Place "antimony" "Antimony" "Live posts"
    , Place "waterflow" "Waterflow" "Note workspace"
    , Place "products" "Products" "Every app"
    , Place "about" "About Studio" "What Radii Office is"
    , Place "docs" "Documentation" "Where to learn it all"
    , Place "source" "Source Code" "Download the site"
    , Place "code-of-conduct" "Code of Conduct" "Community rules"
    ]


main : Program String String Never
main =
    Browser.element
        { init = \from -> ( from, Cmd.none )
        , update = \_ model -> ( model, Cmd.none )
        , view = view
        , subscriptions = \_ -> Sub.none
        }


view : String -> Html Never
view from =
    Layout.page Layout.Elsewhere
        (h1 [] [ text "Page not found!" ]
            :: (if String.isEmpty from then
                    p [ class "sub" ] [ text "That page isn't here!" ]

                else
                    p [ class "sub" ] [ text "There's nothing at ", code [] [ text from ], text "!" ]
               )
            :: (case guess from of
                    Just place ->
                        p [ class "guess" ] [ text "Did you mean ", a [ href ("/" ++ place.slug) ] [ text place.name ], text "?" ]

                    Nothing ->
                        text ""
               )
            :: [ h2 [] [ text "Everything in Radii Office" ]
               , div [ class "place-grid" ] (List.map viewPlace places)
               ]
        )


viewPlace : Place -> Html Never
viewPlace place =
    a [ class "place", href ("/" ++ place.slug) ]
        [ span [ class "place-name" ] [ text place.name ]
        , span [ class "place-what" ] [ text place.what ]
        ]


{-| The page whose name is closest to the first part of the missing address, if any is close enough!
-}
guess : String -> Maybe Place
guess from =
    let
        word =
            from
                |> String.toLower
                |> String.split "/"
                |> List.filter (not << String.isEmpty)
                |> List.head
                |> Maybe.withDefault ""
                |> String.replace ".html" ""

        scored =
            List.map (\pl -> ( distance word pl.slug, pl )) places
                |> List.sortBy Tuple.first
    in
    case scored of
        ( d, pl ) :: _ ->
            if String.isEmpty word then
                Nothing

            else if d <= max 1 (String.length pl.slug // 3) then
                Just pl

            else
                Nothing

        [] ->
            Nothing


{-| Levenshtein distance: how many letters to add, remove or change to turn one word into the other!
-}
distance : String -> String -> Int
distance a b =
    let
        bs =
            String.toList b

        firstRow =
            List.range 0 (List.length bs)

        step ca prev =
            let
                go ( cb, up ) ( diag, left, out ) =
                    let
                        cost =
                            if ca == cb then
                                0

                            else
                                1

                        here =
                            min (min (up + 1) (left + 1)) (diag + cost)
                    in
                    ( up, here, here :: out )

                start =
                    Maybe.withDefault 0 (List.head prev) + 1

                ( _, _, row ) =
                    List.foldl go ( Maybe.withDefault 0 (List.head prev), start, [ start ] ) (List.map2 Tuple.pair bs (List.drop 1 prev))
            in
            List.reverse row
    in
    String.toList a
        |> List.foldl step firstRow
        |> List.reverse
        |> List.head
        |> Maybe.withDefault 0
