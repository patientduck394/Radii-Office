;; Hexa's Outlook layout, in ClojureScript! A teal ribbon (Home, Boards, Share, Help), a File screen
;; for .ICS / .KH import and export, a month navigator and a status bar, on top of Hexa's own
;; calendar and boards. Hexa Classic stays one click away! (The ribbon itself is office-shell.js!)
(ns hexa.office
  (:require [hexa.app :as app]))

(defn greet []
  (let [h (.getHours (js/Date.))]
    (cond (< h 12) "Good morning" (< h 18) "Good afternoon" :else "Good evening")))

(defn plural [n word] (str n " " word (when (not= n 1) "s")))
(defn pick-file! [id] (some-> (app/$ id) .click))
(defn board-count [] (reduce + (map #(count (:cards %)) (:columns (app/active-board)))))
(defn view-is? [v] (= (:view @app/state) v))

(defn start! [OS]
  (let [sync! #(.sync OS)
        cards (fn [items] (.bsCards OS (clj->js items)))
        new-board! #(.then (.prompt OS "New Board" "Board name:" "" "Create")
                           (fn [n] (when (and n (seq (.trim n))) (app/add-board! (.trim n)) (sync!))))
        new-column! #(.then (.prompt OS "New Column" "Column name:" "" "Add")
                            (fn [n] (when (and n (seq (.trim n))) (app/add-column! (:id (app/active-board)) (.trim n)) (sync!))))
        drop-board! (fn []
                      (let [b (app/active-board)]
                        (if (<= (count (app/boards)) 1)
                          (.toast OS "Keep at least one board!")
                          (.then (.confirm OS "Delete Board" (str "Delete \"" (:name b) "\" and its cards?") "Delete" true)
                                 (fn [ok] (when ok (app/delete-board! (:id b)) (sync!)))))))
        clear-all! #(.then (.confirm OS "Clear Calendar" "Delete every event? (Boards stay!)" "Clear" true)
                           (fn [ok] (when ok (app/clear-calendar!) (.toast OS "Calendar cleared!"))))
        jump-menu #(clj->js (map-indexed (fn [i m] {:label m :checked (= (:month @app/state) i)
                                                    :run (fn [] (swap! app/state assoc :month i) (app/render!) (sync!))})
                                         app/months))
        year-menu #(let [y (.getFullYear (js/Date.))]
                     (clj->js (for [k (range (- y 3) (+ y 6))]
                                {:label (str k) :checked (= (:year @app/state) k)
                                 :run (fn [] (swap! app/state assoc :year k) (app/render!) (sync!))})))
        set-view! (fn [v] (app/set-view-mode! v) (sync!))
        backstage [{:id "home" :label "Home" :icon "home"
                    :render (fn [b]
                              (set! (.-innerHTML b) (str "<h1>" (greet) "!</h1>"))
                              (.appendChild b (cards [{:label "New event" :hint "Add something to the calendar!" :icon "calendar" :run #(do (.closeBackstage OS) (app/open-event-modal!))}
                                                      {:label "Import .ICS" :hint "Bring in events from another calendar!" :icon "import" :run #(do (.closeBackstage OS) (pick-file! "file-ics"))}
                                                      {:label "Open a .KH file" :hint "A Hexa calendar with boards!" :icon "folder" :run #(do (.closeBackstage OS) (pick-file! "file-kh"))}]))
                              (.insertAdjacentHTML b "beforeend"
                                                   (str "<h2>This calendar</h2><div class=\"bb-bs-doc hx-bs-doc\"><img src=\"favicon-96.png\" alt=\"\"><div><b>"
                                                        (plural (count (app/events)) "event") " · " (plural (count (app/boards)) "board")
                                                        "</b><span>Saved automatically in this browser!</span></div></div>")))}
                   {:id "import" :label "Import" :icon "import"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Import</h1>")
                              (.appendChild b (cards [{:label ".ICS calendar" :hint "Events from Google, Apple, Outlook…" :icon "calendar" :run #(do (.closeBackstage OS) (pick-file! "file-ics"))}
                                                      {:label ".KH file" :hint "A full Hexa calendar with boards!" :icon "folder" :run #(do (.closeBackstage OS) (pick-file! "file-kh"))}])))}
                   {:id "export" :label "Export" :icon "export"
                    :render (fn [b]
                              (set! (.-innerHTML b) "<h1>Export</h1>")
                              (.appendChild b (cards [{:label ".ICS calendar" :hint "Works in every calendar app!" :icon "calendar" :run app/export-ics!}
                                                      {:label ".KH file" :hint "Events + boards, re-importable!" :icon "save" :run app/export-kh!}])))}
                   {:id "clear" :label "Clear Calendar" :icon "trash" :action clear-all!}]
        tabs [{:id "home" :label "Home"
               :groups [{:label "New" :items [{:big true :icon "calendar" :label "New\nEvent" :run #(app/open-event-modal!)}
                                              {:big true :icon "pages" :label "New\nCard" :title "Add a card to the first column of this board"
                                               :run #(let [b (app/active-board)] (app/open-card-modal! (:id b) (:id (first (:columns b))) nil))}]}
                        {:label "Go To" :items [{:big true :icon "clock" :label "Today" :run #(do (app/go-today!) (sync!))}
                                                {:stack [{:sm true :icon "chevLeft" :label "Previous Month" :run #(do (app/shift-month! -1) (sync!))}
                                                         {:sm true :icon "chevRight" :label "Next Month" :run #(do (app/shift-month! 1) (sync!))}
                                                         {:sm true :icon "calendar" :label "Jump to Month" :menu jump-menu}]}
                                                {:big true :icon "zoom" :label "Year" :menu year-menu}]}
                        {:label "View" :items [{:big true :icon "calendar" :label "Calendar" :run #(set-view! "calendar") :checked #(view-is? "calendar")}
                                               {:big true :icon "cards" :label "Boards" :run #(set-view! "boards") :checked #(view-is? "boards")}]}
                        {:label "Layout" :items [{:big true :icon "layout" :label "Layout"
                                                  :menu #(clj->js [{:label "Outlook" :checked true :icon "layout" :run (fn [] (.setLayout OS "office"))}
                                                                   {:label "Hexa Classic" :icon "sparkle" :run (fn [] (.setLayout OS "classic"))}])}]}]}
              {:id "boards" :label "Boards"
               :groups [{:label "Board" :items [{:big true :icon "plus" :label "New\nBoard" :run new-board!}
                                                {:big true :icon "trash" :label "Delete\nBoard" :run drop-board!}
                                                {:big true :icon "cards" :label "Switch\nBoard"
                                                 :menu #(clj->js (for [b (app/boards)]
                                                                   {:label (:name b) :checked (= (:id b) (:active-board @app/state))
                                                                    :run (fn [] (app/switch-board! (:id b)) (sync!))}))}]}
                        {:label "Columns" :items [{:big true :icon "table" :label "New\nColumn" :run new-column!}]}]}
              {:id "share" :label "Share"
               :groups [{:label "Live" :items [{:big true :icon "user" :label "Share &\nChat" :title "Plan together, live!"
                                                :run #(some-> (.-RadiiCollab js/window) (.open "people"))}]}
                        {:label "Export" :items [{:big true :icon "save" :label "Export\n.ICS" :run app/export-ics!}
                                                 {:big true :icon "download" :label "Export\n.KH" :run app/export-kh!}]}
                        {:label "Import" :items [{:big true :icon "import" :label "Import\n.ICS" :run #(pick-file! "file-ics")}
                                                 {:big true :icon "folder" :label "Import\n.KH" :run #(pick-file! "file-kh")}]}]}
              {:id "help" :label "Help"
               :groups [{:label "Tips" :items [{:big true :icon "help" :label "Quick\nTips"
                                                :run #(.dialog OS "Hexa tips" "<p class=\"os-dlg-text\">Click a day to see its agenda, or Add Event to plan something! Cards with a due date show on the calendar too. Share &amp; Chat lets everyone edit the same calendar live!</p>"
                                                               (clj->js [{:label "Got it!" :primary true :value true}]))}]}]}]]
    (.init OS (clj->js
               {:app "Hexa"
                :officeName "Outlook"
                :kind "word"
                :key "hexa"
                :icon "favicon-96.png"
                :officeHint "A teal ribbon with Home, Boards and Share tabs, a File screen and a status bar, like Outlook!"
                :classicHint "The original Hexa: teal glass sidebar and gel buttons!"
                :classicToast "Hexa Classic: teal glass and gel!"
                :theme {:accent "#14b8a6" :accent-d "#0f8f82" :accent-l "#ccfbf1" :title "#0f9b8c" :gel1 "#5eead4" :gel2 "#14b8a6"
                        :gel-border "#99f6e4" :gel-glow "rgba(20, 184, 166, 0.45)" :glow "rgba(204, 251, 241, 0.9)" :thumb-bg "#042f2e"}
                :editor (constantly nil)
                :title (constantly "My Calendar")
                :qat [{:icon "save" :title "Export .KH" :run #(do (app/export-kh!) (.flashSaved OS "Saved!"))}
                      {:icon "calendar" :title "New event" :run #(app/open-event-modal!)}
                      {:icon "clock" :title "Today" :run #(do (app/go-today!) (sync!))}]
                :tabs tabs
                :backstage backstage
                :status #(let [{:keys [year month]} @app/state]
                           (clj->js (if (view-is? "boards")
                                      [(str "<b>" (board-count) "</b> cards") (str "Board <b>" (.esc OS (:name (app/active-board))) "</b>")]
                                      [(str "<b>" (count (app/events)) "</b> events") (str "<b>" (.esc OS (str (nth app/months month) " " year)) "</b>")])))
                :views [{:icon "calendar" :title "Calendar" :run #(set-view! "calendar") :active #(view-is? "calendar")}
                        {:icon "cards" :title "Boards" :run #(set-view! "boards") :active #(view-is? "boards")}]
                :searchExtra (fn [q]
                               (clj->js (->> (app/events)
                                             (filter #(.includes (.toLowerCase (or (:title %) "")) q))
                                             (take 6)
                                             (map (fn [e] {:label (str "Event \"" (:title e) "\" (" (:date e) ")") :icon "calendar" :where "Events"
                                                           :it {:run #(app/edit-event! (:id e))}})))))}))
    ;; Hexa Classic gets a Layout button too!
    (when-let [stack (.querySelector js/document ".aero-sidebar .pad-selection-stack")]
      (let [b (.createElement js/document "button")]
        (set! (.-type b) "button")
        (set! (.-className b) "action-btn hx-classic-layout")
        (set! (.-textContent b) "🧩 Layout")
        (.addEventListener b "click"
                           (fn []
                             (let [box (.createElement js/document "div")]
                               (set! (.-innerHTML box) "<p class=\"os-dlg-text\">Pick a layout! Your calendar stays exactly the same!</p>")
                               (.appendChild box (.layoutCards OS))
                               (.dialog OS "Layout — Outlook or Hexa Classic" box (clj->js [{:label "Done" :primary true :value true}]) #js {:cls "hx-layout-dlg"})
                               (js/setTimeout (.-syncLayoutCards OS) 0))))
        (.appendChild stack b)))
    ;; Month titles, counts and view buttons follow every redraw!
    (swap! app/render-hooks conj sync!)
    (swap! app/boards-hooks conj sync!)
    (set! (.-HexaOutlook js/window) #js {})))

(when-let [OS (.-OfficeShell js/window)]
  (start! OS))
