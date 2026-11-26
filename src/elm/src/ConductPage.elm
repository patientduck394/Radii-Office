module ConductPage exposing (main)

{-| The Code of Conduct (adapted from the Contributor Covenant 1.4)! Each section folds open and shut,
and the chips at the top jump straight to one!
-}

import Browser
import Html exposing (Html, a, button, div, h1, h2, li, nav, p, section, span, text, ul)
import Html.Attributes exposing (attribute, class, href, id, type_)
import Html.Events exposing (onClick)
import Layout
import Set exposing (Set)


{-| A bit of running text: plain words, or a link!
-}
type Bit
    = T String
    | L String String


type Block
    = Para (List Bit)
    | Bullets (List String)


type alias Section =
    { slug : String
    , title : String
    , blocks : List Block
    }


type alias Model =
    { closed : Set String }


type Msg
    = Toggle String
    | Reveal String
    | OpenAll
    | CloseAll


main : Program () Model Msg
main =
    Browser.sandbox { init = { closed = Set.empty }, update = update, view = view }


update : Msg -> Model -> Model
update msg model =
    case msg of
        Toggle slug ->
            if Set.member slug model.closed then
                { model | closed = Set.remove slug model.closed }

            else
                { model | closed = Set.insert slug model.closed }

        Reveal slug ->
            { model | closed = Set.remove slug model.closed }

        OpenAll ->
            { model | closed = Set.empty }

        CloseAll ->
            { model | closed = Set.fromList (List.map .slug sections) }


view : Model -> Html Msg
view model =
    Layout.page Layout.Elsewhere
        [ h1 [ class "conduct-title" ] [ text "Code of Conduct" ]
        , nav [ class "chips", attribute "aria-label" "Sections" ]
            (List.map (\s -> a [ class "chip", href ("#" ++ s.slug), onClick (Reveal s.slug) ] [ text s.title ]) sections
                ++ [ button [ type_ "button", class "chip chip-plain", onClick OpenAll ] [ text "Open all" ]
                   , button [ type_ "button", class "chip chip-plain", onClick CloseAll ] [ text "Fold all" ]
                   ]
            )
        , div [] (List.map (viewSection model) sections)
        ]


viewSection : Model -> Section -> Html Msg
viewSection model s =
    let
        open =
            not (Set.member s.slug model.closed)
    in
    section [ class "card conduct-section", id s.slug ]
        [ h2 []
            [ button
                [ type_ "button"
                , class "fold"
                , onClick (Toggle s.slug)
                , attribute "aria-expanded"
                    (if open then
                        "true"

                     else
                        "false"
                    )
                ]
                [ span [ class "fold-arrow" ]
                    [ text
                        (if open then
                            "▾"

                         else
                            "▸"
                        )
                    ]
                , text s.title
                ]
            ]
        , if open then
            div [ class "conduct-body" ] (List.map viewBlock s.blocks)

          else
            text ""
        ]


viewBlock : Block -> Html Msg
viewBlock block =
    case block of
        Para bits ->
            p [] (List.map viewBit bits)

        Bullets items ->
            ul [] (List.map (\i -> li [] [ text i ]) items)


viewBit : Bit -> Html Msg
viewBit bit =
    case bit of
        T words ->
            text words

        L url label ->
            a [ href url ] [ text label ]



-- THE TEXT


sections : List Section
sections =
    [ Section "pledge"
        "Our Pledge"
        [ Para [ T "In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to make participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, physical characteristics, neurodiversity, invisible or visible disability, ethnicity, caste, color, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation." ]
        ]
    , Section "standards"
        "Our Standards"
        [ Para [ T "Examples of behavior that contributes to creating a positive environment include:" ]
        , Bullets
            [ "Using welcoming and inclusive language"
            , "Being respectful of differing viewpoints and experiences"
            , "Gracefully accepting constructive criticism"
            , "Focusing on what is best for the community"
            , "Showing empathy towards other community members"
            ]
        , Para [ T "Examples of unacceptable behavior by participants include:" ]
        , Bullets
            [ "The use of sexualized language or imagery and unwelcome sexual attention advances"
            , "Trolling, insulting/derogatory comments, and personal or political attacks"
            , "Public or private harassment"
            , "Publishing others' private information, such as a physical or electronic address, without explicit permission"
            , "Other conduct which could reasonably be considered inappropriate in a professional setting"
            ]
        ]
    , Section "responsibilities"
        "Our Responsibilities"
        [ Para [ T "Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior." ]
        , Para [ T "Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful." ]
        ]
    , Section "scope"
        "Scope"
        [ Para [ T "This Code of Conduct applies within all project spaces, and it also applies when an individual is representing the project or its community in public spaces. Examples of representing a project or community include using an official project e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event. Representation of a project may be further defined and clarified by project maintainers." ]
        ]
    , Section "enforcement"
        "Enforcement"
        [ Para
            [ T "Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at "
            , L "mailto:patientduck0394@gmail.com" "patientduck0394@gmail.com"
            , T ". All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident. Further details of specific enforcement policies may be posted separately."
            ]
        , Para [ T "Project maintainers who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions as determined by other members of the project's leadership." ]
        ]
    , Section "attribution"
        "Attribution"
        [ Para
            [ T "This Code of Conduct is adapted from the "
            , L "https://www.contributor-covenant.org" "Contributor Covenant"
            , T ", version 1.4, available at "
            , L "https://www.contributor-covenant.org/version/1/4/code-of-conduct.html" "https://www.contributor-covenant.org/version/1/4/code-of-conduct.html"
            ]
        , Para
            [ T "For answers to common questions about this code of conduct, see "
            , L "https://www.contributor-covenant.org/faq" "https://www.contributor-covenant.org/faq"
            ]
        ]
    ]
