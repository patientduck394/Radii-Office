;; Formly, written in ClojureScript! Build a form, preview it like a visitor, and trade .kfe
;; (editable), .kfv (viewable) and .kfa (answers) files. Scittle runs this file as it is!
;; The whole form lives in one atom as plain Clojure maps, and becomes JSON only at the edges!
(ns formly.app
  (:require [clojure.string :as str]))

(def storage-key "formly_doc_v1")
(def default-theme "#9D84FF")
(def field-types ["text" "textarea" "select" "chip" "rating" "checkbox"])

(def starter-form
  {:title "My Awesome Frutiger Aero Form"
   :description "Please fill out the fields below and export your answers when finished!"
   :fields [{:id "f1" :type "text" :label "#G#Your Full Name#" :placeholder "e.g. Duck User" :value "" :options ""}
            {:id "f2" :type "select" :label "Favorite Design Aesthetic" :placeholder "" :value "Frutiger Aero" :options "Frutiger Aero, Flat Design, Neumorphism, Y2K Retro"}
            {:id "f3" :type "chip" :label "Preferred Platforms" :placeholder "" :value "Bluesky" :options "Bluesky, Mastodon, Matrix, Discord"}
            {:id "f4" :type "rating" :label "Rate this interface experience" :placeholder "" :value "5" :options "1, 2, 3, 4, 5"}
            {:id "f5" :type "textarea" :label "Why do you love glossy interfaces?" :placeholder "Write your thoughts here..." :value "" :options ""}
            {:id "f6" :type "checkbox" :label "Subscribe to Aero updates newsletter" :placeholder "" :value true :options ""}]})

;; :mode is "builder", "view" or "readonly-answers"
(defonce state (atom {:form starter-form :theme default-theme :mode "builder"}))

;; The ribbon and live collaboration hook in here instead of wrapping functions!
(defonce render-hooks (atom []))
(defonce change-hooks (atom []))

(defn $ [id] (.getElementById js/document id))
(defn form [] (:form @state))
(defn fields [] (:fields (form)))
(defn mode [] (:mode @state))
(defn builder? [] (= (mode) "builder"))
(defn from-js [o] (js->clj o :keywordize-keys true))

(defn update-field! [id f]
  (swap! state update-in [:form :fields] (fn [fs] (mapv #(if (= (:id %) id) (f %) %) fs))))

;; --- Web Audio synthesizer ---
(defn click-sound!
  ([] (click-sound! 600 0.08))
  ([frequency duration]
   (try
     (let [ctx (or (.-audioCtx js/window)
                   (let [C (or (.-AudioContext js/window) (.-webkitAudioContext js/window))]
                     (set! (.-audioCtx js/window) (C.))))
           osc (.createOscillator ctx)
           gain (.createGain ctx)
           now (.-currentTime ctx)]
       (set! (.-type osc) "sine")
       (set! (.. osc -frequency -value) frequency)
       (.setValueAtTime (.-gain gain) 0.05 now)
       (.exponentialRampToValueAtTime (.-gain gain) 0.001 (+ now duration))
       (.connect osc gain)
       (.connect gain (.-destination ctx))
       (.start osc)
       (.stop osc (+ now duration)))
     (catch :default _ nil))))

;; --- Keydown tags: the little glossy chips you can type in labels ---
(def keydown-pairs
  (concat [["=Y=" "=Y="] ["=R=" "=R="] ["=G=" "=G="] ["=C=" "=C="] ["=B=" "=B="] ["=V=" "=V="] ["=P=" "=P="] ["=O=" "=O="]
           ["=MG=" "=MG="] ["=LM=" "=LM="] ["=AQ=" "=AQ="] ["=SL=" "=SL="] ["&&" "&&"] ["`" "`"] ["**" "**"] ["*" "*"]]
          (for [t ["G" "U" "B" "S" "L" "E" "WD" "SF" "AW" "SM" "MP" "PG" "CB" "SR" "OA" "MM" "FE" "MR" "PO" "LF" "DS" "GL" "HB" "IS" "GC" "KO"
                   "XG" "WL" "PM" "WB" "GLO" "ST" "FUNC" "VAR" "STR" "RS" "HD" "AL" "DR" "MD" "WX" "TL" "SL" "BG" "FT" "MC" "WR" "H1" "H2" "H3" "BQ" "BUL" "MH"]]
            [(str "~" t "~") (str "~" t "~")])
          (for [t ["WD-Y" "WD-R" "WD-PK" "WD-PR" "WD-O" "WD-SL" "PP-C" "PP-O" "PP-R" "PP-L" "GB-B" "GB-PR" "GB-PK" "GB-Y"
                   "B-B" "B-G" "B-O" "B-R" "B-PR" "B-Y" "SH-B" "SH-G" "SH-O" "SH-PR" "PH-B" "PH-G" "PH-O" "PH-PR"
                   "PC-Y" "PC-B" "PC-G" "PC-PK" "PC-PR" "PC-O" "DR-O" "DR-Y" "DR-G" "DR-B" "DR-PR" "DR-PK" "DR-R" "DR-SL"]]
            [(str "~" t "~") "~"])
          (for [t ["!#A#" "!#G#" "!#O#" "!#R#" "!#PR#" "!#PK#" "!#Y#" "!#SL#" "#C#" "#O#" "#G#" "#R#" "#PR#" "#PK#" "#Y#" "#B#" "#L#"
                   "#T#" "#GL#" "#SL#" "#W#" "#BK#" "#FG#" "#TU#"]]
            [t "#"])))

;; Does the text hold BOTH an opening and a closing tag?
(defn keydown? [text]
  (boolean (and (seq text)
                (some (fn [[open close]]
                        (let [i (.indexOf text open)]
                          (and (>= i 0) (>= (.indexOf text close (+ i (count open))) 0))))
                      keydown-pairs))))

(defn keydown-html [text]
  (if (str/blank? text)
    ""
    (reduce (fn [html [re rep]] (str/replace html re rep))
            (-> text (str/replace "&" "&amp;") (str/replace "<" "&lt;") (str/replace ">" "&gt;"))
            [[#"#G#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-green\">$1</span>"]
             [#"#C#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-cyan\">$1</span>"]
             [#"#O#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-orange\">$1</span>"]
             [#"#R#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-red\">$1</span>"]
             [#"#PR#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-purple\">$1</span>"]
             [#"#PK#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-pink\">$1</span>"]
             [#"#Y#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-yellow\">$1</span>"]
             [#"#B#([^#]+)#" "<span class=\"gel-bubble-chip gel-chip-blue\">$1</span>"]
             [#"\*\*([^*]+)\*\*" "<strong>$1</strong>"]
             [#"\*([^*]+)\*" "<em>$1</em>"]
             [#"`([^`]+)`" "<code>$1</code>"]])))

;; --- Saving: the form survives reloads (and lives under its ?file= ID)! ---
(defn save! []
  (try (.setItem js/localStorage storage-key
                 (js/JSON.stringify (clj->js {:form (form) :theme (:theme @state) :mode (if (builder?) "builder" "view")})))
       (catch :default _ nil))
  (doseq [f @change-hooks] (f)))

;; --- Little DOM helpers ---
(defn el [tag css]
  (let [e (.createElement js/document tag)]
    (when css (set! (.. e -style -cssText) css))
    e))

(def mono "font-family: 'JetBrains Mono', monospace;")
(defn options-of [field fallback]
  (map str/trim (str/split (or (not-empty (:options field)) fallback) #",")))

(declare render!)

;; --- One field card ---
(defn builder-header [field]
  (let [id (:id field)
        row (el "div" "display: flex; justify-content: space-between; align-items: center; gap: 10px;")
        box (el "div" "position: relative; flex: 1; display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; padding: 0 0 0 10px; min-height: 34px; overflow: hidden;")
        title (el "div" (str mono "font-weight: 700; font-size: 0.95rem; outline: none; flex: 1; color: #1e293b; white-space: pre-wrap; word-break: break-all;"))
        badge (el "img" (str "height: 100%; width: 44px; display: " (if (keydown? (:label field)) "block" "none") "; margin: 0; object-fit: cover; flex-shrink: 0; filter: drop-shadow(rgba(0, 219, 255, 0.5) -2px 0px 6px);"))
        type-select (el "select" (str mono "font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px; background: #fff; outline: none; cursor: pointer; color: #334155;"))
        delete (el "button" "background: #ef4444; color: #fff; border: none; border-radius: 50%; width: 24px; height: 24px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;")
        label-now #(:label (some (fn [f] (when (= (:id f) id) f)) (fields)))]
    (set! (.-contentEditable title) true)
    (set! (.-innerHTML title) (keydown-html (:label field)))
    (set! (.-src badge) "keydown.svg")
    (set! (.-alt badge) "Keydown Active")
    (set! (.-title badge) "Valid Keydown syntax detected!")
    (set! (.-oninput title) (fn [_]
                              (let [text (.-textContent title)]
                                (update-field! id #(assoc % :label text))
                                (set! (.. badge -style -display) (if (keydown? text) "block" "none")))))
    (set! (.-onblur title) #(set! (.-innerHTML title) (keydown-html (label-now))))
    (set! (.-onfocus title) #(set! (.-textContent title) (label-now)))
    (.appendChild box title)
    (.appendChild box badge)
    (doseq [t field-types]
      (let [opt (el "option" nil)]
        (set! (.-value opt) t)
        (set! (.-textContent opt) (str/upper-case t))
        (when (= t (:type field)) (set! (.-selected opt) true))
        (.appendChild type-select opt)))
    (set! (.-onchange type-select)
          (fn [e]
            (click-sound! 500 0.05)
            (let [t (.. e -target -value)]
              (update-field! id #(cond-> (assoc % :type t) (= t "checkbox") (assoc :value false))))
            (render!)))
    (set! (.-innerHTML delete) "&times;")
    (set! (.-title delete) "Remove Field")
    (set! (.-onclick delete) (fn []
                               (click-sound! 300 0.08)
                               (swap! state update-in [:form :fields] (fn [fs] (vec (remove #(= (:id %) id) fs))))
                               (render!)))
    (doto row (.appendChild box) (.appendChild type-select) (.appendChild delete))))

(defn options-input [field]
  (let [input (el "input" (str mono "font-size: 0.8rem; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; background: rgba(0,0,0,0.02); outline: none; color: #64748b;"))]
    (set! (.-type input) "text")
    (set! (.-value input) (or (:options field) ""))
    (set! (.-placeholder input) "Options separated by comma (e.g. Option 1, Option 2)")
    (set! (.-oninput input) #(let [v (.. % -target -value)] (update-field! (:id field) (fn [f] (assoc f :options v)))))
    input))

(defn answer-input [field]
  (let [id (:id field)
        locked? (builder?)
        set-value! (fn [v] (update-field! id #(assoc % :value v)))
        box-css (str mono "width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(255,255,255,0.9); outline: none; box-sizing: border-box; color: #334155;")
        choices (fn [fallback sound redraw?]
                  (let [select (el "select" (str box-css "cursor: pointer;"))]
                    (set! (.-disabled select) locked?)
                    (doseq [o (options-of field fallback)]
                      (let [opt (el "option" nil)]
                        (set! (.-value opt) o)
                        (set! (.-textContent opt) o)
                        (when (= o (:value field)) (set! (.-selected opt) true))
                        (.appendChild select opt)))
                    (set! (.-onchange select) (fn [e] (click-sound! sound 0.05) (set-value! (.. e -target -value)) (when redraw? (render!))))
                    select))]
    (case (:type field)
      "text" (let [input (el "input" box-css)]
               (set! (.-type input) "text")
               (set! (.-value input) (str (or (:value field) "")))
               (set! (.-placeholder input) (or (not-empty (:placeholder field)) "Enter value..."))
               (set! (.-disabled input) locked?)
               (set! (.-oninput input) #(set-value! (.. % -target -value)))
               input)
      "textarea" (let [area (el "textarea" (str box-css "height: 80px; resize: vertical;"))]
                   (set! (.-value area) (str (or (:value field) "")))
                   (set! (.-placeholder area) (or (not-empty (:placeholder field)) "Enter detailed text..."))
                   (set! (.-disabled area) locked?)
                   (set! (.-oninput area) #(set-value! (.. % -target -value)))
                   area)
      "select" (choices "Option 1, Option 2" 650 false)
      "chip" (doto (el "div" "display: flex; flex-direction: column; gap: 8px;") (.appendChild (choices "Chip 1, Chip 2" 700 true)))
      "rating" (let [row (el "div" "display: flex; gap: 6px; align-items: center;")
                     current (or (js/parseInt (:value field) 10) 5)
                     current (if (js/isNaN current) 5 current)]
                 (doseq [i (range 1 6)]
                   (let [star (el "button" (str "background: transparent; border: none; font-size: 1.5rem; cursor: pointer; color: " (if (<= i current) "#f59e0b" "#cbd5e1") ";"))]
                     (set! (.-type star) "button")
                     (set! (.-innerHTML star) (if (<= i current) "★" "☆"))
                     (set! (.-disabled star) locked?)
                     (set! (.-onclick star) (fn [] (click-sound! (+ 750 (* i 30)) 0.06) (set-value! (str i)) (render!)))
                     (.appendChild row star)))
                 row)
      "checkbox" (let [label (el "label" (str "display: flex; align-items: center; gap: 10px;" mono "font-size: 0.9rem; cursor: pointer; color: #334155;"))
                       box (el "input" nil)
                       span (el "span" nil)]
                   (set! (.-type box) "checkbox")
                   (set! (.-checked box) (boolean (:value field)))
                   (set! (.-disabled box) locked?)
                   (set! (.-onchange box) (fn [e] (click-sound! 700 0.05) (set-value! (.. e -target -checked))))
                   (set! (.-textContent span) "Enable / True")
                   (doto label (.appendChild box) (.appendChild span)))
      (el "div" nil))))

(defn field-card [field]
  (let [card (el "div" "background: rgba(255, 255, 255, 0.85); border: 1px solid rgba(255, 255, 255, 0.9); border-radius: 12px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 10px; position: relative;")
        wrap (el "div" nil)]
    (set! (.-className card) "form-field-card")
    (if (builder?)
      (do (.appendChild card (builder-header field))
          (when (#{"select" "chip"} (:type field)) (.appendChild card (options-input field))))
      (let [label (el "div" (str mono "font-weight: 700; font-size: 0.95rem; color: #1e293b;"))]
        (set! (.-innerHTML label) (keydown-html (or (not-empty (:label field)) "Untitled Field")))
        (.appendChild card label)))
    (if (= (mode) "readonly-answers")
      (let [read (el "div" (str mono "width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; background: rgba(157, 132, 255, 0.1); color: #1e293b; box-sizing: border-box; font-weight: bold;"))
            v (:value field)]
        (set! (.-textContent read) (if (and (some? v) (not= v "")) (str v) "(No answer provided)"))
        (.appendChild wrap read))
      (.appendChild wrap (answer-input field)))
    (.appendChild card wrap)
    card))

;; --- Render engine ---
(defn render! []
  (let [{:keys [title description]} (form)
        theme (:theme @state)
        title-input ($ "form-title-input")
        desc-input ($ "form-desc-input")
        badge ($ "mode-badge")]
    (if (builder?)
      (do (some-> ($ "view-form-header") .-style (aset "display" "none"))
          (set! (.. title-input -style -display) "block")
          (set! (.. desc-input -style -display) "block")
          (set! (.-value title-input) title)
          (set! (.-value desc-input) description)
          (set! (.. ($ "builder-controls") -style -display) "flex")
          (set! (.. ($ "view-mode-footer") -style -display) "none")
          (set! (.-textContent badge) "BUILDER")
          (set! (.-value ($ "formula-input")) "Builder mode")
          (set! (.. ($ "btn-download-kfe") -style -display) "flex")
          (set! (.-textContent ($ "btn-download-kfv-text")) "Download Viewable"))
      (let [answers? (= (mode) "readonly-answers")
            header (or ($ "view-form-header")
                       (let [h (el "div" nil)]
                         (set! (.-id h) "view-form-header")
                         (.insertBefore (.-parentNode title-input) h title-input)
                         h))]
        (set! (.. title-input -style -display) "none")
        (set! (.. desc-input -style -display) "none")
        (set! (.-innerHTML header)
              (str "<div style=\"font-family: 'JetBrains Mono', monospace; font-size: 1.4rem; font-weight: 800; color: #1e293b; margin-bottom: 8px;\">" (keydown-html title) "</div>"
                   "<div style=\"font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; color: #475569; white-space: pre-wrap;\">" (keydown-html description) "</div>"))
        (set! (.. header -style -display) "block")
        (set! (.. ($ "builder-controls") -style -display) "none")
        (set! (.. ($ "view-mode-footer") -style -display) (if answers? "none" "flex"))
        (set! (.-textContent badge) (if answers? "VIEWING SUBMITTED ANSWERS (.kfa)" "VIEWER (.kfv)"))
        (set! (.-value ($ "formula-input")) (if answers? "Viewing submitted user response file (.kfa)." "Fill out your responses below and click Download answers at the bottom!"))
        (set! (.. ($ "btn-download-kfe") -style -display) "none")
        (set! (.-textContent ($ "btn-download-kfv-text")) "Download form")))
    (set! (.. badge -style -color) theme)
    (let [list ($ "form-fields-list")]
      (set! (.-innerHTML list) "")
      (doseq [f (fields)] (.appendChild list (field-card f)))))
  (save!)
  (doseq [f @render-hooks] (f)))

;; --- Theme ---
(defn set-theme-color! [color]
  (swap! state assoc :theme color)
  (.setProperty (.. js/document -documentElement -style) "--aero-primary" color)
  (render!))

;; --- Building ---
(defn add-field! [type]
  (click-sound! 800 0.08)
  (swap! state update-in [:form :fields] conj
         {:id (str "f_" (subs (.toString (js/Math.random) 36) 2 9))
          :type type
          :label (str "New " (str/upper-case (subs type 0 1)) (subs type 1) " Field")
          :placeholder ""
          :value (case type "checkbox" false "rating" "5" "")
          :options (if (#{"select" "chip"} type) "Option 1, Option 2, Option 3" "")})
  (render!))

(defn set-mode! [m] (swap! state assoc :mode m) (render!))

(defn reset-form! []
  (swap! state assoc :form {:title "Untitled Form" :description "Enter instructions here..." :fields []} :mode "builder")
  (render!))

;; --- Files: .kfe (editable), .kfv (viewable), .kfa (answers) ---
(defn download! [content filename content-type]
  (let [url (js/URL.createObjectURL (js/Blob. #js [content] #js {:type content-type}))
        a (.createElement js/document "a")]
    (set! (.-href a) url)
    (set! (.-download a) filename)
    (.appendChild (.-body js/document) a)
    (.click a)
    (.removeChild (.-body js/document) a)
    (js/URL.revokeObjectURL url)))

(defn file-name [suffix] (str (or (not-empty (:title (form))) "form") suffix))
(defn pretty [data] (js/JSON.stringify (clj->js data) nil 2))

(defn download-kfe! []
  (click-sound! 850 0.1)
  (download! (pretty {:format "kfe" :version "1.0" :theme (:theme @state) :form (form)}) (file-name ".kfe") "application/json"))

(defn download-kfv! []
  (click-sound! 850 0.1)
  (download! (pretty {:format "kfv" :version "1.0" :theme (:theme @state) :form (form)}) (file-name ".kfv") "application/json"))

(defn export-kfa! []
  (click-sound! 900 0.12)
  (download! (pretty {:format "kfa" :version "1.0" :formTitle (:title (form)) :submittedAt (.toISOString (js/Date.))
                      :answers (mapv #(select-keys % [:id :label :type :value :options]) (fields))})
             (file-name "_answers.kfa") "application/json"))

(defn load-file-text! [text]
  (try
    (let [doc (from-js (js/JSON.parse text))]
      (case (:format doc)
        "kfe" (do (swap! state assoc :form (:form doc) :mode "builder")
                  (when (:theme doc) (set-theme-color! (:theme doc)))
                  (js/alert "Editable Form (.kfe) loaded successfully!"))
        "kfv" (do (swap! state assoc :form (:form doc) :mode "view")
                  (when (:theme doc) (set-theme-color! (:theme doc)))
                  (js/alert "Viewable Form (.kfv) loaded successfully!"))
        "kfa" (do (swap! state assoc :mode "readonly-answers"
                         :form {:title (or (:formTitle doc) "Submitted Form Response")
                                :description (str "Submitted at: " (.toLocaleString (js/Date. (:submittedAt doc))))
                                :fields (vec (:answers doc))})
                  (js/alert "Loaded Form Answers (.kfa) successfully!"))
        (when (vector? (:fields doc)) (swap! state assoc :form doc :mode "builder")))
      (render!))
    (catch :default _ (js/alert "Error parsing file: Invalid format."))))

;; --- Wiring the page ---
(defn on! [id ev f] (some-> ($ id) (.addEventListener ev f)))

(defn wire! []
  (on! "sidebar-latch" "click" #(do (click-sound! 450 0.08) (.toggle (.-classList ($ "sidebar")) "collapsed")))
  (on! "palette-toggle-btn" "click" (fn [e] (.stopPropagation e) (click-sound! 600 0.06) (.toggle (.-classList ($ "aero-palette-menu")) "show")))
  (.addEventListener js/document "click"
                     (fn [e] (let [menu ($ "aero-palette-menu")]
                               (when (and menu (not (.contains menu (.-target e))) (not (.contains ($ "palette-toggle-btn") (.-target e))))
                                 (.remove (.-classList menu) "show")))))
  (doseq [sw (js/Array.from (.querySelectorAll js/document ".color-swatch"))]
    (.addEventListener sw "click" #(do (click-sound! 700 0.08) (set-theme-color! (.. sw -dataset -color)))))
  (on! "custom-color-picker" "input" #(set-theme-color! (.. % -target -value)))
  (on! "reset-theme-btn" "click" #(do (click-sound! 500 0.08) (set-theme-color! default-theme) (set! (.-value ($ "custom-color-picker")) default-theme)))
  (on! "form-title-input" "input" #(swap! state assoc-in [:form :title] (.. % -target -value)))
  (on! "form-desc-input" "input" #(swap! state assoc-in [:form :description] (.. % -target -value)))
  (doseq [btn (js/Array.from (.querySelectorAll js/document ".add-field-btn"))]
    (.addEventListener btn "click" #(add-field! (.. btn -dataset -type))))
  (on! "btn-create-form" "click" #(do (click-sound! 750 0.08) (set-mode! "builder")))
  (on! "btn-clear-form" "click" #(do (click-sound! 350 0.15) (when (js/confirm "Are you sure you want to reset the form workspace?") (reset-form!))))
  (on! "btn-download-kfe" "click" download-kfe!)
  (on! "btn-download-kfv" "click" download-kfv!)
  (on! "btn-export-kfa" "click" export-kfa!)
  (on! "btn-upload-file" "click" #(do (click-sound! 750 0.08) (.click ($ "hidden-file-input"))))
  (on! "hidden-file-input" "change"
       (fn [e]
         (when-let [file (aget (.. e -target -files) 0)]
           (let [reader (js/FileReader.)]
             (set! (.-onload reader) #(load-file-text! (.. % -target -result)))
             (.readAsText reader file)))
         (set! (.-value ($ "hidden-file-input")) "")))
  ;; typing anywhere in the form saves it (without redrawing under your cursor)
  (doseq [ev ["input" "change"]]
    (.addEventListener js/document ev #(when (some-> (.-target %) (.-closest) (boolean)) (when (.closest (.-target %) "#form-builder-root") (save!)))))
  (.addEventListener js/document "focusout" #(when (and (.-closest (.-target %)) (.closest (.-target %) "#form-fields-list")) (save!))))

(defn restore! []
  (try
    (let [d (from-js (js/JSON.parse (or (.getItem js/localStorage storage-key) "null")))]
      (when (vector? (get-in d [:form :fields]))
        (swap! state assoc :form (:form d))
        (when-let [t (:theme d)]
          (swap! state assoc :theme t)
          (.setProperty (.. js/document -documentElement -style) "--aero-primary" t))))
    (catch :default _ nil)))

;; old global names, for anything that still calls them
(doseq [[k f] {"setThemeColor" set-theme-color! "renderForm" render! "saveFormly" save!}]
  (aset js/window k f))

(wire!)
(restore!)
(render!)
