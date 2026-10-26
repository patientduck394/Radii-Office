;; Formly's Forms layout, in ClojureScript! A violet ribbon (Home, Share, Help), a File screen for
;; .kfe / .kfv / .kfa files and a status bar, on top of Formly's own builder. Formly Classic stays
;; one click away! (The ribbon itself is the shared office-shell.js!)
(ns formly.office
  (:require [formly.app :as app]))

(defn greet []
  (let [h (.getHours (js/Date.))]
    (cond (< h 12) "Good morning" (< h 18) "Good afternoon" :else "Good evening")))

(def field-kinds [["text" "Short Answer" "pen"] ["textarea" "Paragraph" "page"] ["select" "Dropdown" "tag"]
                  ["chip" "Chip Choice" "bubble"] ["rating" "Star Rating" "star"] ["checkbox" "Checkbox" "check"]])
(def accents [["#9D84FF" "Formly Purple"] ["#6bc702" "Classic Aero Green"] ["#0284c7" "Ocean Blue"] ["#ec4899" "Bubblegum Pink"] ["#f59e0b" "Amber Glow"]])

(defn stats []
  (let [fs (app/fields)]
    {:n (count fs) :answered (count (filter #(let [v (:value %)] (and (some? v) (not= v "") (not= v false))) fs))}))

(defn start! [OS]
  (let [sync! #(.sync OS)
        add-field! (fn [type]
                     (when-not (app/builder?) (app/set-mode! "builder"))
                     (app/add-field! type)
                     (sync!)
                     (js/setTimeout #(some-> (app/$ "form-fields-list") .-lastElementChild (.scrollIntoView #js {:block "nearest" :behavior "smooth"})) 30))
        field-menu #(clj->js (for [[t label icon] field-kinds] {:label label :icon icon :run (fn [] (add-field! t))}))
        set-mode! (fn [m] (app/set-mode! m) (sync!))
        ask-reset! (fn [] (.then (.confirm OS "Reset Workspace" "Clear this form and start over?" "Reset" true)
                             (fn [ok] (when ok (app/reset-form!) (.toast OS "A fresh form!")))))
        cards (fn [items] (.bsCards OS (clj->js items)))
        backstage [{:id "home" :label "Home" :icon "home"
                    :render (fn [b]
                              (set! (.-innerHTML b) (str "<h1>" (greet) "!</h1>"))
                              (.appendChild b (cards [{:label "New form" :hint "Start with a blank builder!" :icon "newDoc" :run #(do (.closeBackstage OS) (ask-reset!))}
                                                      {:label "Open a form" :hint "A .kfe, .kfv or .kfa file!" :icon "folder" :run #(do (.closeBackstage OS) (.click (app/$ "btn-upload-file")))}
                                                      {:label "Download editable" :hint "A .kfe others can edit!" :icon "save" :run app/download-kfe!}]))
                              (let [{:keys [n]} (stats)]
                                (.insertAdjacentHTML b "beforeend"
                                                     (str "<h2>This form</h2><div class=\"bb-bs-doc fm-bs-doc\"><img src=\"favicon.svg\" alt=\"\"><div><b>" (.esc OS (or (not-empty (:title (app/form))) "Untitled Form"))
                                                          "</b><span>" n " field" (when (not= n 1) "s") " · saved automatically in this browser!</span></div></div>"))))}
                   {:id "open" :label "Open" :icon "folder"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Open</h1>")
                              (.appendChild b (cards [{:label "Browse…" :hint ".kfe (editable), .kfv (viewable) or .kfa (answers)!" :icon "folder" :run #(do (.closeBackstage OS) (.click (app/$ "btn-upload-file")))}])))}
                   {:id "export" :label "Export" :icon "export"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Export</h1>")
                              (.appendChild b (cards [{:label "Editable (.kfe)" :hint "The full form, still editable!" :icon "save" :run app/download-kfe!}
                                                      {:label "Viewable (.kfv)" :hint "Fill-in only, to send to people!" :icon "download" :run app/download-kfv!}
                                                      {:label "Answers (.kfa)" :hint "The answers filled in so far!" :icon "check" :run app/export-kfa!}])))}
                   {:id "info" :label "Info" :icon "info"
                    :render (fn [b] (let [{:keys [n answered]} (stats)]
                                      (set! (.-innerHTML b) (str "<h1>Info</h1><table class=\"bb-wc\"><tr><td>Fields</td><td><b>" n "</b></td></tr><tr><td>Answered</td><td><b>" answered
                                                                 "</b></td></tr><tr><td>Mode</td><td><b>" (.esc OS (app/mode)) "</b></td></tr></table>"))))}]
        tabs [{:id "home" :label "Home"
               :groups [{:label "Form" :items [{:big true :icon "newDoc" :label "New\nForm" :run ask-reset!}
                                               {:big true :icon "plus" :label "Add\nField" :title "Short answer, paragraph, dropdown, chips, rating, checkbox!"
                                                :run #(add-field! "text") :menu field-menu}]}
                        {:label "Fields" :items [{:rows [[{:sm true :icon "pen" :label "Short" :run #(add-field! "text")}
                                                          {:sm true :icon "page" :label "Paragraph" :run #(add-field! "textarea")}
                                                          {:sm true :icon "tag" :label "Dropdown" :run #(add-field! "select")}]
                                                         [{:sm true :icon "bubble" :label "Chips" :run #(add-field! "chip")}
                                                          {:sm true :icon "star" :label "Rating" :run #(add-field! "rating")}
                                                          {:sm true :icon "check" :label "Checkbox" :run #(add-field! "checkbox")}]]}]}
                        {:label "Mode" :items [{:big true :icon "pen" :label "Builder" :run #(set-mode! "builder") :checked app/builder?}
                                               {:big true :icon "eye" :label "Preview" :title "Fill the form out like a visitor!" :run #(set-mode! "view") :checked #(= (app/mode) "view")}]}
                        {:label "Theme" :items [{:custom (fn [c]
                                                           (set! (.-className c) (str (.-className c) " fm-accents"))
                                                           (doseq [[color name] accents]
                                                             (let [b (.createElement js/document "button")]
                                                               (set! (.-type b) "button")
                                                               (set! (.-title b) name)
                                                               (set! (.. b -style -background) color)
                                                               (.addEventListener b "click" #(app/set-theme-color! color))
                                                               (.appendChild c b)))
                                                           (let [pick (.createElement js/document "label")]
                                                             (set! (.-className pick) "fm-custom")
                                                             (set! (.-title pick) "Custom color")
                                                             (set! (.-innerHTML pick) "+<input type=\"color\" value=\"#9D84FF\">")
                                                             (.addEventListener (.querySelector pick "input") "input" #(app/set-theme-color! (.. % -target -value)))
                                                             (.appendChild c pick)))}
                                                {:big true :icon "reset" :label "Reset\nTheme" :run #(app/set-theme-color! app/default-theme)}]}
                        {:label "Layout" :items [{:big true :icon "layout" :label "Layout"
                                                  :menu #(clj->js [{:label "Forms" :checked true :icon "layout" :run (fn [] (.setLayout OS "office"))}
                                                                   {:label "Formly Classic" :icon "sparkle" :run (fn [] (.setLayout OS "classic"))}])}]}]}
              {:id "share" :label "Share"
               :groups [{:label "Live" :items [{:big true :icon "user" :label "Share &\nChat" :title "Build the form together, live!"
                                                :run #(some-> (.-RadiiCollab js/window) (.open "people"))}]}
                        {:label "Send" :items [{:big true :icon "save" :label "Editable\n.kfe" :run app/download-kfe!}
                                               {:big true :icon "download" :label "Viewable\n.kfv" :run app/download-kfv!}
                                               {:big true :icon "check" :label "Answers\n.kfa" :run app/export-kfa!}]}
                        {:label "Open" :items [{:big true :icon "folder" :label "Open\nFile" :run #(.click (app/$ "btn-upload-file"))}]}]}
              {:id "help" :label "Help"
               :groups [{:label "Tips" :items [{:big true :icon "help" :label "Quick\nTips"
                                                :run #(.dialog OS "Formly tips" "<p class=\"os-dlg-text\">Add fields, type their questions, and use Keydown like <code>#G#Your Name#</code> for glossy labels! Preview shows what a visitor sees. Share &amp; Chat lets everyone build the form together, and each form has its own ID in the link (<code>?file=…</code>)!</p>"
                                                               (clj->js [{:label "Got it!" :primary true :value true}]))}]}]}]]
    (.init OS (clj->js
               {:app "Formly"
                :officeName "Forms"
                :kind "word"
                :key "formly"
                :icon "favicon.svg"
                :officeHint "A violet ribbon with fields, preview and theme colors, a File screen and a status bar, like Forms!"
                :classicHint "The original Formly: violet glass sidebar and gel buttons!"
                :classicToast "Formly Classic: violet glass and gel!"
                :theme {:accent "#8b5cf6" :accent-d "#6d3fe0" :accent-l "#ede9fe" :title "#7c4ff0" :gel1 "#c4b5fd" :gel2 "#8b5cf6"
                        :gel-border "#ddd6fe" :gel-glow "rgba(139, 92, 246, 0.45)" :glow "rgba(237, 233, 254, 0.9)" :thumb-bg "#2e1065"}
                :editor (constantly nil)
                :title #(or (not-empty (:title (app/form))) "Untitled Form")
                :rename (fn [n]
                          (swap! app/state assoc-in [:form :title] n)
                          (some-> (app/$ "form-title-input") (aset "value" n))
                          (app/save!))
                :qat [{:icon "save" :title "Download editable (.kfe)" :run #(do (app/download-kfe!) (.flashSaved OS "Saved!"))}
                      {:icon "plus" :title "Add a field" :run #(add-field! "text")}
                      {:icon "eye" :title "Preview / Builder" :run #(set-mode! (if (app/builder?) "view" "builder"))}]
                :tabs tabs
                :backstage backstage
                :status #(let [{:keys [n answered]} (stats)]
                           (clj->js [(str n " field" (when (not= n 1) "s"))
                                     (str "<b>" (.esc OS (cond (app/builder?) "Builder" (= (app/mode) "view") "Preview" :else "Answers")) "</b>")
                                     (str answered " answered")]))
                :views [{:icon "pen" :title "Builder" :run #(set-mode! "builder") :active app/builder?}
                        {:icon "eye" :title "Preview" :run #(set-mode! "view") :active #(= (app/mode) "view")}]
                :onLayout sync!}))
    ;; Formly Classic gets a Layout button too!
    (when-let [stack (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
      (let [b (.createElement js/document "button")]
        (set! (.-type b) "button")
        (set! (.-className b) "pad-toggle-btn fm-classic-layout")
        (set! (.-textContent b) "🧩 Layout")
        (.addEventListener b "click"
                           (fn []
                             (let [box (.createElement js/document "div")]
                               (set! (.-innerHTML box) "<p class=\"os-dlg-text\">Pick a layout! Your form stays exactly the same!</p>")
                               (.appendChild box (.layoutCards OS))
                               (.dialog OS "Layout — Forms or Formly Classic" box (clj->js [{:label "Done" :primary true :value true}]) #js {:cls "fm-layout-dlg"})
                               (js/setTimeout (.-syncLayoutCards OS) 0))))
        (.appendChild stack b)))
    (swap! app/render-hooks conj sync!)))

(when-let [OS (.-OfficeShell js/window)]
  (start! OS))
