module Layout exposing (Nav(..), page)

{-| The top bar and footer every Elm page shares, matching the rest of the Radii Office site!
-}

import Html exposing (Html, a, br, div, footer, header, img, main_, nav, span, text)
import Html.Attributes exposing (alt, class, height, href, rel, src, target, title, width)


type Nav
    = Home
    | Products
    | Source
    | Elsewhere


page : Nav -> List (Html msg) -> Html msg
page active content =
    div [ class "elm-page" ]
        [ topBar active
        , main_ [ class "elm-main" ] content
        , siteFooter
        ]


topBar : Nav -> Html msg
topBar active =
    let
        link here url label =
            a
                [ href url
                , class
                    (if here == active then
                        "active"

                     else
                        ""
                    )
                ]
                [ text label ]
    in
    header [ class "top-navbar" ]
        [ a [ href "/", class "brand-logo" ]
            [ img [ src "/logo.png", width 120, height 45, alt "Radii" ] []
            , span [] [ text " Office" ]
            ]
        , nav [ class "nav-links" ]
            [ link Home "/" "Home"
            , link Products "/products" "Products"
            , link Source "/source" "Source Code"
            , a [ href "mailto:patientduck0394@gmail.com" ] [ text "Contact" ]
            ]
        ]


siteFooter : Html msg
siteFooter =
    let
        out url label =
            a [ href url, target "_blank", rel "noopener noreferrer" ] [ text label ]
    in
    footer [ class "site-footer" ]
        [ span [] [ text "Licensed under " ]
        , out "https://creativecommons.org/publicdomain/zero/1.0/" "CC0"
        , span [] [ text " and the " ]
        , out "https://opensource.org/licenses/MIT" "MIT"
        , span [] [ text "/" ]
        , out "https://unlicense.org/" "Unlicense"
        , a [ href "/feed.xml", class "footer-rss-link", title "RSS Feed", target "_blank" ]
            [ img [ src "/feed-icon.png", alt "RSS Feed" ] [] ]
        , br [] []
        , a [ href "/code-of-conduct" ] [ text "Code of Conduct" ]
        , span [] [ text " · " ]
        , a [ href "/source" ] [ text "Source Code" ]
        , span [] [ text " · " ]
        , out "https://github.com/patientduck394/Radii-Office" "GitHub"
        , div [ class "elm-made" ] [ text "This page is written in Elm!" ]
        ]
